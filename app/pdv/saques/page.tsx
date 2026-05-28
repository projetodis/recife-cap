import { createClient } from '@/lib/supabase/server'
import SaquesView from './SaquesView'

export default async function SaquesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: pdv } = await supabase
    .from('pontos_de_venda')
    .select('id, nome, comissao_pct, email_responsavel')
    .eq('responsavel_id', user!.id)
    .single()

  const { data: cartelas } = await supabase
    .from('cartelas')
    .select('id, status, paga_em')
    .eq('pdv_id', pdv?.id)
    .eq('status', 'paga')

  const { data: configValor } = await supabase
    .from('configuracoes')
    .select('valor')
    .eq('chave', 'valor_titulo')
    .single()

  const valorTitulo   = parseFloat(configValor?.valor || '10')
  const totalVendidas = cartelas?.length || 0
  const comissaoPct   = pdv?.comissao_pct || 10
  const lucroTotal    = totalVendidas * valorTitulo * (comissaoPct / 100)

  const { data: saques } = await supabase
    .from('saques_pdv')
    .select('*')
    .eq('pdv_id', pdv?.id)
    .order('created_at', { ascending: false })

  const totalSacado = saques
    ?.filter(s => s.status === 'pago')
    .reduce((acc, s) => acc + Number(s.valor), 0) || 0

  const disponivelSaque = lucroTotal - totalSacado

  return (
    <SaquesView
      pdv={pdv}
      lucroTotal={lucroTotal}
      totalSacado={totalSacado}
      disponivelSaque={disponivelSaque}
      totalVendidas={totalVendidas}
      comissaoPct={comissaoPct}
      valorTitulo={valorTitulo}
      saques={saques || []}
      userId={user!.id}
    />
  )
}
