import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool';
import { requireAuth } from '../middleware/auth';
import { authorize, boardIdOfList } from '../services/permissions';
import { parseId, sendValidationError } from '../utils/validation';

export const listsRouter = Router();
listsRouter.use(requireAuth);

const updateListSchema = z
  .object({
    title: z.string().trim().min(1, 'Informe o título').max(150, 'Título muito longo').optional(),
    position: z.number().optional(),
  })
  .refine((data) => data.title !== undefined || data.position !== undefined, {
    message: 'Informe o título ou a posição',
  });

const createCardSchema = z.object({
  title: z.string().trim().min(1, 'Informe o título').max(200, 'Título muito longo'),
  description: z.string().max(5000, 'Descrição muito longa').optional(),
});

// Edita título e/ou posição da lista
listsRouter.patch('/:listId', async (req, res) => {
  const listId = parseId(req.params.listId);
  if (!listId) {
    res.status(400).json({ error: 'ID de lista inválido' });
    return;
  }

  const boardId = await boardIdOfList(listId);
  if (!boardId) {
    res.status(404).json({ error: 'Não encontrado' });
    return;
  }

  const access = await authorize(boardId, res.locals.userId, 'editor');
  if (!access.ok) {
    res.status(access.status).json({ error: access.error });
    return;
  }

  const parsed = updateListSchema.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, parsed.error);
    return;
  }

  const result = await pool.query(
    `UPDATE lists
        SET title = COALESCE($1, title),
            position = COALESCE($2, position)
      WHERE id = $3
      RETURNING id, board_id, title, position`,
    [parsed.data.title ?? null, parsed.data.position ?? null, listId],
  );
  res.json({ list: result.rows[0] });
});

// Exclui a lista (e seus cards)
listsRouter.delete('/:listId', async (req, res) => {
  const listId = parseId(req.params.listId);
  if (!listId) {
    res.status(400).json({ error: 'ID de lista inválido' });
    return;
  }

  const boardId = await boardIdOfList(listId);
  if (!boardId) {
    res.status(404).json({ error: 'Não encontrado' });
    return;
  }

  const access = await authorize(boardId, res.locals.userId, 'editor');
  if (!access.ok) {
    res.status(access.status).json({ error: access.error });
    return;
  }

  await pool.query('DELETE FROM lists WHERE id = $1', [listId]);
  res.status(204).send();
});

// Cria um card no fim da lista
listsRouter.post('/:listId/cards', async (req, res) => {
  const listId = parseId(req.params.listId);
  if (!listId) {
    res.status(400).json({ error: 'ID de lista inválido' });
    return;
  }

  const boardId = await boardIdOfList(listId);
  if (!boardId) {
    res.status(404).json({ error: 'Não encontrado' });
    return;
  }

  const access = await authorize(boardId, res.locals.userId, 'editor');
  if (!access.ok) {
    res.status(access.status).json({ error: access.error });
    return;
  }

  const parsed = createCardSchema.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, parsed.error);
    return;
  }

  const result = await pool.query(
    `INSERT INTO cards (list_id, title, description, position)
     VALUES ($1, $2, $3, COALESCE((SELECT MAX(position) FROM cards WHERE list_id = $1), 0) + 1000)
     RETURNING id, list_id, title, description, due_date, position`,
    [listId, parsed.data.title, parsed.data.description ?? null],
  );
  res.status(201).json({ card: result.rows[0] });
});