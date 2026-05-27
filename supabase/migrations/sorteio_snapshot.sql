CREATE TABLE IF NOT EXISTS sorteio_snapshots (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sorteio_id uuid REFERENCES sorteios(id) ON DELETE CASCADE,
  edicao_id  uuid REFERENCES edicoes(id),

  nome_sistema text,
  banner_url   text,

  premio_1_foto_url text,
  premio_1_nome     text,
  premio_1_valor    text,

  premio_2_foto_url text,
  premio_2_nome     text,
  premio_2_valor    text,

  premio_3_foto_url text,
  premio_3_nome     text,
  premio_3_valor    text,

  premio_4_foto_url text,
  premio_4_nome     text,
  premio_4_valor    text,

  premio_principal_foto_url text,
  premio_principal_nome     text,
  premio_principal_valor    text,

  created_at timestamptz DEFAULT now()
);

-- RLS: somente admins podem ler/inserir snapshots
ALTER TABLE sorteio_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins podem tudo em snapshots"
  ON sorteio_snapshots FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Leitura pública para a página de sorteio do cliente
CREATE POLICY "publico pode ler snapshots"
  ON sorteio_snapshots FOR SELECT
  USING (true);
