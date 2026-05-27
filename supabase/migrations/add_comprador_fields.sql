-- Campos do comprador e controle de reserva/PIX na tabela cartelas
-- Executar no Supabase SQL Editor ou via CLI: supabase db push

ALTER TABLE cartelas ADD COLUMN IF NOT EXISTS cpf_comprador        varchar;
ALTER TABLE cartelas ADD COLUMN IF NOT EXISTS nome_comprador        varchar;
ALTER TABLE cartelas ADD COLUMN IF NOT EXISTS telefone_comprador    varchar;
ALTER TABLE cartelas ADD COLUMN IF NOT EXISTS data_nascimento_comprador date;
ALTER TABLE cartelas ADD COLUMN IF NOT EXISTS reservada_ate         timestamptz;
ALTER TABLE cartelas ADD COLUMN IF NOT EXISTS pix_id               varchar;

-- Índice para busca por CPF e por pix_id
CREATE INDEX IF NOT EXISTS idx_cartelas_cpf_comprador ON cartelas (cpf_comprador);
CREATE INDEX IF NOT EXISTS idx_cartelas_pix_id        ON cartelas (pix_id);

-- Limpa reservas expiradas (pode ser chamado via cron no Supabase Edge Functions)
-- UPDATE cartelas
--   SET status = 'em_estoque_distribuidor',
--       cpf_comprador = NULL, nome_comprador = NULL,
--       telefone_comprador = NULL, data_nascimento_comprador = NULL,
--       reservada_ate = NULL, pix_id = NULL
-- WHERE status = 'reservada' AND reservada_ate < now();
