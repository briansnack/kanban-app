import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import { config } from './config';
import { pool } from './db/pool';
import { authRouter } from './routes/auth';
import { boardsRouter } from './routes/boards';
import { listsRouter } from './routes/lists';
import { cardsRouter } from './routes/cards';

const app = express();
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());
app.use('/boards', boardsRouter);
app.use('/lists', listsRouter);
app.use('/cards', cardsRouter);

app.get('/health', async (_req, res) => {
  try {
    const result = await pool.query('SELECT NOW() AS now');
    res.json({ status: 'ok', dbTime: result.rows[0].now });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'erro', message: 'Falha ao conectar no banco' });
  }
});

app.use('/auth', authRouter);

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(error);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

app.listen(config.port, () => console.log(`API rodando em http://localhost:${config.port}`));
