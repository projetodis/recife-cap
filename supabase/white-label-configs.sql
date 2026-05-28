-- white-label-configs.sql
-- Novas chaves de configuração para white label expandido
-- Executar no Supabase SQL Editor

INSERT INTO configuracoes (chave, valor, tipo, categoria, descricao) VALUES
  -- Hero da landing
  ('hero_badge',                 'FILANTROPIA PREMIÁVEL',                                    'texto',  'geral',  'Texto do badge no hero (ex: FILANTROPIA PREMIÁVEL)'),
  ('hero_titulo',                'RECIFE CAP',                                               'texto',  'geral',  'Título principal do hero (separado do nome do sistema)'),
  ('hero_subtitulo',             'Participe e concorra a prêmios incríveis toda semana',     'texto',  'geral',  'Subtítulo / chamada abaixo do título no hero'),
  ('banner_sorteio_mobile_url',  '',                                                         'imagem', 'midias', 'Banner do sorteio — versão mobile (800×400px)'),
  ('sorteio_dia_semana',         'Sábado',                                                   'texto',  'geral',  'Dia da semana do sorteio (ex: Sábado, Todo sábado)'),
  ('sorteio_horario',            '09h00',                                                    'texto',  'geral',  'Horário do sorteio (ex: 09h00)'),
  -- Cores do dashboard interno
  ('cor_sidebar',                '#1B5E20',                                                  'cor',    'cores',  'Cor de fundo da sidebar dos painéis admin/distribuidor'),
  ('cor_header',                 '#2E7D32',                                                  'cor',    'cores',  'Cor do cabeçalho dos painéis internos'),
  -- Cores do site público
  ('cor_hero_bg',                '#1B5E20',                                                  'cor',    'cores',  'Cor de fundo do hero quando não há imagem'),
  ('cor_hero_text',              '#FFFFFF',                                                  'cor',    'cores',  'Cor do texto principal no hero'),
  ('cor_site_bg',                '#F5F7FA',                                                  'cor',    'cores',  'Cor de fundo geral do site público')
ON CONFLICT (chave) DO NOTHING;
