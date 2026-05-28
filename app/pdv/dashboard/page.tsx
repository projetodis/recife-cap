import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardView from './DashboardView'

export default async function PDVDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: pdv } = await supabase
    .from('pontos_de_venda')
    .select('id, nome, responsavel_nome, comissao_pct, chave_pix')
    .eq('responsavel_id', user.id)
    .single()

  if (!pdv) redirect('/login')

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const [
    { data: vendasHoje },
    { data: vendasTotal },
    { count: cartelasEstoque },
    { count: cartelasVendidas },
    { data: ultimasVendas },
    { data: saques },
  ] = await Promise.all([
    supabase
      .from('vendas')
      .select('valor, status_pagamento')
      .eq('pdv_id', pdv.id)
      .gte('created_at', hoje.toISOString()),

    supabase
      .from('vendas')
      .select('valor, status_pagamento')
      .eq('pdv_id', pdv.id)
      .eq('status_pagamento', 'confirmado'),

    supabase
      .from('cartelas')
      .select('id', { count: 'exact', head: true })
      .eq('pdv_id', pdv.id)
      .eq('status', 'em_estoque_pdv'),

    supabase
      .from('cartelas')
      .select('id', { count: 'exact', head: true })
      .eq('pdv_id', pdv.id)
      .eq('status', 'paga'),

    supabase
      .from('vendas')
      .select('id, valor, status_pagamento, forma_pagamento, created_at, cartelas(codigo)')
      .eq('pdv_id', pdv.id)
      .order('created_at', { ascending: false })
      .limit(10),

    supabase
      .from('saques_pdv')
      .select('id, valor, chave_pix, status, created_at')
      .eq('pdv_id', pdv.id)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const confirmadosHoje = (vendasHoje ?? []).filter((v: any) => v.status_pagamento === 'confirmado')
  const totalHoje       = confirmadosHoje.reduce((s: number, v: any) => s + Number(v.valor), 0)
  const aguardandoHoje  = (vendasHoje ?? []).filter((v: any) => v.status_pagamento === 'aguardando_confirmacao').length
  const totalGeral      = (vendasTotal ?? []).reduce((s: number, v: any) => s + Number(v.valor), 0)
  const comissaoPct     = pdv.comissao_pct ?? 5
  const comissaoTotal   = totalGeral * comissaoPct / 100
  const saquesPendentes = (saques ?? []).filter((s: any) => s.status === 'pendente')
  const saquesRealizados = (saques ?? []).filter((s: any) => s.status === 'aprovado')
  const totalSacado     = saquesRealizados.reduce((s: number, v: any) => s + Number(v.valor), 0)
  const saldoDisponivel = Math.max(0, comissaoTotal - totalSacado)

  return (
    <DashboardView
      pdv={{ id: pdv.id, nome: pdv.nome, responsavel_nome: pdv.responsavel_nome, comissao_pct: comissaoPct, chave_pix: pdv.chave_pix ?? '' }}
      cards={{
        totalHoje,
        confirmadosHoje: confirmadosHoje.length,
        aguardandoHoje,
        estoqueCount:    cartelasEstoque ?? 0,
        vendidasCount:   cartelasVendidas ?? 0,
        comissaoTotal,
        saldoDisponivel,
      }}
      ultimasVendas={ultimasVendas ?? []}
      saques={saques ?? []}
      saquesPendentes={saquesPendentes.length}
    />
  )
}
