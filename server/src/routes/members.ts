import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool';
import { requireAuth } from '../middleware/auth';
import { authorize } from '../services/permissions';
import { parseId, sendValidationError } from '../utils/validation';

export const membersRouter = Router();
membersRouter.use(requireAuth);

const roleSchema = z.enum(['editor', 'viewer'], {
  message: 'Papel inválido (use editor ou viewer)',
});

const addMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email('E-mail inválido'),
  role: roleSchema,
});

const changeRoleSchema = z.object({
  role: roleSchema,
});

// Lista os membros do quadro (qualquer membro pode ver)
membersRouter.get('/:boardId/members', async (req, res) => {
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

  const result = await pool.query(
    `SELECT u.id, u.name, u.email, bm.role
       FROM board_members bm
       JOIN users u ON u.id = bm.user_id
      WHERE bm.board_id = $1
      ORDER BY CASE bm.role WHEN 'owner' THEN 1 WHEN 'editor' THEN 2 ELSE 3 END, u.name`,
    [boardId],
  );
  res.json({ members: result.rows });
});

// Adiciona um membro por e-mail (somente owner)
membersRouter.post('/:boardId/members', async (req, res) => {
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

  const parsed = addMemberSchema.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, parsed.error);
    return;
  }

  const userResult = await pool.query<{ id: string; name: string; email: string }>(
    'SELECT id, name, email FROM users WHERE email = $1',
    [parsed.data.email],
  );
  const user = userResult.rows[0];
  if (!user) {
    res.status(404).json({ error: 'Nenhum usuário cadastrado com esse e-mail' });
    return;
  }

  try {
    await pool.query(
      'INSERT INTO board_members (board_id, user_id, role) VALUES ($1, $2, $3)',
      [boardId, user.id, parsed.data.role],
    );
  } catch (error) {
    // 23505 = chave duplicada (a pessoa já está no quadro)
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
      res.status(409).json({ error: 'Essa pessoa já participa do quadro' });
      return;
    }
    throw error;
  }

  res.status(201).json({
    member: { id: user.id, name: user.name, email: user.email, role: parsed.data.role },
  });
});

// Altera o papel de um membro (somente owner)
membersRouter.patch('/:boardId/members/:userId', async (req, res) => {
  const boardId = parseId(req.params.boardId);
  const targetUserId = parseId(req.params.userId);
  if (!boardId || !targetUserId) {
    res.status(400).json({ error: 'ID inválido' });
    return;
  }

  const access = await authorize(boardId, res.locals.userId, 'owner');
  if (!access.ok) {
    res.status(access.status).json({ error: access.error });
    return;
  }

  const parsed = changeRoleSchema.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, parsed.error);
    return;
  }

  const target = await pool.query<{ role: string }>(
    'SELECT role FROM board_members WHERE board_id = $1 AND user_id = $2',
    [boardId, targetUserId],
  );
  if (!target.rows[0]) {
    res.status(404).json({ error: 'Membro não encontrado' });
    return;
  }
  if (target.rows[0].role === 'owner') {
    res.status(400).json({ error: 'O papel do dono do quadro não pode ser alterado' });
    return;
  }

  await pool.query(
    'UPDATE board_members SET role = $1 WHERE board_id = $2 AND user_id = $3',
    [parsed.data.role, boardId, targetUserId],
  );
  res.json({ member: { id: targetUserId, role: parsed.data.role } });
});

// Remove um membro (owner remove qualquer um; cada membro pode sair sozinho)
membersRouter.delete('/:boardId/members/:userId', async (req, res) => {
  const boardId = parseId(req.params.boardId);
  const targetUserId = parseId(req.params.userId);
  if (!boardId || !targetUserId) {
    res.status(400).json({ error: 'ID inválido' });
    return;
  }

  const currentUserId: string = res.locals.userId;
  const access = await authorize(boardId, currentUserId, 'viewer');
  if (!access.ok) {
    res.status(access.status).json({ error: access.error });
    return;
  }

  const isSelf = targetUserId === currentUserId;
  if (!isSelf && access.role !== 'owner') {
    res.status(403).json({ error: 'Você não tem permissão para esta ação' });
    return;
  }

  const target = await pool.query<{ role: string }>(
    'SELECT role FROM board_members WHERE board_id = $1 AND user_id = $2',
    [boardId, targetUserId],
  );
  if (!target.rows[0]) {
    res.status(404).json({ error: 'Membro não encontrado' });
    return;
  }
  if (target.rows[0].role === 'owner') {
    res.status(400).json({ error: 'O dono não pode ser removido do quadro' });
    return;
  }

  await pool.query('DELETE FROM board_members WHERE board_id = $1 AND user_id = $2', [
    boardId,
    targetUserId,
  ]);
  res.status(204).send();
});