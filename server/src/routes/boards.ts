import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool';
import { requireAuth } from '../middleware/auth';
import { authorize } from '../services/permissions';
import { parseId, sendValidationError } from '../utils/validation';

export const boardsRouter = Router();
boardsRouter.use(requireAuth);

const titleSchema = z.object({
  title: z.string().trim().min(1, 'Informe o título').max(150, 'Título muito longo'),
});

// Lista os quadros dos quais o usuário participa
boardsRouter.get('/', async (_req, res) => {
  const result = await pool.query(
    `SELECT b.id, b.title, b.created_at, bm.role
       FROM boards b
       JOIN board_members bm ON bm.board_id = b.id
      WHERE bm.user_id = $1
      ORDER BY b.created_at DESC`,
    [res.locals.userId],
  );
  res.json({ boards: result.rows });
});

// Cria um quadro (o criador vira owner) com 3 listas iniciais
boardsRouter.post('/', async (req, res) => {
  const parsed = titleSchema.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, parsed.error);
    return;
  }

  const userId: string = res.locals.userId;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const boardResult = await client.query<{ id: string; title: string; created_at: Date }>(
      'INSERT INTO boards (title, owner_id) VALUES ($1, $2) RETURNING id, title, created_at',
      [parsed.data.title, userId],
    );
    const board = boardResult.rows[0];

    await client.query(
      'INSERT INTO board_members (board_id, user_id, role) VALUES ($1, $2, $3)',
      [board.id, userId, 'owner'],
    );
    await client.query(
      `INSERT INTO lists (board_id, title, position)
       VALUES ($1, 'To Do', 1000), ($1, 'Doing', 2000), ($1, 'Done', 3000)`,
      [board.id],
    );
    await client.query('COMMIT');

    res.status(201).json({ board: { ...board, role: 'owner' } });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

// Devolve o quadro com listas e cards já organizados
boardsRouter.get('/:boardId', async (req, res) => {
  const boardId = parseId(req.params.boardId);
  if (!boardId) {
    res.status(400).json({ error: 'ID de quadro inválido' });
    return;
  }

  const access = await authorize(boardId, res.locals.userId, 'viewer');
  if (!access.ok) {
    res.status(access.status).json({ error: access.error });
    return;
  }

  const boardResult = await pool.query(
    'SELECT id, title, owner_id, created_at FROM boards WHERE id = $1',
    [boardId],
  );
  const listsResult = await pool.query(
    'SELECT id, title, position FROM lists WHERE board_id = $1 ORDER BY position',
    [boardId],
  );
  const cardsResult = await pool.query(
    `SELECT c.id, c.list_id, c.title, c.description, c.due_date, c.position
       FROM cards c
       JOIN lists l ON l.id = c.list_id
      WHERE l.board_id = $1
      ORDER BY c.position`,
    [boardId],
  );

  const lists = listsResult.rows.map((list) => ({
    ...list,
    cards: cardsResult.rows.filter((card) => card.list_id === list.id),
  }));

  res.json({ board: { ...boardResult.rows[0], role: access.role, lists } });
});

// Renomeia o quadro (somente owner)
boardsRouter.patch('/:boardId', async (req, res) => {
  const boardId = parseId(req.params.boardId);
  if (!boardId) {
    res.status(400).json({ error: 'ID de quadro inválido' });
    return;
  }

  const access = await authorize(boardId, res.locals.userId, 'owner');
  if (!access.ok) {
    res.status(access.status).json({ error: access.error });
    return;
  }

  const parsed = titleSchema.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, parsed.error);
    return;
  }

  const result = await pool.query(
    'UPDATE boards SET title = $1 WHERE id = $2 RETURNING id, title',
    [parsed.data.title, boardId],
  );
  res.json({ board: result.rows[0] });
});

// Exclui o quadro (somente owner); listas e cards saem junto (CASCADE)
boardsRouter.delete('/:boardId', async (req, res) => {
  const boardId = parseId(req.params.boardId);
  if (!boardId) {
    res.status(400).json({ error: 'ID de quadro inválido' });
    return;
  }

  const access = await authorize(boardId, res.locals.userId, 'owner');
  if (!access.ok) {
    res.status(access.status).json({ error: access.error });
    return;
  }

  await pool.query('DELETE FROM boards WHERE id = $1', [boardId]);
  res.status(204).send();
});

// Cria uma lista no fim do quadro (editor ou owner)
boardsRouter.post('/:boardId/lists', async (req, res) => {
  const boardId = parseId(req.params.boardId);
  if (!boardId) {
    res.status(400).json({ error: 'ID de quadro inválido' });
    return;
  }

  const access = await authorize(boardId, res.locals.userId, 'editor');
  if (!access.ok) {
    res.status(access.status).json({ error: access.error });
    return;
  }

  const parsed = titleSchema.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, parsed.error);
    return;
  }

  const result = await pool.query(
    `INSERT INTO lists (board_id, title, position)
     VALUES ($1, $2, COALESCE((SELECT MAX(position) FROM lists WHERE board_id = $1), 0) + 1000)
     RETURNING id, board_id, title, position`,
    [boardId, parsed.data.title],
  );
  res.status(201).json({ list: result.rows[0] });
});