import { createClient } from '@/lib/supabase/server'

async function getStats(supabase: Awaited<ReturnType<typeof createClient>>) {
  const [distribuidores, pdvs, edicaoAtiva, vendasMes] = await Promise.all([
    supabase.from('distribuidores').select('id, status'),
    supabase.from('pontos_de_venda').select('id, status'),
    supabase.from('edicoes').select('*').eq('status', 'ativa').single(),
    supabase.from('vendas')
      .select('valor, status_pagamento')
      .eq('status_pagamento', 'confirmado')
      .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
  ])

  const totalFaturamento = vendasMes.data?.reduce((acc, v) => acc + Number(v.valor), 0) ?? 0
  const totalVendas = vendasMes.data?.length ?? 0

  return {
    distribuidores: distribuidores.data ?? [],
    pdvs: pdvs.data ?? [],
    edicaoAtiva: edicaoAtiva.data,
    totalFaturamento,
    totalVendas,
  }
}

export default async function AdminDashboard() {
  const supabase = await createClient()
  const stats = await getStats(supabase)

  const distAtivos = stats.distribuidores.filter(d => d.status === 'ativo').length
  const pdvsAtivos = stats.pdvs.filter(p => p.status === 'ativo').length

  const cards = [
    {
      label: 'Faturamento do mês',
      value: stats.totalFaturamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      sub: `${stats.totalVendas} cartelas vendidas`,
      color: 'emerald',
    },
    {
      label: 'Distribuidores ativos',
      value: distAtivos,
      sub: `${stats.distribuidores.length} cadastrados`,
      color: 'blue',
    },
    {
      label: 'PDVs ativos',
      value: pdvsAtivos,
      sub: `${stats.pdvs.length} cadastrados`,
      color: 'violet',
    },
    {
      label: 'Edição atual',
      value: stats.edicaoAtiva ? `Nº ${stats.edicaoAtiva.numero}` : '—',
      sub: stats.edicaoAtiva
        ? new Date(stats.edicaoAtiva.data_sorteio).toLocaleDateString('pt-BR')
        : 'Nenhuma ativa',
      color: 'amber',
    },
  ]

  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-700',
    blue:    'bg-blue-50 text-blue-700',
    violet:  'bg-violet-50 text-violet-700',
    amber:   'bg-amber-50 text-amber-700',
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Painel do administrador</h1>
        <p className="text-sm text-gray-500 mt-1">Visão geral de toda a operação</p>
      </div>

      {/* Cards de métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map(card => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs text-gray-500 mb-2">{card.label}</p>
            <p className={`text-2xl font-semibold mb-1 ${colorMap[card.color].split(' ')[1]}`}>
              {card.value}
            </p>
            <p className="text-xs text-gray-400">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Edição ativa */}
      {stats.edicaoAtiva && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-sm font-medium text-gray-900 mb-4">Edição ativa — Nº {stats.edicaoAtiva.numero}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
            <div>
              <p className="text-gray-500 mb-1">Data do sorteio</p>
              <p className="font-medium text-gray-900">
                {new Date(stats.edicaoAtiva.data_sorteio).toLocaleDateString('pt-BR')} às {stats.edicaoAtiva.hora_sorteio}
              </p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Valor unitário</p>
              <p className="font-medium text-gray-900">
                {Number(stats.edicaoAtiva.valor_unitario).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Total do lote</p>
              <p className="font-medium text-gray-900">
                {stats.edicaoAtiva.total_cartelas.toLocaleString('pt-BR')} cartelas
              </p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Prêmio principal</p>
              <p className="font-medium text-emerald-600">
                {Number(stats.edicaoAtiva.premio_principal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Ações rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: 'Cadastrar distribuidor', href: '/admin/distribuidores/novo', desc: 'Adicionar novo distribuidor ao sistema' },
          { label: 'Nova edição', href: '/admin/edicoes/nova', desc: 'Criar lote de cartelas para sorteio' },
          { label: 'Ver relatórios', href: '/admin/relatorios', desc: 'Faturamento, comissões e vendas' },
        ].map(action => (
          <a
            key={action.href}
            href={action.href}
            className="bg-white rounded-xl border border-gray-200 p-5 hover:border-emerald-300 hover:shadow-sm transition group"
          >
            <p className="text-sm font-medium text-gray-900 group-hover:text-emerald-600 transition mb-1">
              {action.label}
            </p>
            <p className="text-xs text-gray-400">{action.desc}</p>
          </a>
        ))}
      </div>
    </div>
  )
}
