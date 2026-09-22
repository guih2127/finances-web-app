import { Router } from 'express';
import { fetchLiveUsdRate } from '../db.js';

export const fxRouter = Router();

// GET /api/fx  → cotação USD->BRL ao vivo (AwesomeAPI, grátis e sem chave)
fxRouter.get('/', async (_req, res) => {
  const rate = await fetchLiveUsdRate();
  if (rate) return res.json({ rate, updatedAt: new Date().toISOString() });
  res.status(502).json({ error: 'não foi possível obter a cotação' });
});
