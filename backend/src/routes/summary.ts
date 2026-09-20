import { Router } from 'express';
import { query, currentUserId, ensureMonthlyRecurring, ensureMonthSettings } from '../db.js';

export const summaryRouter = Router();

// GET /api/summary?month=YYYY-MM
summaryRouter.get('/', async (req, res) => {
  const uid = await currentUserId();
  const ym = String(req.query.month ?? '');
  if (!/^\d{4}-\d{2}$/.test(ym)) return res.status(400).json({ error: 'month deve ser YYYY-MM' });
  await ensureMonthSettings(uid, ym);    // salário/cotação computados todo mês
  await ensureMonthlyRecurring(uid, ym); // recorrentes (pix + investimentos) deste mês

  // Config do mês (salário em dólar + taxa + cotação + teto do cartão)
  const cfg = await query<{
    salary_usd_cents: number; salary_fee_usd_cents: number; usd_rate: string; card_limit_cents: number;
  }>(
    `SELECT salary_usd_cents, salary_fee_usd_cents, usd_rate, card_limit_cents
       FROM month_settings WHERE user_id=$1 AND ym=$2`,
    [uid, ym],
  );
  const salaryUsdCents = cfg.rows[0]?.salary_usd_cents ?? 400000;
  const salaryFeeUsdCents = cfg.rows[0]?.salary_fee_usd_cents ?? 3700;
  const usdRate = Number(cfg.rows[0]?.usd_rate ?? 0);
  const cardLimitCents = cfg.rows[0]?.card_limit_cents ?? 0;
  // salário líquido: (bruto - taxa) em USD, convertido pela cotação
  const salaryCents = Math.round((salaryUsdCents - salaryFeeUsdCents) * usdRate);

  // Realizado por categoria no mês
  const perCat = await query<{
    id: number; group_name: string | null; name: string; kind: string;
    budget_cents: number; color: string; icon: string;
    realizado_cents: number; paid: boolean | null;
  }>(
    `SELECT c.id, c.group_name, c.name, c.kind, c.budget_cents, c.color, c.icon,
            COALESCE(SUM(t.amount_cents), 0)::bigint AS realizado_cents,
            BOOL_AND(t.paid) AS paid
       FROM categories c
       LEFT JOIN transactions t
         ON t.category_id = c.id AND t.ref_month = $2
      WHERE c.user_id = $1 AND c.active
        AND (c.recurring OR EXISTS (
          SELECT 1 FROM transactions t2
           WHERE t2.user_id = $1 AND t2.category_id = c.id AND t2.ref_month = $2))
      GROUP BY c.id
      ORDER BY c.sort, c.name`,
    [uid, ym],
  );

  const cats = perCat.rows;
  const sumBy = (kind: string, field: 'budget_cents' | 'realizado_cents') =>
    cats.filter((c) => c.kind === kind).reduce((a, c) => a + Number(c[field]), 0);

  const faturaCents = sumBy('card', 'realizado_cents');
  const orcadoCartaoCents = sumBy('card', 'budget_cents');
  const pixTotalCents = sumBy('pix', 'realizado_cents');
  const investCents = sumBy('investment', 'realizado_cents');
  const incomeExtraCents = sumBy('income', 'realizado_cents');

  const receitasCents = salaryCents + incomeExtraCents;
  const despesasCents = faturaCents + pixTotalCents + investCents;
  // saldo do cartão: negativo = estourou o orçado
  const saldoCartaoCents = orcadoCartaoCents - faturaCents;

  // Contas do Pix (pago / a pagar)
  const pixCats = cats.filter((c) => c.kind === 'pix');
  const pixPagoCents = pixCats
    .filter((c) => c.paid === true)
    .reduce((a, c) => a + Number(c.realizado_cents || c.budget_cents), 0);

  res.json({
    month: ym,
    receitasCents,
    despesasCents,
    salaryCents,
    salaryUsdCents,
    salaryFeeUsdCents,
    usdRate,
    incomeExtraCents,
    faturaCents,
    orcadoCartaoCents,
    saldoCartaoCents,
    cardLimitCents,
    pixTotalCents,
    pixPagoCents,
    pixFaltaCents: pixTotalCents - pixPagoCents,
    investCents,
    categories: cats.map((c) => ({
      id: c.id,
      group: c.group_name,
      name: c.name,
      kind: c.kind,
      icon: c.icon,
      color: c.color,
      budgetCents: Number(c.budget_cents),
      realizadoCents: Number(c.realizado_cents),
      paid: c.paid,
    })),
  });
});
