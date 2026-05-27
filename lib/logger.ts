import { createClient } from '@supabase/supabase-js'

function adminSB() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function log(params: {
  tipo: 'auth' | 'sorteio' | 'pagamento' | 'ganhador' | 'cartela' | 'usuario' | 'sistema' | 'erro'
  nivel?: 'info' | 'aviso' | 'erro' | 'critico'
  acao: string
  descricao?: string
  metadata?: Record<string, unknown>
  usuario_id?: string
  usuario_nome?: string
  usuario_role?: string
  ip?: string
}) {
  try {
    const sb = adminSB()
    await sb.from('logs').insert({ ...params, nivel: params.nivel ?? 'info' })
  } catch (e) {
    console.error('[logger] Erro ao gravar log:', e)
  }
}

export const logAuth     = (acao: string, meta?: Record<string, unknown>) => log({ tipo: 'auth',     acao, metadata: meta })
export const logSorteio  = (acao: string, meta?: Record<string, unknown>) => log({ tipo: 'sorteio',  acao, metadata: meta })
export const logPagamento = (acao: string, meta?: Record<string, unknown>) => log({ tipo: 'pagamento', acao, metadata: meta })
export const logGanhador  = (acao: string, meta?: Record<string, unknown>) => log({ tipo: 'ganhador',  acao, metadata: meta })
export const logErro      = (acao: string, erro: unknown) => log({ tipo: 'erro', nivel: 'erro', acao, metadata: { erro: String(erro) } })
