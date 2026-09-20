import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';

const { Pool } = pg;

// pg devolve BIGINT (int8) como string por padrão pra não perder precisão.
// Nossos valores em centavos cabem tranquilo em number, então convertemos.
pg.types.setTypeParser(20, (v) => (v === null ? null : Number(v)));

const __dirname = dirname(fileURLToPath(import.meta.url));

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL não definida. Copie backend/.env.example para .env e preencha.');
}

// SSL só pra bancos remotos (Neon). Postgres local/Docker não usa SSL.
const dbUrl = process.env.DATABASE_URL!;
const isLocal = /@(localhost|127\.0\.0\.1)/.test(dbUrl) || /sslmode=disable/.test(dbUrl);

export const pool = new Pool({
  connectionString: dbUrl,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

export async function query<T extends pg.QueryResultRow = any>(
  text: string,
  params?: unknown[],
): Promise<pg.QueryResult<T>> {
  return pool.query<T>(text, params);
}

// Roda o schema (idempotente) e o seed (só se o banco estiver vazio).
export async function initDb(): Promise<void> {
  const schema = readFileSync(join(__dirname, '../../db/schema.sql'), 'utf8');
  await pool.query(schema);

  const { rows } = await pool.query<{ count: number }>('SELECT COUNT(*)::int AS count FROM users');
  if (rows[0].count === 0) {
    const seed = readFileSync(join(__dirname, '../../db/seed.sql'), 'utf8');
    await pool.query(seed);
    console.log('[db] banco vazio → seed de exemplo aplicado.');
  }
  console.log('[db] schema pronto.');
}

// Single-user por enquanto: sempre o primeiro usuário.
// (quando entrar auth, isso vira o id do usuário logado)
export async function currentUserId(): Promise<number> {
  const { rows } = await pool.query<{ id: number }>('SELECT id FROM users ORDER BY id LIMIT 1');
  return rows[0].id;
}

// Garante que o mês tenha config (salário + taxa + cotação + teto). Se ainda
// não existe, herda salário/taxa/teto do mês mais recente e CONGELA a cotação
// do dólar atual — assim o salário é computado automaticamente todo mês.
export async function ensureMonthSettings(uid: number, ym: string): Promise<void> {
  const exists = await pool.query('SELECT 1 FROM month_settings WHERE user_id=$1 AND ym=$2', [uid, ym]);
  if (exists.rows.length) return;

  const prev = await pool.query<{
    salary_usd_cents: number; salary_fee_usd_cents: number; usd_rate: string; card_limit_cents: number;
  }>(
    `SELECT salary_usd_cents, salary_fee_usd_cents, usd_rate, card_limit_cents
       FROM month_settings WHERE user_id=$1 ORDER BY ym DESC LIMIT 1`,
    [uid],
  );
  const base = prev.rows[0];
  const salaryUsd = base?.salary_usd_cents ?? 400000;
  const feeUsd = base?.salary_fee_usd_cents ?? 3700;
  const cardLimit = base?.card_limit_cents ?? 0;
  let rate = Number(base?.usd_rate ?? 0);

  // congela a cotação atual (se a API responder); senão mantém a do mês anterior
  try {
    const r = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL');
    if (r.ok) {
      const d = (await r.json()) as { USDBRL?: { bid: string } };
      const bid = Number(d.USDBRL?.bid);
      if (bid) rate = bid;
    }
  } catch {
    /* sem internet: mantém a cotação do mês anterior */
  }

  await pool.query(
    `INSERT INTO month_settings (user_id, ym, salary_usd_cents, salary_fee_usd_cents, usd_rate, card_limit_cents)
     VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (user_id, ym) DO NOTHING`,
    [uid, ym, salaryUsd, feeUsd, rate, cardLimit],
  );
}

// Categorias recorrentes (contas do Pix, investimentos...): toda vez que um mês
// é acessado, garante que cada categoria recurring tenha um lançamento NÃO-PAGO
// naquele mês (valor = orçado). O NOT EXISTS evita duplicar — roda à vontade.
export async function ensureMonthlyRecurring(uid: number, ym: string): Promise<void> {
  await pool.query(
    `INSERT INTO transactions (user_id, category_id, tx_date, ref_month, amount_cents, description, paid)
     SELECT $1, c.id, ($2 || '-01')::date, $2, c.budget_cents, '', false
       FROM categories c
      WHERE c.user_id = $1 AND c.recurring AND c.active
        AND c.kind IN ('pix', 'investment')
        AND NOT EXISTS (
          SELECT 1 FROM transactions t
           WHERE t.user_id = $1 AND t.category_id = c.id AND t.ref_month = $2)`,
    [uid, ym],
  );
}
