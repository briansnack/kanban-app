import type { Response } from 'express';
import { z } from 'zod';

const uuidSchema = z.string().uuid();

export function parseId(value: unknown): string | null {
  const result = uuidSchema.safeParse(value);
  return result.success ? result.data : null;
}

export function sendValidationError(res: Response, error: z.ZodError): void {
  res.status(400).json({
    error: 'Dados inválidos',
    details: error.issues.map((issue) => issue.message),
  });
}