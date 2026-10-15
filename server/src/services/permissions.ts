import { pool } from '../db/pool';

export type Role = 'owner' | 'editor' | 'viewer';

const LEVEL: Record<Role, number> = { viewer: 1, editor: 2, owner: 3 };

export type Access =
  | { ok: true; role: Role }
  | { ok: false; status: 403 | 404; error: string };

export async function authorize(boardId: string, userId: string, minimum: Role): Promise<Access> {
  const result = await pool.query<{ role: Role }>(
    'SELECT role FROM board_members WHERE board_id = $1 AND user_id = $2',
    [boardId, userId],
  );
  const role = result.rows[0]?.role;

  if (!role) return { ok: false, status: 404, error: 'Não encontrado' };
  if (LEVEL[role] < LEVEL[minimum]) {
    return { ok: false, status: 403, error: 'Você não tem permissão para esta ação' };
  }
  return { ok: true, role };
}

export async function boardIdOfList(listId: string): Promise<string | null> {
  const result = await pool.query<{ board_id: string }>(
    'SELECT board_id FROM lists WHERE id = $1',
    [listId],
  );
  return result.rows[0]?.board_id ?? null;
}

export async function boardIdOfCard(cardId: string): Promise<string | null> {
  const result = await pool.query<{ board_id: string }>(
    'SELECT l.board_id FROM cards c JOIN lists l ON l.id = c.list_id WHERE c.id = $1',
    [cardId],
  );
  return result.rows[0]?.board_id ?? null;
}