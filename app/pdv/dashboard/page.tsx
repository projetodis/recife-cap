import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function PDVDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: pdv } = await supabase
    .from('pontos_de_venda')
    .select('*')
    .eq('responsavel_id', user.id)
    .single()

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const { data: vendasHoje } = await supabase
    .from('vendas')
    .select('valor, status_pagamento, cartela_id')
    .eq('pdv_id', pdv?.id)
    .gte('created_at', hoje.toISOString())

  const { data: cartelasEstoque } = await supabase
    .from('cartelas')
    .select('id')
    .eq('pdv_id', pdv?.id)
    .eq('status', 'em_estoque_pdv')

  const { data: ultimasVendas } = await supabase
    .from('vendas')
    .select('*, cartelas(codigo)')
    .eq('pdv_id', pdv?.id)
    .order('created_at', { ascending: false })
    .limit(8)

  const vendasConfirmadas = vendasHoje?.filter(v => v.status_pagamento === 'confirmado') ?? []
  const totalHoje = vendasConfirmadas.reduce((acc, v) => acc + Number(v.valor), 0)
  const aguardando = vendasHoje?.filter(v => v.status_pagamento === 'aguardando_confirmacao').length ?? 0

  const statusColor: Record<string, string> = {
    confirmado:             'bg-emerald-50 text-emerald-700',
    aguardando_confirmacao: 'bg-amber-50 text-amber-700',
    expirado:               'bg-red-50 text-red-700',
    cancelado:              'bg-gray-100 text-gray-500',
    pendente:               'bg-gray-100 text-gray-500',
  }
  const statusLabel: Record<string, string> = {
    confirmado:             'Confirmado',
    aguardando_confirmacao: 'Aguardando',
    expirado:               'Expirado',
    cancelado:              'Cancelado',
    pendente:               'Pendente',
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">{pdv?.nome ?? 'Meu PDV'}</h1>
        <p className="text-sm text-gray-500 mt-1">Responsável: {pdv?.responsavel_nome}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Vendas hoje', value: vendasConfirmadas.length, sub: totalHoje.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) },
          { label: 'Em estoque', value: cartelasEstoque?.length ?? 0, sub: 'cartelas disponíveis' },
          { label: 'Aguardando PIX', value: aguardando, sub: 'pendentes' },
          { label: 'Comissão hoje', value: (totalHoje * (pdv?.comissao_pct ?? 5) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), sub: `${pdv?.comissao_pct ?? 5}% das vendas` },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs text-gray-500 mb-2">{c.label}</p>
            <p className="text-2xl font-semibold text-gray-900 mb-1">{c.value}</p>
            <p className="text-xs text-gray-400">{c.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ação rápida */}
        <a
          href="/pdv/venda"
          className="bg-emerald-600 hover:bg-emerald-700 transition rounded-xl p-6 text-white flex flex-col justify-between"
        >
          <p className="text-lg font-semibold">Registrar venda</p>
          <p className="text-sm text-emerald-100 mt-1">Informar código da cartela e forma de pagamento</p>
          <p className="text-2xl mt-4">→</p>
        </a>

        {/* Últimas vendas */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-medium text-gray-900">Últimas vendas</h2>
          </div>
          {ultimasVendas && ultimasVendas.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs text-gray-400 font-medium px-6 py-3">Cartela</th>
                  <th className="text-left text-xs text-gray-400 font-medium px-6 py-3">Valor</th>
                  <th className="text-left text-xs text-gray-400 font-medium px-6 py-3">Pagamento</th>
                  <th className="text-left text-xs text-gray-400 font-medium px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {ultimasVendas.map((v: any) => (
                  <tr key={v.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-6 py-3 font-medium text-gray-900">{v.cartelas?.codigo ?? '—'}</td>
                    <td className="px-6 py-3 text-gray-600">{Number(v.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                    <td className="px-6 py-3 text-gray-600 capitalize">{v.forma_pagamento}</td>
                    <td className="px-6 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor[v.status_pagamento]}`}>
                        {statusLabel[v.status_pagamento]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="px-6 py-12 text-center">
              <p className="text-sm text-gray-400">Nenhuma venda registrada hoje.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
