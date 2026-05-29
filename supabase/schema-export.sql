-- ============================================================
-- SCHEMA RECIFE CAP WHITE LABEL
-- Executar este arquivo em ordem no novo projeto Supabase
-- ============================================================
-- 1. Acesse o SQL Editor do novo projeto Supabase
-- 2. Cole e execute cada bloco em ordem
-- 3. Verifique se não há erros antes de continuar
-- ============================================================

-- ── EXTENSÕES ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── PROFILES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome        text,
  email       text,
  role        text DEFAULT 'cliente' CHECK (role IN (
                'admin','distribuidor','pdv','cliente',
                'motoboy','operador_sorteio','financeiro','suporte'
              )),
  cpf         text,
  telefone    text,
  chave_pix   text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "users_own_profile" ON profiles
    FOR ALL USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admin_all_profiles" ON profiles
    FOR ALL TO authenticated USING (
      EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Trigger: cria profile automaticamente ao cadastrar usuário
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'cliente')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── CONFIGURACOES ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS configuracoes (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  chave      text NOT NULL UNIQUE,
  valor      text,
  tipo       text DEFAULT 'texto' CHECK (tipo IN ('texto','cor','imagem','booleano','numero')),
  categoria  text DEFAULT 'geral' CHECK (categoria IN (
               'geral','midias','cores','textos','contato','rodape',
               'sobre','como_participar','sorteio','seo','hero','dashboard'
             )),
  descricao  text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE configuracoes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "public_read_configs" ON configuracoes FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admin_write_configs" ON configuracoes FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── EDICOES ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS edicoes (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  numero          integer NOT NULL UNIQUE,
  descricao       text,
  data_sorteio    date,
  hora_sorteio    time DEFAULT '21:00:00',
  valor_unitario  numeric DEFAULT 10,
  total_cartelas  integer DEFAULT 100000,
  status          text DEFAULT 'rascunho' CHECK (status IN (
                    'rascunho','ativa','em_sorteio','encerrada'
                  )),
  premio_principal numeric DEFAULT 120000,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE edicoes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "public_read_edicoes" ON edicoes FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admin_all_edicoes" ON edicoes FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── PREMIOS_EDICAO ───────────────────────────────────────────
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

ALTER TABLE premios_edicao ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "admin_all_premios_edicao" ON premios_edicao FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "public_read_premios_ativos" ON premios_edicao
    FOR SELECT USING (ativo = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── DISTRIBUIDORES ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS distribuidores (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid REFERENCES auth.users(id) UNIQUE,
  nivel        integer DEFAULT 1 CHECK (nivel BETWEEN 1 AND 3),
  comissao_pct numeric DEFAULT 15,
  meta_mensal  integer,
  status       text DEFAULT 'ativo' CHECK (status IN ('ativo','suspenso','inativo')),
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_distribuidores_user_id ON distribuidores(user_id);

ALTER TABLE distribuidores ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "admin_all_distribuidores" ON distribuidores FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "distribuidor_own" ON distribuidores FOR SELECT USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── PONTOS_DE_VENDA ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pontos_de_venda (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  distribuidor_id  uuid REFERENCES distribuidores(id),
  user_id          uuid REFERENCES auth.users(id),
  nome             text NOT NULL,
  endereco         text,
  bairro           text,
  cidade           text,
  uf               text DEFAULT 'PE',
  lat              numeric,
  lng              numeric,
  telefone         text,
  status           text DEFAULT 'ativo' CHECK (status IN ('ativo','inativo','suspenso')),
  created_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pdv_distribuidor ON pontos_de_venda(distribuidor_id);

ALTER TABLE pontos_de_venda ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "pdvs_select" ON pontos_de_venda FOR SELECT USING (
    EXISTS (SELECT 1 FROM distribuidores d WHERE d.user_id = auth.uid() AND d.id = pontos_de_venda.distribuidor_id)
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admin_all_pdvs" ON pontos_de_venda FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── MOTOBOYS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS motoboys (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  distribuidor_id  uuid REFERENCES distribuidores(id),
  user_id          uuid REFERENCES auth.users(id),
  nome             text NOT NULL,
  telefone         text,
  status           text DEFAULT 'ativo' CHECK (status IN ('ativo','inativo')),
  created_at       timestamptz DEFAULT now()
);

ALTER TABLE motoboys ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "motoboys_select" ON motoboys FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM distribuidores WHERE id = motoboys.distribuidor_id)
    OR auth.uid() = motoboys.user_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "motoboys_insert" ON motoboys FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT user_id FROM distribuidores WHERE id = motoboys.distribuidor_id)
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "motoboys_update" ON motoboys FOR UPDATE USING (
    auth.uid() IN (SELECT user_id FROM distribuidores WHERE id = motoboys.distribuidor_id)
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── CARTELAS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cartelas (
  id                         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  edicao_id                  uuid REFERENCES edicoes(id),
  codigo                     text NOT NULL,
  dv                         text,
  serie                      text,
  status                     text DEFAULT 'em_estoque_distribuidor' CHECK (status IN (
                               'em_estoque_distribuidor','em_estoque_pdv',
                               'reservada','paga','vencedora','cancelada'
                             )),
  distribuidor_id            uuid REFERENCES distribuidores(id),
  pdv_id                     uuid REFERENCES pontos_de_venda(id),
  user_id                    uuid REFERENCES auth.users(id),
  giro_da_sorte              boolean DEFAULT false,
  dezenas_sorteio_1          jsonb,
  cpf_comprador              varchar,
  nome_comprador             varchar,
  telefone_comprador         varchar,
  data_nascimento_comprador  date,
  reservada_ate              timestamptz,
  pix_id                     varchar,
  created_at                 timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cartelas_edicao ON cartelas(edicao_id);
CREATE INDEX IF NOT EXISTS idx_cartelas_status ON cartelas(status);
CREATE INDEX IF NOT EXISTS idx_cartelas_distribuidor ON cartelas(distribuidor_id);
CREATE INDEX IF NOT EXISTS idx_cartelas_pdv ON cartelas(pdv_id);
CREATE INDEX IF NOT EXISTS idx_cartelas_cpf_comprador ON cartelas(cpf_comprador);
CREATE INDEX IF NOT EXISTS idx_cartelas_pix_id ON cartelas(pix_id);

ALTER TABLE cartelas ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "admin_all_cartelas" ON cartelas FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "distribuidor_own_cartelas" ON cartelas FOR SELECT USING (
    distribuidor_id IN (SELECT id FROM distribuidores WHERE user_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "pdv_own_cartelas" ON cartelas FOR SELECT USING (
    pdv_id IN (SELECT id FROM pontos_de_venda WHERE user_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "cliente_own_cartelas" ON cartelas FOR SELECT USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── MOVIMENTACOES_ESTOQUE ────────────────────────────────────
CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  cartela_id  uuid REFERENCES cartelas(id),
  de_tipo     text,
  de_id       uuid,
  para_tipo   text,
  para_id     uuid,
  observacao  text,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mov_cartela ON movimentacoes_estoque(cartela_id);

ALTER TABLE movimentacoes_estoque ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "admin_all_movimentacoes" ON movimentacoes_estoque FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── SORTEIOS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sorteios (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  edicao_id        uuid REFERENCES edicoes(id),
  numero_sorteio   integer DEFAULT 1,
  status           text DEFAULT 'pendente' CHECK (status IN ('pendente','em_andamento','realizado')),
  cartela_vencedora uuid REFERENCES cartelas(id),
  dezenas_sorteadas jsonb,
  realizado_em     timestamptz,
  premio_id        uuid REFERENCES premios_edicao(id),
  arte_url         text,
  banner_url       text,
  created_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sorteios_edicao_status ON sorteios(edicao_id, status);

ALTER TABLE sorteios ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "historico_public_select" ON sorteios
    FOR SELECT USING (status = 'realizado' OR auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admin_all_sorteios" ON sorteios FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── GANHADORES ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ganhadores (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sorteio_id     uuid REFERENCES sorteios(id),
  cartela_id     uuid REFERENCES cartelas(id),
  edicao_id      uuid REFERENCES edicoes(id),
  nome_ganhador  text,
  numero_titulo  text,
  pdv_nome       text,
  premio_nome    text,
  premio_valor   numeric,
  pago           boolean DEFAULT false,
  pago_em        timestamptz,
  created_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ganhadores_sorteio ON ganhadores(sorteio_id);
CREATE INDEX IF NOT EXISTS idx_ganhadores_edicao ON ganhadores(edicao_id);

ALTER TABLE ganhadores ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "ganhadores_public_select" ON ganhadores FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admin_all_ganhadores" ON ganhadores FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── SORTEIO_SNAPSHOTS ────────────────────────────────────────
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

ALTER TABLE sorteio_snapshots ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "admins_all_snapshots" ON sorteio_snapshots FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "publico_read_snapshots" ON sorteio_snapshots FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── ROTAS_ENTREGA ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rotas_entrega (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  distribuidor_id  uuid REFERENCES distribuidores(id),
  motoboy_id       uuid REFERENCES motoboys(id),
  data_entrega     date DEFAULT CURRENT_DATE,
  status           text DEFAULT 'pendente' CHECK (status IN ('pendente','em_andamento','concluida','cancelada')),
  observacao       text,
  created_at       timestamptz DEFAULT now()
);

ALTER TABLE rotas_entrega ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "rotas_select" ON rotas_entrega FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM distribuidores WHERE id = rotas_entrega.distribuidor_id)
    OR auth.uid() IN (SELECT user_id FROM motoboys WHERE id = rotas_entrega.motoboy_id)
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "rotas_insert" ON rotas_entrega FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT user_id FROM distribuidores WHERE id = rotas_entrega.distribuidor_id)
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "rotas_update" ON rotas_entrega FOR UPDATE USING (
    auth.uid() IN (SELECT user_id FROM distribuidores WHERE id = rotas_entrega.distribuidor_id)
    OR auth.uid() IN (SELECT user_id FROM motoboys WHERE id = rotas_entrega.motoboy_id)
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── PARADAS_ROTA ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS paradas_rota (
  id        uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  rota_id   uuid REFERENCES rotas_entrega(id) ON DELETE CASCADE,
  pdv_id    uuid REFERENCES pontos_de_venda(id),
  ordem     integer DEFAULT 0,
  status    text DEFAULT 'pendente' CHECK (status IN ('pendente','entregue','pulada')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE paradas_rota ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "paradas_select" ON paradas_rota FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM rotas_entrega r JOIN distribuidores d ON d.id = r.distribuidor_id
      WHERE r.id = paradas_rota.rota_id AND d.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM rotas_entrega r JOIN motoboys m ON m.id = r.motoboy_id
      WHERE r.id = paradas_rota.rota_id AND m.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "paradas_insert" ON paradas_rota FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM rotas_entrega r JOIN distribuidores d ON d.id = r.distribuidor_id
      WHERE r.id = paradas_rota.rota_id AND d.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "paradas_update" ON paradas_rota FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM rotas_entrega r JOIN distribuidores d ON d.id = r.distribuidor_id
      WHERE r.id = paradas_rota.rota_id AND d.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM rotas_entrega r JOIN motoboys m ON m.id = r.motoboy_id
      WHERE r.id = paradas_rota.rota_id AND m.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── LOGS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS logs (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo          text NOT NULL CHECK (tipo IN (
                  'auth','sorteio','pagamento','ganhador',
                  'cartela','usuario','sistema','erro'
                )),
  nivel         text DEFAULT 'info' CHECK (nivel IN ('info','aviso','erro','critico')),
  acao          text NOT NULL,
  descricao     text,
  usuario_id    uuid REFERENCES auth.users(id),
  usuario_nome  text,
  usuario_role  text,
  ip            text,
  metadata      jsonb,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_logs_tipo ON logs(tipo);
CREATE INDEX IF NOT EXISTS idx_logs_nivel ON logs(nivel);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_usuario_id ON logs(usuario_id);

ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "admin_full_logs" ON logs FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE logs;

-- ── DEPOIMENTOS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS depoimentos (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       text NOT NULL,
  cidade     text NOT NULL DEFAULT 'Recife, PE',
  premio     text NOT NULL,
  sorteio    text NOT NULL,
  depoimento text NOT NULL,
  foto_url   text,
  ativo      boolean NOT NULL DEFAULT true,
  ordem      integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE depoimentos ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "admin_all_depoimentos" ON depoimentos FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','operador_sorteio'))
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "public_select_depoimentos" ON depoimentos FOR SELECT USING (ativo = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_depoimentos_ativo_ordem ON depoimentos(ativo, ordem);

-- ── USUARIOS_SISTEMA ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios_sistema (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid REFERENCES auth.users(id) UNIQUE,
  nome         text NOT NULL,
  email        text NOT NULL UNIQUE,
  role         text NOT NULL CHECK (role IN (
                 'operador_sorteio','financeiro','suporte',
                 'admin','distribuidor','pdv','motoboy','cliente'
               )),
  ativo        boolean DEFAULT true,
  criado_por   uuid REFERENCES auth.users(id),
  ultimo_acesso timestamptz,
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usuarios_sistema_role ON usuarios_sistema(role);
CREATE INDEX IF NOT EXISTS idx_usuarios_sistema_ativo ON usuarios_sistema(ativo);

ALTER TABLE usuarios_sistema ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "admin_full_usuarios_sistema" ON usuarios_sistema FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── CLIENTES_WHITELABEL ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS clientes_whitelabel (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome                 text NOT NULL,
  dominio              text NOT NULL UNIQUE,
  dominio_staging      text,
  supabase_url         text,
  supabase_project_id  text,
  vercel_project_id    text,
  plano                text DEFAULT 'basico' CHECK (plano IN ('basico','intermediario','completo')),
  status               text DEFAULT 'trial' CHECK (status IN ('trial','ativo','suspenso','cancelado')),
  admin_email          text,
  admin_nome           text,
  data_inicio          date DEFAULT CURRENT_DATE,
  data_vencimento      date,
  valor_mensal         numeric DEFAULT 0,
  observacoes          text,
  cor_primaria         text DEFAULT '#2E7D32',
  cor_secundaria       text DEFAULT '#FFC107',
  logo_url             text,
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);

ALTER TABLE clientes_whitelabel ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "apenas_admin" ON clientes_whitelabel FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Cliente de referência (Recife Cap)
INSERT INTO clientes_whitelabel (nome, dominio, dominio_staging, supabase_project_id, plano, status, admin_email, valor_mensal, cor_primaria, cor_secundaria)
VALUES ('Recife Cap', 'recifecap.com.br', 'staging.recifecap.com.br', 'stnewtoijeokpygistmk', 'completo', 'ativo', 'admin@recifecap.com.br', 0, '#2E7D32', '#FFC107')
ON CONFLICT (dominio) DO NOTHING;

-- ── STORAGE ──────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('midias', 'midias', true)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  CREATE POLICY "public_read_midias" ON storage.objects
    FOR SELECT USING (bucket_id = 'midias');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admin_upload_midias" ON storage.objects
    FOR INSERT WITH CHECK (
      bucket_id = 'midias'
      AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admin_delete_midias" ON storage.objects
    FOR DELETE USING (
      bucket_id = 'midias'
      AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── ÍNDICES EXTRAS ───────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sorteios_edicao ON sorteios(edicao_id);
CREATE INDEX IF NOT EXISTS idx_edicoes_status ON edicoes(status);
CREATE INDEX IF NOT EXISTS idx_premios_edicao_ativo ON premios_edicao(edicao_id, ativo);
CREATE INDEX IF NOT EXISTS idx_ganhadores_edicao2 ON ganhadores(edicao_id);
