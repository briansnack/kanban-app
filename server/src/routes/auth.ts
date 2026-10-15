import { Router } from 'express';
import { sign } from 'jsonwebtoken';
import { z } from 'zod';
import { config } from '../config';
import { pool } from '../db/pool';
import { hashPassword, verifyPassword } from '../auth/password';
import { requireAuth } from '../middleware/auth';

export const authRouter = Router();

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Nome muito curto').max(100, 'Nome muito longo'),
  email: z.string().trim().toLowerCase().email('E-mail inválido'),
  password: z
    .string()
    .min(8, 'A senha deve ter pelo menos 8 caracteres')
    .max(128, 'Senha muito longa'),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('E-mail inválido'),
  password: z.string().min(1, 'Informe a senha'),
});

function createToken(userId: string): string {
  return sign({}, config.jwtSecret, { subject: userId, expiresIn: '7d' });
}

authRouter.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Dados inválidos',
      details: parsed.error.issues.map((issue) => issue.message),
    });
    return;
  }

  const { name, email, password } = parsed.data;

  try {
    const passwordHash = await hashPassword(password);
    const result = await pool.query<{ id: string; name: string; email: string }>(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name, email, passwordHash],
    );
    const user = result.rows[0];
    res.status(201).json({ user, token: createToken(user.id) });
  } catch (error) {
    // 23505 = violação de unicidade no Postgres (e-mail já existe)
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
      res.status(409).json({ error: 'E-mail já cadastrado' });
      return;
    }
    throw error;
  }
});

authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Dados inválidos',
      details: parsed.error.issues.map((issue) => issue.message),
    });
    return;
  }

  const { email, password } = parsed.data;
  const result = await pool.query<{
    id: string;
    name: string;
    email: string;
    password_hash: string;
  }>('SELECT id, name, email, password_hash FROM users WHERE email = $1', [email]);

  const user = result.rows[0];
  const valid = user ? await verifyPassword(password, user.password_hash) : false;
  if (!user || !valid) {
    res.status(401).json({ error: 'E-mail ou senha incorretos' });
    return;
  }

  res.json({
    user: { id: user.id, name: user.name, email: user.email },
    token: createToken(user.id),
  });
});

authRouter.get('/me', requireAuth, async (_req, res) => {
  const result = await pool.query(
    'SELECT id, name, email, created_at FROM users WHERE id = $1',
    [res.locals.userId],
  );
  const user = result.rows[0];
  if (!user) {
    res.status(404).json({ error: 'Usuário não encontrado' });
    return;
  }
  res.json({ user });
});