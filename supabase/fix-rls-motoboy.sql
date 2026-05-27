-- ============================================
-- CORRIGE RLS para motoboys, rotas e paradas
-- Execute no Supabase SQL Editor
-- ============================================

-- ── MOTOBOYS ────────────────────────────────────────────────────────
-- Distribuidor vê os seus, motoboy vê a si mesmo, admin vê todos

DROP POLICY IF EXISTS "motoboys_select" ON motoboys;
CREATE POLICY "motoboys_select" ON motoboys
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM distribuidores WHERE id = motoboys.distribuidor_id
    )
    OR auth.uid() = motoboys.user_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "motoboys_insert" ON motoboys;
CREATE POLICY "motoboys_insert" ON motoboys
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM distribuidores WHERE id = motoboys.distribuidor_id
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "motoboys_update" ON motoboys;
CREATE POLICY "motoboys_update" ON motoboys
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT user_id FROM distribuidores WHERE id = motoboys.distribuidor_id
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── ROTAS_ENTREGA ────────────────────────────────────────────────────
-- Distribuidor gerencia as suas, motoboy vê as dele

DROP POLICY IF EXISTS "rotas_select" ON rotas_entrega;
CREATE POLICY "rotas_select" ON rotas_entrega
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM distribuidores WHERE id = rotas_entrega.distribuidor_id
    )
    OR auth.uid() IN (
      SELECT user_id FROM motoboys WHERE id = rotas_entrega.motoboy_id
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "rotas_insert" ON rotas_entrega;
CREATE POLICY "rotas_insert" ON rotas_entrega
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM distribuidores WHERE id = rotas_entrega.distribuidor_id
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "rotas_update" ON rotas_entrega;
CREATE POLICY "rotas_update" ON rotas_entrega
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT user_id FROM distribuidores WHERE id = rotas_entrega.distribuidor_id
    )
    OR auth.uid() IN (
      SELECT user_id FROM motoboys WHERE id = rotas_entrega.motoboy_id
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── PARADAS_ROTA ─────────────────────────────────────────────────────
-- Distribuidor gerencia, motoboy vê e atualiza as suas

DROP POLICY IF EXISTS "paradas_select" ON paradas_rota;
CREATE POLICY "paradas_select" ON paradas_rota
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM rotas_entrega r
      JOIN distribuidores d ON d.id = r.distribuidor_id
      WHERE r.id = paradas_rota.rota_id
        AND d.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM rotas_entrega r
      JOIN motoboys m ON m.id = r.motoboy_id
      WHERE r.id = paradas_rota.rota_id
        AND m.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "paradas_insert" ON paradas_rota;
CREATE POLICY "paradas_insert" ON paradas_rota
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM rotas_entrega r
      JOIN distribuidores d ON d.id = r.distribuidor_id
      WHERE r.id = paradas_rota.rota_id
        AND d.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "paradas_update" ON paradas_rota;
CREATE POLICY "paradas_update" ON paradas_rota
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM rotas_entrega r
      JOIN distribuidores d ON d.id = r.distribuidor_id
      WHERE r.id = paradas_rota.rota_id
        AND d.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM rotas_entrega r
      JOIN motoboys m ON m.id = r.motoboy_id
      WHERE r.id = paradas_rota.rota_id
        AND m.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
