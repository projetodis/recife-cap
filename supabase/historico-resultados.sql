-- historico-resultados.sql
-- Sistema público de histórico de resultados
-- Executar no Supabase SQL Editor

-- ── 1. Colunas extras em ganhadores para desnormalização (display rápido) ──────
ALTER TABLE ganhadores
  ADD COLUMN IF NOT EXISTS nome_ganhador  text,
  ADD COLUMN IF NOT EXISTS numero_titulo  text,
  ADD COLUMN IF NOT EXISTS pdv_nome       text,
  ADD COLUMN IF NOT EXISTS edicao_id      uuid REFERENCES edicoes(id),
  ADD COLUMN IF NOT EXISTS premio_nome    text,
  ADD COLUMN IF NOT EXISTS premio_valor   numeric;

-- ── 2. Campos de arte/banner por sorteio ─────────────────────────────────────
ALTER TABLE sorteios
  ADD COLUMN IF NOT EXISTS arte_url   text,
  ADD COLUMN IF NOT EXISTS banner_url text;

-- ── 3. Índices para performance ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sorteios_edicao_status ON sorteios(edicao_id, status);
CREATE INDEX IF NOT EXISTS idx_ganhadores_sorteio      ON ganhadores(sorteio_id);
CREATE INDEX IF NOT EXISTS idx_ganhadores_edicao       ON ganhadores(edicao_id);
CREATE INDEX IF NOT EXISTS idx_edicoes_status          ON edicoes(status);
CREATE INDEX IF NOT EXISTS idx_premios_edicao_ativo    ON premios_edicao(edicao_id, ativo);

-- ── 4. RLS — histórico público ────────────────────────────────────────────────

-- Sorteios realizados são visíveis ao público
DROP POLICY IF EXISTS "historico_public_select" ON sorteios;
CREATE POLICY "historico_public_select" ON sorteios
  FOR SELECT USING (status = 'realizado' OR auth.uid() IS NOT NULL);

-- Ganhadores são públicos (transparência dos resultados)
DROP POLICY IF EXISTS "ganhadores_public_select" ON ganhadores;
CREATE POLICY "ganhadores_public_select" ON ganhadores
  FOR SELECT USING (true);

-- snapshots já têm política pública ("publico pode ler snapshots")
-- premios_edicao já têm política pública ("Público pode ler prêmios ativos")
