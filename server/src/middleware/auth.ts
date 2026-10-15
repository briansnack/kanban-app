import type { NextFunction, Request, Response } from 'express';
import { verify } from 'jsonwebtoken';
import { config } from '../config';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token não informado' });
    return;
  }

  try {
    const payload = verify(header.slice('Bearer '.length), config.jwtSecret);
    if (typeof payload === 'string' || typeof payload.sub !== 'string') {
      res.status(401).json({ error: 'Token inválido' });
      return;
    }
    res.locals.userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}