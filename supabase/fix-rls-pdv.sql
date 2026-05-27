-- ============================================
-- CORRIGE RLS para pontos_de_venda
-- Execute no Supabase SQL Editor
-- ============================================
-- Se motoboys não conseguem ler pontos_de_venda,
-- o join em paradas_rota retorna null silenciosamente.
-- ── PONTOS_DE_VENDA ──────────────────────────────────────────────────

DROP POLICY IF EXISTS "pdvs_select" ON pontos_de_venda;
CREATE POLICY "pdvs_select" ON pontos_de_venda
  FOR SELECT USING (
    -- Distribuidor vê os seus PDVs
    EXISTS (
      SELECT 1 FROM distribuidores d
      WHERE d.user_id = auth.uid()
        AND d.id = pontos_de_venda.distribuidor_id
    )
    -- Motoboy vê PDVs que estão nas suas rotas de hoje
    OR EXISTS (
      SELECT 1 FROM paradas_rota pr
      JOIN rotas_entrega r ON r.id = pr.rota_id
      JOIN motoboys m ON m.id = r.motoboy_id
      WHERE pr.pdv_id = pontos_de_venda.id
        AND m.user_id = auth.uid()
    )
    -- Admin vê tudo
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── ALTERNATIVA MAIS PERMISSIVA (se a tabela não tem distribuidor_id) ──
-- Se a query acima der erro por pontos_de_venda não ter distribuidor_id,
-- use esta versão simplificada:
--
-- DROP POLICY IF EXISTS "pdvs_select" ON pontos_de_venda;
-- CREATE POLICY "pdvs_select" ON pontos_de_venda
--   FOR SELECT USING (true);
--
-- (permite leitura pública — seguro se PDVs são dados não sensíveis)
