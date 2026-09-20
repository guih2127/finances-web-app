-- =============================================================================
-- Finanças — schema inicial (Postgres / Neon)
-- Regras: dinheiro sempre em CENTAVOS (inteiro). Toda tabela de dados tem user_id
-- desde já (single-user por enquanto, mas pronto pra multiusuário).
-- Este arquivo é idempotente: roda no boot do backend (CREATE ... IF NOT EXISTS).
-- =============================================================================

CREATE TABLE IF NOT EXISTS users (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email       TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Categorias: grupo + nome + tipo. O tipo separa cartão x pix x receita x investimento.
--   card       = despesa no cartão de crédito (tem teto/orçado, entra na "fatura")
--   pix        = conta/imposto fixo pago no Pix (só pago/não-pago)
--   income     = receita extra manual (reembolso, premiação...)
--   investment = aporte tratado como controle mensal
CREATE TABLE IF NOT EXISTS categories (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_name   TEXT,
  name         TEXT NOT NULL,
  kind         TEXT NOT NULL CHECK (kind IN ('card','pix','income','investment')),
  budget_cents BIGINT NOT NULL DEFAULT 0,   -- orçado mensal padrão
  color        TEXT NOT NULL DEFAULT '#c6f24e',
  icon         TEXT NOT NULL DEFAULT '💸',
  sort         INT NOT NULL DEFAULT 0,
  active       BOOLEAN NOT NULL DEFAULT true,
  recurring    BOOLEAN NOT NULL DEFAULT false,  -- gera um lançamento não-pago todo início de mês
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id);
-- Coluna de recorrência (idempotente, pra bancos criados antes dela existir):
ALTER TABLE categories ADD COLUMN IF NOT EXISTS recurring BOOLEAN NOT NULL DEFAULT false;

-- Lançamentos: uma linha por despesa/receita. 'paid' importa pras contas do Pix.
CREATE TABLE IF NOT EXISTS transactions (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id  BIGINT REFERENCES categories(id) ON DELETE SET NULL,
  tx_date      DATE NOT NULL,               -- data real da compra (informativa)
  ref_month    TEXT,                         -- competência 'YYYY-MM': define em que mês o lançamento conta
  amount_cents BIGINT NOT NULL,             -- sempre positivo; o tipo da categoria diz o sinal
  description  TEXT NOT NULL DEFAULT '',
  paid         BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Coluna de competência (idempotente) + backfill dos lançamentos antigos pela data:
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS ref_month TEXT;
UPDATE transactions SET ref_month = to_char(tx_date, 'YYYY-MM') WHERE ref_month IS NULL;
CREATE INDEX IF NOT EXISTS idx_tx_user_month ON transactions(user_id, ref_month);
CREATE INDEX IF NOT EXISTS idx_tx_category   ON transactions(category_id);

-- Config por mês: salário em dólar + cotação congelada do mês.
-- salary = salary_usd_cents/100 * usd_rate  (calculado; o salário NÃO é um lançamento)
CREATE TABLE IF NOT EXISTS month_settings (
  user_id          BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ym               TEXT NOT NULL,           -- 'YYYY-MM'
  salary_usd_cents BIGINT NOT NULL DEFAULT 400000,   -- US$ 4.000,00 (bruto)
  salary_fee_usd_cents BIGINT NOT NULL DEFAULT 3700, -- taxa em US$ (1% de 3.700 = US$ 37,00)
  usd_rate         NUMERIC(10,4) NOT NULL DEFAULT 0, -- cotação USD->BRL congelada
  card_limit_cents BIGINT NOT NULL DEFAULT 0,        -- teto do cartão (Max. Nubank)
  PRIMARY KEY (user_id, ym)
);
-- Coluna da taxa (idempotente, pra bancos criados antes dela existir):
ALTER TABLE month_settings ADD COLUMN IF NOT EXISTS salary_fee_usd_cents BIGINT NOT NULL DEFAULT 3700;

-- Salário líquido = (bruto - taxa) em USD, convertido pela cotação.
-- = (salary_usd_cents - salary_fee_usd_cents)/100 * usd_rate
