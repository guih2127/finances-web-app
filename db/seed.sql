-- =============================================================================
-- Seed de exemplo — setembro/2026 (dados da planilha do Guilherme).
-- Roda só quando o banco está vazio (o backend checa antes de aplicar).
-- =============================================================================

INSERT INTO users (email, name) VALUES ('guilherme.araujo@vendorsmart.com', 'Guilherme');

-- ---- Categorias -------------------------------------------------------------
-- Cartão (kind='card') com orçado mensal
INSERT INTO categories (user_id, group_name, name, kind, budget_cents, icon, sort) VALUES
 (1, 'Assinaturas', 'SmartFit',              'card',  28000, '🏋️', 1),
 (1, 'Assinaturas', 'Streaming',             'card',  15000, '📺', 2),
 (1, 'Assinaturas', 'Vivo',                  'card',   7000, '📶', 3),
 (1, NULL,          'Alimentação',           'card', 150000, '🛒', 4),
 (1, 'Diversão',    'Finais de Semana/comidas','card',180000, '🍔', 5),
 (1, NULL,          'Barbeiro',              'card',   9000, '💈', 6),
 (1, 'Carro',       'Gasolina',              'card',  25000, '⛽', 7),
 (1, NULL,          'Extras',                'card',  40000, '✨', 8),
 (1, NULL,          'Pets',                  'card', 100000, '🐾', 9),
 (1, NULL,          'Hobbies',               'card', 140000, '🎮', 10),
 (1, NULL,          'Parcelas',              'card',  28916, '💳', 11),
 (1, NULL,          'Tech Week',             'card',  55408, '💻', 12);

-- Pix / contas fixas + impostos (kind='pix')
INSERT INTO categories (user_id, group_name, name, kind, budget_cents, icon, sort) VALUES
 (1, NULL, 'Condomínio',     'pix', 153200, '🏢', 20),
 (1, NULL, 'IPTU',           'pix',  37684, '🏠', 21),
 (1, NULL, 'Conta de luz',   'pix',  68000, '💡', 22),
 (1, NULL, 'DAS',            'pix',  72000, '🧾', 23),
 (1, NULL, 'DARF/INSS',      'pix',  78000, '🧾', 24),
 (1, NULL, 'Plano de saúde', 'pix',  43622, '🩺', 25),
 (1, NULL, 'Contabilidade',  'pix',  54392, '📊', 26),
 (1, NULL, 'Parcela Carro',  'pix', 100000, '🚗', 27),
 (1, NULL, 'Diarista',       'pix',  84000, '🧹', 28);

-- Investimentos (kind='investment') — R$ 3.000 cada, todo mês
INSERT INTO categories (user_id, group_name, name, kind, budget_cents, icon, sort) VALUES
 (1, NULL, 'Viagem',      'investment', 300000, '✈️', 40),
 (1, NULL, 'Longo prazo', 'investment', 300000, '📈', 41);

-- Receitas extras (kind='income')
INSERT INTO categories (user_id, group_name, name, kind, budget_cents, icon, sort) VALUES
 (1, NULL, 'Premiação',   'income', 0, '🏆', 50),
 (1, NULL, 'Reembolsos',  'income', 0, '🧾', 51);

-- "Todo mês": cartão (orçamento mensal), Pix e investimentos aparecem todo mês.
-- (Pix e investimentos também geram lançamento automático; cartão só mostra o orçado.)
-- Receitas extras são avulsas (só aparecem no mês em que forem lançadas).
UPDATE categories SET recurring = true WHERE user_id = 1 AND kind IN ('card', 'pix', 'investment');

-- ---- Config do mês ----------------------------------------------------------
INSERT INTO month_settings (user_id, ym, salary_usd_cents, salary_fee_usd_cents, usd_rate, card_limit_cents)
VALUES (1, '2026-09', 400000, 3700, 5.15, 756910);

-- Sem lançamentos de exemplo: as categorias já vêm prontas, mas você começa
-- do zero cadastrando suas próprias despesas/receitas.
