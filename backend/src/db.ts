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

// Mês atual (YYYY-MM) no fuso do Brasil — o servidor (Render) roda em UTC, então
// calculamos explicitamente pra não "virar o mês" com horas de diferença.
export function currentYm(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
  }).format(new Date()); // en-CA → "YYYY-MM"
}

// Fontes de cotação USD->BRL, em ordem de preferência. Todas grátis e sem chave.
// A AwesomeAPI dá o valor em tempo real, mas bloqueia IPs de datacenter (não
// funciona no Render); por isso caímos pra APIs/CDN que respondem de qualquer
// lugar. A primeira que responder um número válido vence.
const FX_SOURCES: { name: string; url: string; pick: (d: any) => number | undefined }[] = [
  { name: 'awesomeapi', url: 'https://economia.awesomeapi.com.br/last/USD-BRL', pick: (d) => Number(d?.USDBRL?.bid) },
  { name: 'open.er-api', url: 'https://open.er-api.com/v6/latest/USD', pick: (d) => Number(d?.rates?.BRL) },
  { name: 'jsdelivr', url: 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json', pick: (d) => Number(d?.usd?.brl) },
];

// Busca a cotação USD->BRL ao vivo tentando cada fonte em ordem.
// Retorna null só se TODAS falharem — quem chama decide o fallback.
export async function fetchLiveUsdRate(): Promise<number | null> {
  for (const src of FX_SOURCES) {
    try {
      const r = await fetch(src.url, { signal: AbortSignal.timeout(6000) });
      if (!r.ok) { console.warn(`[fx] ${src.name} HTTP ${r.status}`); continue; }
      const rate = src.pick(await r.json());
      if (rate && Number.isFinite(rate) && rate > 0) return rate;
      console.warn(`[fx] ${src.name} resposta sem cotação válida`);
    } catch (err) {
      console.warn(`[fx] ${src.name} falhou: ${String(err)}`);
    }
  }
  return null;
}

// Garante que o mês tenha config (salário + taxa + cotação + teto). Herda
// salário/taxa/teto do mês mais recente. A cotação do dólar acompanha a cotação
// ao vivo no mês ATUAL e nos FUTUROS (o salário ainda não foi recebido, então o
// que vale é a cotação de hoje). Só meses PASSADOS ficam congelados — salário
// histórico não muda retroativamente.
export async function ensureMonthSettings(uid: number, ym: string): Promise<void> {
  const exists = await pool.query('SELECT 1 FROM month_settings WHERE user_id=$1 AND ym=$2', [uid, ym]);
  const isPast = ym < currentYm(); // comparação lexicográfica funciona pra YYYY-MM

  // Mês já existe: atual/futuro acompanha a cotação ao vivo; passado fica congelado.
  if (exists.rows.length) {
    if (!isPast) {
      const live = await fetchLiveUsdRate();
      if (live) {
        await pool.query('UPDATE month_settings SET usd_rate=$3 WHERE user_id=$1 AND ym=$2', [uid, ym, live]);
      }
    }
    return;
  }

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
  // mês atual/futuro: cotação ao vivo (com fallback pra do mês anterior se a API
  // falhar). mês passado criado retroativamente: herda a cotação congelada.
  const prevRate = Number(base?.usd_rate ?? 0);
  const rate = isPast ? prevRate : (await fetchLiveUsdRate()) ?? prevRate;

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
