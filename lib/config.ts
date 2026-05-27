import { createClient } from '@/lib/supabase/server'

export async function getConfig(chave: string): Promise<string> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('configuracoes')
      .select('valor')
      .eq('chave', chave)
      .single()
    return data?.valor || ''
  } catch {
    return ''
  }
}

export async function getConfigs(categoria?: string): Promise<Record<string, string>> {
  try {
    const supabase = await createClient()
    let query = supabase.from('configuracoes').select('chave, valor')
    if (categoria) query = (query as any).eq('categoria', categoria)
    const { data } = await query
    return Object.fromEntries((data || []).map((r: { chave: string; valor: string | null }) => [r.chave, r.valor || '']))
  } catch {
    return {}
  }
}
