import { Router } from 'express';
import { query, currentUserId, ensureMonthlyRecurring } from '../db.js';

export const transactionsRouter = Router();

// GET /api/transactions?month=YYYY-MM
transactionsRouter.get('/', async (req, res) => {
  const uid = await currentUserId();
  const ym = String(req.query.month ?? '');
  const params: unknown[] = [uid];
  let where = 't.user_id=$1';
  if (/^\d{4}-\d{2}$/.test(ym)) {
    await ensureMonthlyRecurring(uid, ym); // recorrentes (pix + investimentos) deste mês
    params.push(ym);
    where += ` AND t.ref_month=$2`;
  }
  const { rows } = await query(
    `SELECT t.id, t.category_id AS "categoryId", c.name AS "categoryName", c.kind,
            c.icon, t.tx_date AS date, t.ref_month AS month, t.amount_cents AS "amountCents",
            t.description, t.paid
       FROM transactions t LEFT JOIN categories c ON c.id=t.category_id
      WHERE ${where} ORDER BY t.tx_date DESC, t.id DESC`,
    params,
  );
  res.json(rows);
});

// GET /api/transactions/names?categoryId=  → nomes de compra já usados (pra reusar)
// Ordena por frequência: os mais usados aparecem primeiro.
transactionsRouter.get('/names', async (req, res) => {
  const uid = await currentUserId();
  const catId = Number(req.query.categoryId);
  const params: unknown[] = [uid];
  let filter = '';
  if (catId) { params.push(catId); filter = ` AND category_id=$2`; }
  const { rows } = await query<{ description: string }>(
    `SELECT description FROM transactions
      WHERE user_id=$1 AND description <> ''${filter}
      GROUP BY description ORDER BY COUNT(*) DESC, MAX(tx_date) DESC LIMIT 50`,
    params,
  );
  res.json(rows.map((r) => r.description));
});

// POST /api/transactions  { categoryId, date, month, amountCents, description?, paid? }
//   date  = data real da compra  |  month = competência 'YYYY-MM' (mês da fatura)
transactionsRouter.post('/', async (req, res) => {
  const uid = await currentUserId();
  const { categoryId, date, month, amountCents, description = '', paid = true } = req.body ?? {};
  if (!categoryId || !date || typeof amountCents !== 'number') {
    return res.status(400).json({ error: 'categoryId, date e amountCents são obrigatórios' });
  }
  const refMonth = /^\d{4}-\d{2}$/.test(month) ? month : String(date).slice(0, 7);
  const { rows } = await query(
    `INSERT INTO transactions (user_id, category_id, tx_date, ref_month, amount_cents, description, paid)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
    [uid, categoryId, date, refMonth, Math.abs(Math.round(amountCents)), description, paid],
  );
  res.status(201).json({ id: rows[0].id });
});

// PATCH /api/transactions/:id  { amountCents?, description?, paid?, date? }
transactionsRouter.patch('/:id', async (req, res) => {
  const uid = await currentUserId();
  const id = Number(req.params.id);
  const map: Record<string, unknown> = {
    amount_cents: req.body.amountCents, description: req.body.description,
    paid: req.body.paid, tx_date: req.body.date,
    category_id: req.body.categoryId, ref_month: req.body.month,
  };
  const sets: string[] = [];
  const vals: unknown[] = [];
  for (const [col, val] of Object.entries(map)) if (val !== undefined) { vals.push(val); sets.push(`${col}=$${vals.length}`); }
  if (!sets.length) return res.json({ ok: true });
  vals.push(uid, id);
  await query(`UPDATE transactions SET ${sets.join(',')} WHERE user_id=$${vals.length - 1} AND id=$${vals.length}`, vals);
  res.json({ ok: true });
});

// DELETE /api/transactions/:id
transactionsRouter.delete('/:id', async (req, res) => {
  const uid = await currentUserId();
  await query('DELETE FROM transactions WHERE user_id=$1 AND id=$2', [uid, Number(req.params.id)]);
  res.json({ ok: true });
});
