import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  AlertCircle, Store, Package, Route, BarChart2,
  TrendingUp, Bike, CheckCircle, Tag, Users,
} from 'lucide-react'

export default async function DistribuidorDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()

  const { data: dist } = await supabase
    .from('distribuidores').select('*').eq('user_id', user.id).single()

  if (!dist) redirect('/login')

  const { data: pdvs } = await supabase
    .from('pontos_de_venda').select('id, nome, status').eq('distribuidor_id', dist.id)

  const { data: cartelas } = await supabase
    .from('cartelas').select('status, edicao_id').eq('distribuidor_id', dist.id)

  const { data: vendas } = await supabase
    .from('vendas')
    .select('valor, created_at, status_pagamento')
    .in('pdv_id', pdvs?.map(p => p.id) ?? [])
    .eq('status_pagamento', 'confirmado')

  const { data: comissoes } = await supabase
    .from('comissoes')
    .select('valor, status, created_at')
    .eq('beneficiario_id', dist.id)

  const { data: motoboys } = await supabase
    .from('motoboys').select('id, nome, status').eq('distribuidor_id', dist.id)

  const hoje = new Date()
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString()

  const vendasMes        = vendas?.filter(v => v.created_at >= inicioMes) ?? []
  const faturamentoMes   = vendasMes.reduce((acc, v) => acc + Number(v.valor), 0)
  const faturamentoTotal = vendas?.reduce((acc, v) => acc + Number(v.valor), 0) ?? 0

  const comissaoPendente = comissoes?.filter(c => c.status === 'pendente')
    .reduce((acc, c) => acc + Number(c.valor), 0) ?? 0
  const comissaoPaga = comissoes?.filter(c => c.status === 'pago')
    .reduce((acc, c) => acc + Number(c.valor), 0) ?? 0
  const comissaoMes = comissoes?.filter(c => c.created_at >= inicioMes && c.status === 'pendente')
    .reduce((acc, c) => acc + Number(c.valor), 0) ?? 0

  const totalCartelas    = cartelas?.length ?? 0
  const cartelasVendidas = cartelas?.filter(c => c.status === 'paga').length ?? 0
  const cartelasComDist  = cartelas?.filter(c => c.status === 'em_estoque_distribuidor').length ?? 0
  const cartelasNoPDV    = cartelas?.filter(c => c.status === 'em_estoque_pdv').length ?? 0

  const pdvsAtivos   = pdvs?.filter(p => p.status === 'ativo').length ?? 0
  const metaMensal   = dist.meta_mensal ?? 0
  const progressoMeta = metaMensal > 0 ? Math.min(100, Math.round(faturamentoMes / metaMensal * 100)) : null

  const statusPix: Record<string, { label: string; bg: string; text: string }> = {
    pendente:             { label: 'PIX não cadastrado',       bg: '#F5F5F5',  text: '#6B7280' },
    aguardando_validacao: { label: 'PIX aguardando validação', bg: '#FFF8E1',  text: '#B45309' },
    validado:             { label: 'PIX validado',             bg: '#E8F5E9',  text: '#2E7D32' },
    rejeitado:            { label: 'PIX rejeitado',            bg: '#FEF2F2',  text: '#DC2626' },
  }
  const pixStatus = statusPix[profile?.status_pix ?? 'pendente']

  function moeda(v: number) {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  return (
    <div style={{ background: '#F5F7FA', minHeight: '100vh' }} className="p-1">

      {/* HEADER */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Painel do distribuidor</h1>
          <p className="text-sm text-gray-500 mt-0.5">Bem-vindo, {profile?.nome}</p>
        </div>
        <span
          className="text-xs font-medium px-3 py-1 rounded-full"
          style={{ background: pixStatus.bg, color: pixStatus.text }}
        >
          {pixStatus.label}
        </span>
      </div>

      {/* ALERTA PIX */}
      {profile?.status_pix !== 'validado' && (
        <div
          className="rounded-xl p-4 mb-6 flex items-center justify-between"
          style={{ background: '#FFF8E1', borderLeft: '4px solid #FFC107' }}
        >
          <div className="flex items-center gap-3">
            <AlertCircle size={18} style={{ color: '#F59E0B', flexShrink: 0 }} />
            <p className="text-sm text-amber-800">
              Cadastre sua chave PIX para receber comissões.
            </p>
          </div>
          <Link
            href="/distribuidor/perfil"
            className="text-xs font-semibold ml-4 whitespace-nowrap"
            style={{ color: '#2E7D32' }}
          >
            Atualizar perfil
          </Link>
        </div>
      )}

      {/* STATS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: 'Faturamento do mês',
            value: moeda(faturamentoMes),
            sub:   `Total: ${moeda(faturamentoTotal)}`,
            Icon:  TrendingUp,
          },
          {
            label: 'Comissão pendente',
            value: moeda(comissaoPendente),
            sub:   `Este mês: ${moeda(comissaoMes)}`,
            Icon:  AlertCircle,
          },
          {
            label: 'Comissão recebida',
            value: moeda(comissaoPaga),
            sub:   `${dist.comissao_pct ?? 0}% sobre vendas`,
            Icon:  CheckCircle,
          },
          {
            label: 'Meus PDVs',
            value: pdvsAtivos,
            sub:   `${pdvs?.length ?? 0} cadastrados`,
            Icon:  Store,
          },
        ].map(({ label, value, sub, Icon }) => (
          <div key={label} className="bg-white rounded-2xl border p-5" style={{ borderColor: '#E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#E8F5E9' }}>
                <Icon size={16} style={{ color: '#2E7D32' }} />
              </div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
            </div>
            <p className="text-2xl font-black text-gray-900 mb-0.5">{value}</p>
            <p className="text-xs text-gray-400">{sub}</p>
          </div>
        ))}
      </div>

      {/* META MENSAL */}
      {progressoMeta !== null && (
        <div className="bg-white rounded-2xl border p-5 mb-6" style={{ borderColor: '#E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm font-bold text-gray-700">Meta mensal</p>
            <p className="text-sm font-black" style={{ color: '#2E7D32' }}>{progressoMeta}%</p>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden" style={{ background: '#F3F4F6' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${progressoMeta}%`, background: 'linear-gradient(90deg, #1B5E20, #66BB6A)' }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1.5">
            <span>{moeda(faturamentoMes)} alcançado</span>
            <span>Meta: {moeda(metaMensal)}</span>
          </div>
        </div>
      )}

      {/* SEÇÃO MÉDIA: Cartelas + PDVs + Motoboys */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

        {/* Cartelas */}
        <div className="bg-white rounded-2xl border p-5" style={{ borderColor: '#E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Tag size={16} style={{ color: '#2E7D32' }} />
              <h2 className="text-sm font-bold text-gray-700">Cartelas</h2>
            </div>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Total recebidas', value: totalCartelas },
              { label: 'Vendidas',        value: cartelasVendidas },
              { label: 'Nos PDVs',        value: cartelasNoPDV },
              { label: 'Comigo',          value: cartelasComDist },
            ].map(c => (
              <div key={c.label} className="flex justify-between text-sm">
                <span className="text-gray-500">{c.label}</span>
                <span className="font-bold text-gray-800">{c.value.toLocaleString('pt-BR')}</span>
              </div>
            ))}
          </div>
          {totalCartelas > 0 && (
            <div className="mt-4">
              <div className="h-1.5 rounded-full overflow-hidden flex" style={{ background: '#F3F4F6' }}>
                <div className="h-full" style={{ width: `${cartelasVendidas / totalCartelas * 100}%`, background: '#2E7D32' }} />
                <div className="h-full" style={{ width: `${cartelasNoPDV / totalCartelas * 100}%`, background: '#FFC107' }} />
                <div className="h-full" style={{ width: `${cartelasComDist / totalCartelas * 100}%`, background: '#D1D5DB' }} />
              </div>
            </div>
          )}
          <Link href="/distribuidor/cartelas" className="block text-xs font-semibold mt-3" style={{ color: '#2E7D32' }}>
            Gerenciar cartelas
          </Link>
        </div>

        {/* PDVs */}
        <div className="bg-white rounded-2xl border p-5" style={{ borderColor: '#E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Store size={16} style={{ color: '#2E7D32' }} />
              <h2 className="text-sm font-bold text-gray-700">Meus PDVs</h2>
            </div>
            <Link href="/distribuidor/pdvs/novo" className="text-xs font-semibold" style={{ color: '#2E7D32' }}>
              + Novo
            </Link>
          </div>
          {pdvs && pdvs.length > 0 ? (
            <div className="space-y-2">
              {pdvs.slice(0, 5).map(p => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 truncate">{p.nome}</span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                    style={p.status === 'ativo'
                      ? { background: '#E8F5E9', color: '#2E7D32' }
                      : p.status === 'sem_estoque'
                      ? { background: '#FFF8E1', color: '#B45309' }
                      : { background: '#F5F5F5', color: '#6B7280' }
                    }
                  >
                    {p.status === 'ativo' ? 'Ativo' : p.status === 'sem_estoque' ? 'Sem estoque' : 'Inativo'}
                  </span>
                </div>
              ))}
              {(pdvs?.length ?? 0) > 5 && (
                <p className="text-xs text-gray-400">+{(pdvs?.length ?? 0) - 5} mais</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-400">Nenhum PDV cadastrado</p>
          )}
          <Link href="/distribuidor/pdvs" className="block text-xs font-semibold mt-3" style={{ color: '#2E7D32' }}>
            Ver todos
          </Link>
        </div>

        {/* Motoboys */}
        <div className="bg-white rounded-2xl border p-5" style={{ borderColor: '#E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Bike size={16} style={{ color: '#2E7D32' }} />
              <h2 className="text-sm font-bold text-gray-700">Motoboys</h2>
            </div>
            <Link href="/distribuidor/motoboys/novo" className="text-xs font-semibold" style={{ color: '#2E7D32' }}>
              + Novo
            </Link>
          </div>
          {motoboys && motoboys.length > 0 ? (
            <div className="space-y-2">
              {motoboys.map(m => (
                <div key={m.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                      style={{ background: '#E8F5E9', color: '#2E7D32' }}
                    >
                      {m.nome?.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-gray-700 truncate">{m.nome}</span>
                  </div>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                    style={m.status === 'ativo'
                      ? { background: '#E8F5E9', color: '#2E7D32' }
                      : { background: '#F5F5F5', color: '#6B7280' }
                    }
                  >
                    {m.status === 'ativo' ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400">Nenhum motoboy cadastrado</p>
          )}
          <Link href="/distribuidor/rotas/nova" className="block text-xs font-semibold mt-3" style={{ color: '#2E7D32' }}>
            Criar rota de entrega
          </Link>
        </div>
      </div>

      {/* AÇÕES RÁPIDAS */}
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Ações rápidas</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Cadastrar PDV',   href: '/distribuidor/pdvs/novo',      Icon: Store },
            { label: 'Enviar cartelas', href: '/distribuidor/cartelas',       Icon: Package },
            { label: 'Criar rota',      href: '/distribuidor/rotas/nova',     Icon: Route },
            { label: 'Ver relatórios',  href: '/distribuidor/relatorios',     Icon: BarChart2 },
          ].map(({ label, href, Icon }) => (
            <Link
              key={href}
              href={href}
              className="bg-white rounded-2xl border p-5 text-center transition-all hover:shadow-md group"
              style={{ borderColor: '#E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3 transition-colors group-hover:bg-[#2E7D32]"
                style={{ background: '#E8F5E9' }}
              >
                <Icon size={20} className="transition-colors" style={{ color: '#2E7D32' }} />
              </div>
              <p className="text-xs font-bold text-gray-700">{label}</p>
            </Link>
          ))}
        </div>
      </div>

    </div>
  )
}
