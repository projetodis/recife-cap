CREATE TABLE IF NOT EXISTS usuarios_sistema (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) UNIQUE,
  nome text NOT NULL,
  email text NOT NULL UNIQUE,
  role text NOT NULL CHECK (role IN (
    'operador_sorteio', 'financeiro', 'suporte',
    'admin', 'distribuidor', 'pdv', 'motoboy', 'cliente'
  )),
  ativo boolean DEFAULT true,
  criado_por uuid REFERENCES auth.users(id),
  ultimo_acesso timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usuarios_sistema_role ON usuarios_sistema(role);
CREATE INDEX IF NOT EXISTS idx_usuarios_sistema_ativo ON usuarios_sistema(ativo);

ALTER TABLE usuarios_sistema ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_full_usuarios_sistema" ON usuarios_sistema FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
