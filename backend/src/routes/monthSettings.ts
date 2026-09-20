import { Router } from 'express';
import { query, currentUserId } from '../db.js';

export const monthSettingsRouter = Router();

// GET /api/month-settings?month=YYYY-MM
monthSettingsRouter.get('/', async (req, res) => {
  const uid = await currentUserId();
  const ym = String(req.query.month ?? '');
  if (!/^\d{4}-\d{2}$/.test(ym)) return res.status(400).json({ error: 'month deve ser YYYY-MM' });
  const { rows } = await query(
    `SELECT salary_usd_cents AS "salaryUsdCents", salary_fee_usd_cents AS "salaryFeeUsdCents",
            usd_rate AS "usdRate", card_limit_cents AS "cardLimitCents"
       FROM month_settings WHERE user_id=$1 AND ym=$2`,
    [uid, ym],
  );
  res.json(rows[0] ?? { salaryUsdCents: 400000, salaryFeeUsdCents: 3700, usdRate: 0, cardLimitCents: 0 });
});

// PUT /api/month-settings?month=YYYY-MM  { salaryUsdCents?, usdRate?, cardLimitCents? }
monthSettingsRouter.put('/', async (req, res) => {
  const uid = await currentUserId();
  const ym = String(req.query.month ?? '');
  if (!/^\d{4}-\d{2}$/.test(ym)) return res.status(400).json({ error: 'month deve ser YYYY-MM' });
  const { salaryUsdCents = 400000, salaryFeeUsdCents = 3700, usdRate = 0, cardLimitCents = 0 } = req.body ?? {};
  await query(
    `INSERT INTO month_settings (user_id, ym, salary_usd_cents, salary_fee_usd_cents, usd_rate, card_limit_cents)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (user_id, ym) DO UPDATE
       SET salary_usd_cents=EXCLUDED.salary_usd_cents,
           salary_fee_usd_cents=EXCLUDED.salary_fee_usd_cents,
           usd_rate=EXCLUDED.usd_rate,
           card_limit_cents=EXCLUDED.card_limit_cents`,
    [uid, ym, salaryUsdCents, salaryFeeUsdCents, usdRate, cardLimitCents],
  );
  res.json({ ok: true });
});
