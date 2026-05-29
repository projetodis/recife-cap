import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  TrendingUp, Clock, DollarSign, Store, AlertCircle,
  CheckCircle, Target, LayoutGrid, Bike, Package, Route,
  BarChart2,
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

  const comissaoPendente  = comissoes?.filter(c => c.status === 'pendente')
    .reduce((acc, c) => acc + Number(c.valor), 0) ?? 0
  const comissaoPaga      = comissoes?.filter(c => c.status === 'pago')
    .reduce((acc, c) => acc + Number(c.valor), 0) ?? 0
  const comissaoMes       = comissoes?.filter(c => c.created_at >= inicioMes && c.status === 'pendente')
    .reduce((acc, c) => acc + Number(c.valor), 0) ?? 0

  const totalCartelas    = cartelas?.length ?? 0
  const cartelasVendidas = cartelas?.filter(c => c.status === 'paga').length ?? 0
  const cartelasComDist  = cartelas?.filter(c => c.status === 'em_estoque_distribuidor').length ?? 0
  const cartelasNoPDV    = cartelas?.filter(c => c.status === 'em_estoque_pdv').length ?? 0

  const metaMensal = dist.meta_mensal ?? 0

  // Aliases para o novo JSX
  const chavePix        = profile?.chave_pix
  const comissaoRecebida = comissaoPaga
  const cartelasComigo   = cartelasComDist

  function fmt(v: number) {
    return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Painel do distribuidor</h1>
          <p className="text-sm text-gray-500 mt-0.5">Bem-vindo, {profile?.nome || 'Distribuidor'}</p>
        </div>
        {!chavePix ? (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
            style={{ background: '#FFF8E1', color: '#B45309' }}>
            <AlertCircle size={16} />
            PIX não cadastrado
          </div>
        ) : (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
            style={{ background: '#E8F5E9', color: '#2E7D32' }}>
            <CheckCircle size={16} />
            PIX cadastrado
          </div>
        )}
      </div>

      {/* ALERTA PIX */}
      {!chavePix && (
        <div className="flex items-center justify-between p-4 rounded-2xl border-l-4"
          style={{ background: '#FFF8E1', borderLeftColor: '#FFC107' }}>
          <div className="flex items-center gap-3">
            <AlertCircle size={18} style={{ color: '#F59E0B' }} />
            <p className="text-sm font-medium text-yellow-800">
              Cadastre sua chave PIX para receber comissões.
            </p>
          </div>
          <a href="/distribuidor/perfil"
            className="text-sm font-bold hover:underline"
            style={{ color: '#2E7D32' }}>
            Atualizar perfil &rarr;
          </a>
        </div>
      )}

      {/* STAT CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Faturamento do mês',
            valor: `R$ ${fmt(faturamentoMes)}`,
            sub: `Total: R$ ${fmt(faturamentoTotal)}`,
            icon: TrendingUp, cor: '#2E7D32', bg: '#E8F5E9',
          },
          {
            label: 'Comissão pendente',
            valor: `R$ ${fmt(comissaoPendente)}`,
            sub: `Este mês: R$ ${fmt(comissaoMes)}`,
            icon: Clock, cor: '#F59E0B', bg: '#FFF8E1',
          },
          {
            label: 'Comissão recebida',
            valor: `R$ ${fmt(comissaoRecebida)}`,
            sub: `${dist.comissao_pct ?? 15}% sobre vendas`,
            icon: DollarSign, cor: '#1565C0', bg: '#E3F2FD',
          },
          {
            label: 'Meus PDVs',
            valor: pdvs?.length || 0,
            sub: `${pdvs?.length || 0} cadastrados`,
            icon: Store, cor: '#2E7D32', bg: '#E8F5E9',
          },
        ].map(({ label, valor, sub, icon: Icon, cor, bg }) => (
          <div key={label} className="bg-white rounded-2xl border p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: bg }}>
                <Icon size={20} style={{ color: cor }} />
              </div>
              <p className="text-xs text-gray-500 uppercase tracking-wider leading-tight">{label}</p>
            </div>
            <p className="font-black text-xl text-gray-900">{valor}</p>
            <p className="text-xs text-gray-400 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* META MENSAL */}
      {metaMensal > 0 && (
        <div className="bg-white rounded-2xl border p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target size={16} style={{ color: '#2E7D32' }} />
              <span className="font-bold text-gray-700 text-sm">Meta mensal</span>
            </div>
            <span className="text-sm font-black" style={{ color: '#2E7D32' }}>
              {Math.min(100, Math.round((faturamentoMes / metaMensal) * 100))}%
            </span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(100, (faturamentoMes / metaMensal) * 100)}%`,
                background: 'linear-gradient(90deg, #2E7D32, #66BB6A)',
              }} />
          </div>
          <p className="text-xs text-gray-400 mt-2">
            R$ {fmt(faturamentoMes)} de R$ {fmt(metaMensal)}
          </p>
        </div>
      )}

      {/* CARDS MEIO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Cartelas */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between"
            style={{ background: 'rgba(46,125,50,0.04)' }}>
            <h3 className="font-bold text-gray-700 text-sm flex items-center gap-2">
              <LayoutGrid size={16} style={{ color: '#2E7D32' }} /> Cartelas
            </h3>
            <a href="/distribuidor/cartelas"
              className="text-xs font-bold" style={{ color: '#2E7D32' }}>
              Gerenciar &rarr;
            </a>
          </div>
          <div className="divide-y divide-gray-50">
            {[
              { label: 'Total recebidas', valor: totalCartelas,    cor: 'text-gray-800' },
              { label: 'Vendidas',        valor: cartelasVendidas, cor: 'text-green-600' },
              { label: 'Nos PDVs',        valor: cartelasNoPDV,    cor: 'text-blue-600' },
              { label: 'Comigo',          valor: cartelasComigo,   cor: 'text-yellow-600' },
            ].map(({ label, valor, cor }) => (
              <div key={label} className="flex items-center justify-between px-5 py-3">
                <span className="text-sm text-gray-600">{label}</span>
                <span className={`font-black text-sm ${cor}`}>{valor}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Meus PDVs */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between"
            style={{ background: 'rgba(46,125,50,0.04)' }}>
            <h3 className="font-bold text-gray-700 text-sm flex items-center gap-2">
              <Store size={16} style={{ color: '#2E7D32' }} /> Meus PDVs
            </h3>
            <a href="/distribuidor/pdvs/novo"
              className="text-xs font-bold" style={{ color: '#2E7D32' }}>
              + Novo
            </a>
          </div>
          <div className="divide-y divide-gray-50">
            {pdvs?.slice(0, 4).map((pdv: any) => (
              <div key={pdv.id} className="flex items-center justify-between px-5 py-3">
                <p className="text-sm font-bold text-gray-800 truncate">{pdv.nome}</p>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold flex-shrink-0 ml-2"
                  style={{ background: '#E8F5E9', color: '#2E7D32' }}>
                  Ativo
                </span>
              </div>
            ))}
            {!pdvs?.length && (
              <p className="px-5 py-3 text-xs text-gray-400">Nenhum PDV cadastrado</p>
            )}
          </div>
          <div className="px-5 py-3 border-t">
            <a href="/distribuidor/pdvs"
              className="text-xs font-bold" style={{ color: '#2E7D32' }}>
              Ver todos &rarr;
            </a>
          </div>
        </div>

        {/* Motoboys */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between"
            style={{ background: 'rgba(46,125,50,0.04)' }}>
            <h3 className="font-bold text-gray-700 text-sm flex items-center gap-2">
              <Bike size={16} style={{ color: '#2E7D32' }} /> Motoboys
            </h3>
            <a href="/distribuidor/motoboys/novo"
              className="text-xs font-bold" style={{ color: '#2E7D32' }}>
              + Novo
            </a>
          </div>
          <div className="divide-y divide-gray-50">
            {motoboys?.slice(0, 4).map((mb: any) => (
              <div key={mb.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0"
                    style={{ background: '#2E7D32' }}>
                    {mb.nome?.charAt(0)?.toUpperCase()}
                  </div>
                  <p className="text-sm font-bold text-gray-800 truncate">{mb.nome}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold flex-shrink-0 ml-2"
                  style={{ background: '#E8F5E9', color: '#2E7D32' }}>
                  Ativo
                </span>
              </div>
            ))}
            {!motoboys?.length && (
              <p className="px-5 py-3 text-xs text-gray-400">Nenhum motoboy cadastrado</p>
            )}
          </div>
          <div className="px-5 py-3 border-t">
            <a href="/distribuidor/motoboys"
              className="text-xs font-bold" style={{ color: '#2E7D32' }}>
              Criar rota de entrega &rarr;
            </a>
          </div>
        </div>
      </div>

      {/* AÇÕES RÁPIDAS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Cadastrar PDV',  href: '/distribuidor/pdvs/novo',  icon: Store },
          { label: 'Enviar cartelas', href: '/distribuidor/cartelas',  icon: Package },
          { label: 'Criar rota',     href: '/distribuidor/rotas/nova', icon: Route },
          { label: 'Ver relatórios', href: '/distribuidor/relatorios', icon: BarChart2 },
        ].map(({ label, href, icon: Icon }) => (
          <a key={label} href={href}
            className="bg-white rounded-2xl border p-5 shadow-sm flex flex-col items-center justify-center gap-3 text-center transition-all hover:shadow-md hover:border-green-200 group">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110"
              style={{ background: '#E8F5E9' }}>
              <Icon size={22} style={{ color: '#2E7D32' }} />
            </div>
            <p className="text-sm font-bold text-gray-700">{label}</p>
          </a>
        ))}
      </div>

    </div>
  )
}
