import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool';
import { requireAuth } from '../middleware/auth';
import { authorize, boardIdOfCard, boardIdOfList } from '../services/permissions';
import { parseId, sendValidationError } from '../utils/validation';

export const cardsRouter = Router();
cardsRouter.use(requireAuth);

const updateCardSchema = z
  .object({
    title: z.string().trim().min(1, 'Informe o título').max(200, 'Título muito longo').optional(),
    description: z.string().max(5000, 'Descrição muito longa').nullable().optional(),
    dueDate: z.string().datetime({ offset: true }).nullable().optional(),
    listId: z.string().uuid().optional(),
    position: z.number().optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'Informe ao menos um campo para atualizar',
  })
  .refine((data) => data.listId === undefined || data.position !== undefined, {
    message: 'Ao mover o card para outra lista, informe também a posição',
  });

// Edita o card e/ou move para outra lista (listId + position)
cardsRouter.patch('/:cardId', async (req, res) => {
  const cardId = parseId(req.params.cardId);
  if (!cardId) {
    res.status(400).json({ error: 'ID de card inválido' });
    return;
  }

  const boardId = await boardIdOfCard(cardId);
  if (!boardId) {
    res.status(404).json({ error: 'Não encontrado' });
    return;
  }

  const access = await authorize(boardId, res.locals.userId, 'editor');
  if (!access.ok) {
    res.status(access.status).json({ error: access.error });
    return;
  }

  const parsed = updateCardSchema.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, parsed.error);
    return;
  }
  const data = parsed.data;

  // A lista de destino precisa ser do mesmo quadro
  if (data.listId !== undefined) {
    const targetBoardId = await boardIdOfList(data.listId);
    if (targetBoardId !== boardId) {
      res.status(400).json({ error: 'Lista de destino inválida' });
      return;
    }
  }

  const fields: string[] = [];
  const values: unknown[] = [];
  const setField = (column: string, value: unknown) => {
    values.push(value);
    fields.push(`${column} = $${values.length}`);
  };

  if (data.title !== undefined) setField('title', data.title);
  if (data.description !== undefined) setField('description', data.description);
  if (data.dueDate !== undefined) setField('due_date', data.dueDate);
  if (data.listId !== undefined) setField('list_id', data.listId);
  if (data.position !== undefined) setField('position', data.position);

  values.push(cardId);
  const result = await pool.query(
    `UPDATE cards
        SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${values.length}
      RETURNING id, list_id, title, description, due_date, position`,
    values,
  );
  res.json({ card: result.rows[0] });
});

// Exclui o card
cardsRouter.delete('/:cardId', async (req, res) => {
  const cardId = parseId(req.params.cardId);
  if (!cardId) {
    res.status(400).json({ error: 'ID de card inválido' });
    return;
  }

  const boardId = await boardIdOfCard(cardId);
  if (!boardId) {
    res.status(404).json({ error: 'Não encontrado' });
    return;
  }

  const access = await authorize(boardId, res.locals.userId, 'editor');
  if (!access.ok) {
    res.status(access.status).json({ error: access.error });
    return;
  }

  await pool.query('DELETE FROM cards WHERE id = $1', [cardId]);
  res.status(204).send();
});