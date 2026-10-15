import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pool } from './pool';

async function migrate() {
  const sql = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(sql);
  console.log('Tabelas criadas/atualizadas com sucesso.');
  await pool.end();
}

migrate().catch((error) => {
  console.error('Falha na migração:', error);
  process.exit(1);
});