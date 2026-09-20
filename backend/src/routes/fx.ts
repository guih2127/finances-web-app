import { Router } from 'express';

export const fxRouter = Router();

// GET /api/fx  → cotação USD->BRL ao vivo (AwesomeAPI, grátis e sem chave)
fxRouter.get('/', async (_req, res) => {
  try {
    const r = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL');
    if (!r.ok) throw new Error(`AwesomeAPI ${r.status}`);
    const data = (await r.json()) as { USDBRL?: { bid: string; create_date: string } };
    const bid = data.USDBRL?.bid;
    if (!bid) throw new Error('resposta inesperada');
    res.json({ rate: Number(bid), updatedAt: data.USDBRL!.create_date });
  } catch (err) {
    res.status(502).json({ error: 'não foi possível obter a cotação', detail: String(err) });
  }
});
