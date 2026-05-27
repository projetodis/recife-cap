CREATE TABLE IF NOT EXISTS configuracoes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  chave text NOT NULL UNIQUE,
  valor text,
  tipo text DEFAULT 'texto' CHECK (tipo IN ('texto', 'cor', 'imagem', 'booleano', 'numero')),
  categoria text DEFAULT 'geral' CHECK (categoria IN ('geral', 'midias', 'cores', 'textos', 'contato', 'rodape')),
  descricao text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE configuracoes ENABLE ROW LEVEL SECURITY;
-- Leitura pública (usada pelo frontend)
CREATE POLICY "public_read_configs" ON configuracoes FOR SELECT USING (true);
-- Escrita apenas para admin
CREATE POLICY "admin_write_configs" ON configuracoes FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

INSERT INTO configuracoes (chave, valor, tipo, categoria, descricao) VALUES
  ('nome_sistema',    'Recife Cap',                                         'texto',   'geral',    'Nome do sistema'),
  ('slogan',          'Filantropia Premiável',                              'texto',   'geral',    'Slogan'),
  ('cor_primaria',    '#2E7D32',                                            'cor',     'cores',    'Cor principal'),
  ('cor_secundaria',  '#FFC107',                                            'cor',     'cores',    'Cor secundária'),
  ('logo_url',        '/logo.png',                                          'imagem',  'midias',   'Logo principal'),
  ('favicon_url',     '/logo.png',                                          'imagem',  'midias',   'Favicon'),
  ('fundo_hero_url',  '/fundo.png',                                         'imagem',  'midias',   'Imagem de fundo do hero'),
  ('banner_compra_url', '',                                                 'imagem',  'midias',   'Banner na página de compra'),
  ('banner_sorteio_url', '',                                                'imagem',  'midias',   'Banner na página de sorteio'),
  ('whatsapp_suporte', '',                                                  'texto',   'contato',  'WhatsApp de suporte'),
  ('email_suporte',   '',                                                   'texto',   'contato',  'Email de suporte'),
  ('instagram_url',   '',                                                   'texto',   'contato',  'Instagram'),
  ('facebook_url',    '',                                                   'texto',   'contato',  'Facebook'),
  ('rodape_texto',    'Título de Capitalização nº XXXX/XXXX SUSEP',        'texto',   'rodape',   'Texto do rodapé'),
  ('rodape_direitos', '2026 Recife Cap. Todos os direitos reservados.',     'texto',   'rodape',   'Direitos autorais'),
  ('premio_principal', '120.000',                                           'numero',  'geral',    'Valor do prêmio principal'),
  ('valor_titulo',    '10',                                                 'numero',  'geral',    'Valor de cada título'),
  ('canal_sorteio',   'TV Ponta Negra',                                     'texto',   'geral',    'Canal de transmissão'),
  ('google_play_url', '',                                                   'texto',   'midias',   'Link Google Play'),
  ('app_store_url',   '',                                                   'texto',   'midias',   'Link App Store')
ON CONFLICT (chave) DO NOTHING;

-- Bucket de mídias (executar no Storage via Supabase Dashboard ou CLI):
-- insert into storage.buckets (id, name, public) values ('midias', 'midias', true);
