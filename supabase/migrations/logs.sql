CREATE TABLE IF NOT EXISTS logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo text NOT NULL CHECK (tipo IN (
    'auth', 'sorteio', 'pagamento', 'ganhador',
    'cartela', 'usuario', 'sistema', 'erro'
  )),
  nivel text DEFAULT 'info' CHECK (nivel IN ('info', 'aviso', 'erro', 'critico')),
  acao text NOT NULL,
  descricao text,
  usuario_id uuid REFERENCES auth.users(id),
  usuario_nome text,
  usuario_role text,
  ip text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_logs_tipo ON logs(tipo);
CREATE INDEX IF NOT EXISTS idx_logs_nivel ON logs(nivel);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_usuario_id ON logs(usuario_id);

ALTER TABLE logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_full_logs" ON logs FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

ALTER PUBLICATION supabase_realtime ADD TABLE logs;
