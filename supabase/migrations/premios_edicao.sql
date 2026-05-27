CREATE TABLE IF NOT EXISTS premios_edicao (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  edicao_id  uuid REFERENCES edicoes(id) ON DELETE CASCADE,
  ordem      integer DEFAULT 0,
  nome       text NOT NULL,
  valor      text NOT NULL,
  quantidade integer DEFAULT 1,
  foto_url   text,
  ativo      boolean DEFAULT true,
  destaque   boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_premios_edicao ON premios_edicao(edicao_id, ativo, ordem);

-- RLS
ALTER TABLE premios_edicao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin pode tudo" ON premios_edicao
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Público pode ler prêmios ativos" ON premios_edicao
  FOR SELECT USING (ativo = true);
