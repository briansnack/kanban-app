import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';

const app = express();
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

app.get('/health', async (_req, res) => {
  try {
    const result = await pool.query('SELECT NOW() AS now');
    res.json({ status: 'ok', dbTime: result.rows[0].now });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'erro', message: 'Falha ao conectar no banco' });
  }
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => console.log(`API rodando em http://localhost:${port}`));