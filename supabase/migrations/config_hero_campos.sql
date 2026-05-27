-- Campos de configuração para o hero da landing page
INSERT INTO configuracoes (chave, valor, tipo, categoria, descricao) VALUES
  ('fundo_hero_mobile_url', '/fundo-mobile.png', 'imagem', 'midias',  'Fundo hero versão mobile (portrait)'),
  ('texto_btn_principal',   'Quero participar →', 'texto',  'geral',   'Texto do botão principal do hero'),
  ('texto_btn_secundario',  'Ver sorteio',         'texto',  'geral',   'Texto do botão secundário do hero')
ON CONFLICT (chave) DO NOTHING;
