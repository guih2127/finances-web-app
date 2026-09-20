import { Router } from 'express';
import { query, currentUserId } from '../db.js';

export const categoriesRouter = Router();

// GET /api/categories
categoriesRouter.get('/', async (_req, res) => {
  const uid = await currentUserId();
  const { rows } = await query(
    `SELECT id, group_name AS "group", name, kind, budget_cents AS "budgetCents",
            color, icon, sort, active, recurring
       FROM categories WHERE user_id=$1 AND active ORDER BY sort, name`,
    [uid],
  );
  res.json(rows);
});

// POST /api/categories  { group?, name, kind, budgetCents?, color?, icon? }
categoriesRouter.post('/', async (req, res) => {
  const uid = await currentUserId();
  const { group = null, name, kind, budgetCents = 0, color, icon, recurring = false } = req.body ?? {};
  if (!name || !['card', 'pix', 'income', 'investment'].includes(kind)) {
    return res.status(400).json({ error: 'name e kind (card|pix|income|investment) são obrigatórios' });
  }
  const { rows } = await query(
    `INSERT INTO categories (user_id, group_name, name, kind, budget_cents, color, icon, recurring, sort)
     VALUES ($1,$2,$3,$4,$5, COALESCE($6,'#c6f24e'), COALESCE($7,'💸'), $8,
             (SELECT COALESCE(MAX(sort),0)+1 FROM categories WHERE user_id=$1))
     RETURNING id`,
    [uid, group, name, kind, budgetCents, color, icon, recurring],
  );
  res.status(201).json({ id: rows[0].id });
});

// PATCH /api/categories/:id  { name?, group?, budgetCents?, color?, icon?, active? }
categoriesRouter.patch('/:id', async (req, res) => {
  const uid = await currentUserId();
  const id = Number(req.params.id);
  const fields = ['name', 'group_name', 'budget_cents', 'color', 'icon', 'active', 'recurring'] as const;
  const map: Record<string, unknown> = {
    name: req.body.name, group_name: req.body.group, budget_cents: req.body.budgetCents,
    color: req.body.color, icon: req.body.icon, active: req.body.active, recurring: req.body.recurring,
  };
  const sets: string[] = [];
  const vals: unknown[] = [];
  for (const f of fields) if (map[f] !== undefined) { vals.push(map[f]); sets.push(`${f}=$${vals.length}`); }
  if (!sets.length) return res.json({ ok: true });
  vals.push(uid, id);
  await query(`UPDATE categories SET ${sets.join(',')} WHERE user_id=$${vals.length - 1} AND id=$${vals.length}`, vals);
  res.json({ ok: true });
});
