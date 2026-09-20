import 'dotenv/config';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import express from 'express';
import cors from 'cors';
import { initDb } from './db.js';
import { summaryRouter } from './routes/summary.js';
import { categoriesRouter } from './routes/categories.js';
import { transactionsRouter } from './routes/transactions.js';
import { fxRouter } from './routes/fx.js';
import { monthSettingsRouter } from './routes/monthSettings.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/summary', summaryRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/fx', fxRouter);
app.use('/api/month-settings', monthSettingsRouter);

// Em produção o backend serve a SPA buildada do frontend.
const spaDir = join(__dirname, '../../frontend/dist');
if (existsSync(spaDir)) {
  app.use(express.static(spaDir));
  app.get('*', (_req, res) => res.sendFile(join(spaDir, 'index.html')));
}

// Handler de erro simples (evita derrubar o processo).
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[erro]', err);
  res.status(500).json({ error: 'erro interno', detail: String(err) });
});

const port = Number(process.env.PORT ?? 3001);
initDb()
  .then(() => app.listen(port, () => console.log(`[api] rodando em http://localhost:${port}`)))
  .catch((err) => {
    console.error('[fatal] não subiu:', err);
    process.exit(1);
  });
