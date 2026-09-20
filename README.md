# Finanças

App pessoal de finanças (web, responsivo → mobile depois). Controle mensal: orçado × realizado,
receitas (salário em dólar + extras), contas no Pix (pago/não pago) e investimentos. Tudo em R$ com centavos.

## Stack
- **Backend**: Node + Express + TypeScript + `pg` (Postgres/Neon)
- **Frontend**: React + Vite (visual estilo Rocket Money)
- **Deploy**: 1 serviço no Render servindo SPA + API · banco Neon

## Rodando localmente

1. Crie um banco grátis no [Neon](https://neon.tech) e copie a connection string.
2. Backend:
   ```
   cd backend
   copy .env.example .env      # e cole a DATABASE_URL do Neon
   npm install
   npm run dev                 # sobe a API em http://localhost:3001 (cria schema + seed)
   ```
3. Frontend (outro terminal):
   ```
   cd frontend
   npm install
   npm run dev                 # http://localhost:5173
   ```

O banco é criado e populado automaticamente com dados de exemplo (setembro/2026) no primeiro boot.

## Modelo de dados
`users` · `categories` (card|pix|income|investment) · `transactions` · `month_settings`.
Dinheiro sempre em centavos (inteiro). Ver `db/schema.sql`.
