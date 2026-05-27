import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DistribuidorDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()

  const { data: dist } = await supabase
    .from('distribuidores').select('*').eq('user_id', user.id).single()

  if (!dist) redirect('/login')

  // PDVs
  const { data: pdvs } = await supabase
    .from('pontos_de_venda').select('id, nome, status').eq('distribuidor_id', dist.id)

  // Cartelas
  const { data: cartelas } = await supabase
    .from('cartelas').select('status, edicao_id').eq('distribuidor_id', dist.id)

  // Vendas confirmadas
  const { data: vendas } = await supabase
    .from('vendas')
    .select('valor, created_at, status_pagamento')
    .in('pdv_id', pdvs?.map(p => p.id) ?? [])
    .eq('status_pagamento', 'confirmado')

  // Comissões
  const { data: comissoes } = await supabase
    .from('comissoes')
    .select('valor, status, created_at')
    .eq('beneficiario_id', dist.id)

  // Motoboys
  const { data: motoboys } = await supabase
    .from('motoboys').select('id, nome, status').eq('distribuidor_id', dist.id)

  // Cálculos
  const hoje = new Date()
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString()

  const vendasMes = vendas?.filter(v => v.created_at >= inicioMes) ?? []
  const faturamentoMes = vendasMes.reduce((acc, v) => acc + Number(v.valor), 0)
  const faturamentoTotal = vendas?.reduce((acc, v) => acc + Number(v.valor), 0) ?? 0

  const comissaoPendente = comissoes?.filter(c => c.status === 'pendente')
    .reduce((acc, c) => acc + Number(c.valor), 0) ?? 0
  const comissaoPaga = comissoes?.filter(c => c.status === 'pago')
    .reduce((acc, c) => acc + Number(c.valor), 0) ?? 0
  const comissaoMes = comissoes?.filter(c => c.created_at >= inicioMes && c.status === 'pendente')
    .reduce((acc, c) => acc + Number(c.valor), 0) ?? 0

  const totalCartelas = cartelas?.length ?? 0
  const cartelasVendidas = cartelas?.filter(c => c.status === 'paga').length ?? 0
  const cartelasComDist = cartelas?.filter(c => c.status === 'em_estoque_distribuidor').length ?? 0
  const cartelasNoPDV = cartelas?.filter(c => c.status === 'em_estoque_pdv').length ?? 0

  const pdvsAtivos = pdvs?.filter(p => p.status === 'ativo').length ?? 0
  const metaMensal = dist.meta_mensal ?? 0
  const progressoMeta = metaMensal > 0 ? Math.min(100, Math.round(faturamentoMes / metaMensal * 100)) : null

  const statusPix: Record<string, { label: string; color: string }> = {
    pendente:             { label: 'PIX não cadastrado', color: 'text-gray-500 bg-gray-100' },
    aguardando_validacao: { label: 'PIX aguardando validação', color: 'text-amber-700 bg-amber-50' },
    validado:             { label: 'PIX validado', color: 'text-emerald-700 bg-emerald-50' },
    rejeitado:            { label: 'PIX rejeitado', color: 'text-red-700 bg-red-50' },
  }
  const pixStatus = statusPix[profile?.status_pix ?? 'pendente']

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Painel do distribuidor</h1>
          <p className="text-sm text-gray-500 mt-1">Bem-vindo, {profile?.nome}</p>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${pixStatus.color}`}>
          {pixStatus.label}
        </span>
      </div>

      {/* Alerta PIX pendente */}
      {profile?.status_pix !== 'validado' && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-6 flex items-center justify-between">
          <p className="text-sm text-amber-700">
            ⚠️ Cadastre sua chave PIX para receber comissões.
          </p>
          <Link href="/distribuidor/perfil" className="text-xs font-medium text-amber-700 underline">
            Atualizar perfil →
          </Link>
        </div>
      )}

      {/* Cards financeiros */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Faturamento do mês', value: faturamentoMes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), sub: `Total: ${faturamentoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, color: 'text-gray-900' },
          { label: 'Comissão pendente',  value: comissaoPendente.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), sub: `Este mês: ${comissaoMes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, color: 'text-emerald-600' },
          { label: 'Comissão recebida',  value: comissaoPaga.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), sub: `${dist.comissao_pct}% sobre vendas`, color: 'text-blue-600' },
          { label: 'Meus PDVs',          value: pdvsAtivos, sub: `${pdvs?.length ?? 0} cadastrados`, color: 'text-gray-900' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs text-gray-500 mb-2">{c.label}</p>
            <p className={`text-2xl font-semibold mb-1 ${c.color}`}>{c.value}</p>
            <p className="text-xs text-gray-400">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Meta mensal */}
      {progressoMeta !== null && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm font-medium text-gray-900">Meta mensal</p>
            <p className="text-sm font-semibold text-gray-900">{progressoMeta}%</p>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${progressoMeta >= 100 ? 'bg-emerald-500' : progressoMeta >= 70 ? 'bg-blue-500' : 'bg-amber-400'}`}
              style={{ width: `${progressoMeta}%` }} />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1.5">
            <span>{faturamentoMes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} alcançado</span>
            <span>Meta: {metaMensal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Cartelas */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-medium text-gray-900 mb-4">Cartelas</h2>
          <div className="space-y-3">
            {[
              { label: 'Total recebidas', value: totalCartelas, color: 'text-gray-900' },
              { label: 'Vendidas',        value: cartelasVendidas, color: 'text-emerald-600' },
              { label: 'Nos PDVs',        value: cartelasNoPDV, color: 'text-blue-600' },
              { label: 'Comigo',          value: cartelasComDist, color: 'text-amber-600' },
            ].map(c => (
              <div key={c.label} className="flex justify-between text-sm">
                <span className="text-gray-500">{c.label}</span>
                <span className={`font-medium ${c.color}`}>{c.value.toLocaleString('pt-BR')}</span>
              </div>
            ))}
          </div>
          {totalCartelas > 0 && (
            <div className="mt-4">
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden flex">
                <div className="h-full bg-emerald-500" style={{ width: `${cartelasVendidas / totalCartelas * 100}%` }} />
                <div className="h-full bg-blue-400" style={{ width: `${cartelasNoPDV / totalCartelas * 100}%` }} />
                <div className="h-full bg-amber-400" style={{ width: `${cartelasComDist / totalCartelas * 100}%` }} />
              </div>
            </div>
          )}
          <Link href="/distribuidor/cartelas" className="block text-xs text-emerald-600 mt-3 hover:underline">
            Gerenciar cartelas →
          </Link>
        </div>

        {/* PDVs */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-medium text-gray-900">Meus PDVs</h2>
            <Link href="/distribuidor/pdvs/novo" className="text-xs text-emerald-600 hover:underline">+ Novo</Link>
          </div>
          {pdvs && pdvs.length > 0 ? (
            <div className="space-y-2">
              {pdvs.slice(0, 5).map(p => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 truncate">{p.nome}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    p.status === 'ativo' ? 'bg-emerald-50 text-emerald-700' :
                    p.status === 'sem_estoque' ? 'bg-amber-50 text-amber-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>{p.status === 'ativo' ? 'Ativo' : p.status === 'sem_estoque' ? 'Sem estoque' : 'Inativo'}</span>
                </div>
              ))}
              {(pdvs?.length ?? 0) > 5 && (
                <p className="text-xs text-gray-400">+{(pdvs?.length ?? 0) - 5} mais</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-400">Nenhum PDV cadastrado</p>
          )}
          <Link href="/distribuidor/pdvs" className="block text-xs text-emerald-600 mt-3 hover:underline">
            Ver todos →
          </Link>
        </div>

        {/* Motoboys */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-medium text-gray-900">Motoboys</h2>
            <Link href="/distribuidor/motoboys/novo" className="text-xs text-emerald-600 hover:underline">+ Novo</Link>
          </div>
          {motoboys && motoboys.length > 0 ? (
            <div className="space-y-2">
              {motoboys.map(m => (
                <div key={m.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">🛵 {m.nome}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    m.status === 'ativo' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                  }`}>{m.status === 'ativo' ? 'Ativo' : 'Inativo'}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400">Nenhum motoboy cadastrado</p>
          )}
          <Link href="/distribuidor/rotas/nova" className="block text-xs text-emerald-600 mt-3 hover:underline">
            Criar rota de entrega →
          </Link>
        </div>
      </div>

      {/* Ações rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Cadastrar PDV',      href: '/distribuidor/pdvs/novo',      icon: '🏪' },
          { label: 'Enviar cartelas',    href: '/distribuidor/cartelas',       icon: '📦' },
          { label: 'Criar rota',         href: '/distribuidor/rotas/nova',     icon: '🗺️' },
          { label: 'Ver relatórios',     href: '/distribuidor/relatorios',     icon: '📊' },
        ].map(a => (
          <Link key={a.href} href={a.href}
            className="bg-white rounded-xl border border-gray-200 p-4 hover:border-emerald-300 hover:shadow-sm transition text-center">
            <p className="text-2xl mb-2">{a.icon}</p>
            <p className="text-xs font-medium text-gray-700">{a.label}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
