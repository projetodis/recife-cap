'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend, ResponsiveContainer,
} from 'recharts'
import {
  Ticket, DollarSign, Users, Store, TrendingUp, Award,
} from 'lucide-react'
import MetricCard  from '@/components/relatorios/MetricCard'
import TabelaRelatorio, { type ColumnDef } from '@/components/relatorios/TabelaRelatorio'
import FiltrosPeriodo from '@/components/relatorios/FiltrosPeriodo'

// ── Tipos ─────────────────────────────────────────────────────────────────────

type Aba = 'visao-geral' | 'distribuidores' | 'cartelas' | 'sorteios'

interface VisaoGeralData {
  cards: {
    total_cartelas: number
    total_vendidas: number
    receita_total: number
    comissoes_pagas: number
    pdvs_ativos: number
    distribuidores_ativos: number
  }
  vendas_por_mes: { mes: string; label: string; vendidas: number; receita: number }[]
  por_status: { status: string; label: string; total: number; cor: string }[]
}

interface DistribuidorRow {
  id: string; nome: string; nivel: number; comissao_pct: number; status: string
  pdvs_count: number; cartelas_enviadas: number; cartelas_vendidas: number
  conversao_pct: number; receita_gerada: number; comissao_devida: number
}

interface CartelaRow {
  edicao_id: string; numero: number; data_sorteio: string; status: string
  total_geradas: number; distribuidas: number; vendidas: number; devolvidas: number
  vendidas_pct: number; receita: number
}

interface SorteioRow {
  id: string; edicao_numero: number; data_sorteio: string; numero_sorteio: number
  dezenas_sorteadas: string[]; cartela_codigo: string; valor_premio: number
  status: string; realizado_em: string | null
}

// ── Formatadores ──────────────────────────────────────────────────────────────

function brl(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function n(v: number) {
  return v.toLocaleString('pt-BR')
}
function dataBR(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso + (iso.includes('T') ? '' : 'T00:00:00')).toLocaleDateString('pt-BR')
}

// ── Abas ──────────────────────────────────────────────────────────────────────

const ABAS: { key: Aba; label: string }[] = [
  { key: 'visao-geral',    label: 'Visão Geral' },
  { key: 'distribuidores', label: 'Distribuidores' },
  { key: 'cartelas',       label: 'Cartelas' },
  { key: 'sorteios',       label: 'Sorteios' },
]

// ── Custom tooltip do bar chart ───────────────────────────────────────────────
function TooltipVendas({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-medium text-gray-700 mb-1">{label}</p>
      <p className="text-[#1B1B8E]">Vendidas: {n(payload[0]?.value ?? 0)}</p>
      <p className="text-emerald-600">Receita: {brl(payload[1]?.value ?? 0)}</p>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function RelatoriosClient() {
  const [aba, setAba]           = useState<Aba>('visao-geral')
  const [periodo, setPeriodo]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [data, setData]         = useState<any>(null)
  const [loadingPDF, setLoadingPDF]     = useState(false)
  const [loadingExcel, setLoadingExcel] = useState(false)

  const buscarDados = useCallback(async (tipo: Aba, per: string) => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ tipo })
      if (per) params.set('periodo', per)
      const res = await fetch(`/api/relatorios/dados?${params}`)
      if (!res.ok) throw new Error(`Erro ${res.status}`)
      setData(await res.json())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    buscarDados(aba, periodo)
  }, [aba, periodo, buscarDados])

  // ── Export helpers ─────────────────────────────────────────────────────────

  async function exportarExcel() {
    setLoadingExcel(true)
    try {
      const params = new URLSearchParams({ tipo: aba })
      if (periodo) params.set('periodo', periodo)
      const res = await fetch(`/api/relatorios/excel?${params}`)
      if (!res.ok) throw new Error('Falha ao gerar Excel')
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `recife-cap-${aba}${periodo ? `-${periodo}` : ''}.xlsx`
      document.body.appendChild(a); a.click(); a.remove()
      URL.revokeObjectURL(url)
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erro ao exportar')
    } finally {
      setLoadingExcel(false)
    }
  }

  async function exportarPDF() {
    setLoadingPDF(true)
    try {
      const { rows, colunas } = buildPDFPayload()
      const labelPeriodo = periodo
        ? new Date(periodo + '-01T00:00:00')
            .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
        : ''
      const titulos: Record<Aba, string> = {
        'visao-geral':    'Visão Geral',
        'distribuidores': 'Relatório de Distribuidores',
        'cartelas':       'Relatório de Cartelas',
        'sorteios':       'Histórico de Sorteios',
      }
      const res = await fetch('/api/relatorios/pdf', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ tipo: aba, titulo: titulos[aba], periodo: labelPeriodo, rows, colunas }),
      })
      if (!res.ok) throw new Error('Falha ao gerar PDF')
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `recife-cap-${aba}${periodo ? `-${periodo}` : ''}.pdf`
      document.body.appendChild(a); a.click(); a.remove()
      URL.revokeObjectURL(url)
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erro ao exportar')
    } finally {
      setLoadingPDF(false)
    }
  }

  function buildPDFPayload(): { rows: Record<string, unknown>[]; colunas: string[] } {
    if (aba === 'distribuidores' && data?.distribuidores) {
      const colunas = ['Nome', 'PDVs', 'Enviadas', 'Vendidas', 'Conversão', 'Receita', 'Comissão', 'Status']
      const rows    = (data.distribuidores as DistribuidorRow[]).map(d => ({
        'Nome':      d.nome,
        'PDVs':      d.pdvs_count,
        'Enviadas':  d.cartelas_enviadas,
        'Vendidas':  d.cartelas_vendidas,
        'Conversão': `${d.conversao_pct}%`,
        'Receita':   brl(d.receita_gerada),
        'Comissão':  brl(d.comissao_devida),
        'Status':    d.status,
      }))
      return { rows, colunas }
    }
    if (aba === 'cartelas' && data?.edicoes) {
      const colunas = ['Edição', 'Data', 'Total', 'Vendidas', '% Vendidas', 'Receita']
      const rows    = (data.edicoes as CartelaRow[]).map(e => ({
        'Edição':    e.numero,
        'Data':      dataBR(e.data_sorteio),
        'Total':     e.total_geradas,
        'Vendidas':  e.vendidas,
        '% Vendidas': `${e.vendidas_pct}%`,
        'Receita':   brl(e.receita),
      }))
      return { rows, colunas }
    }
    if (aba === 'sorteios' && data?.sorteios) {
      const colunas = ['Edição', 'Data', 'Nº Sorteio', 'Dezenas', 'Cartela', 'Prêmio', 'Status']
      const rows    = (data.sorteios as SorteioRow[]).map(s => ({
        'Edição':    s.edicao_numero,
        'Data':      dataBR(s.data_sorteio),
        'Nº Sorteio': s.numero_sorteio,
        'Dezenas':   s.dezenas_sorteadas.join(', '),
        'Cartela':   s.cartela_codigo,
        'Prêmio':    brl(s.valor_premio),
        'Status':    s.status,
      }))
      return { rows, colunas }
    }
    // visão geral: cards resumidos
    const vg = data as VisaoGeralData | null
    const colunas = ['Métrica', 'Valor']
    const rows = vg?.cards ? [
      { 'Métrica': 'Total de cartelas',    'Valor': n(vg.cards.total_cartelas) },
      { 'Métrica': 'Cartelas vendidas',    'Valor': n(vg.cards.total_vendidas) },
      { 'Métrica': 'Receita total',        'Valor': brl(vg.cards.receita_total) },
      { 'Métrica': 'Comissões pagas',      'Valor': brl(vg.cards.comissoes_pagas) },
      { 'Métrica': 'PDVs ativos',          'Valor': n(vg.cards.pdvs_ativos) },
      { 'Métrica': 'Distribuidores ativos','Valor': n(vg.cards.distribuidores_ativos) },
    ] : []
    return { rows, colunas }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Cabeçalho */}
      <div className="mb-8">
        <h1 className="text-xl lg:text-2xl font-semibold text-gray-900">Relatórios</h1>
        <p className="text-sm text-gray-500 mt-1">Análise de vendas, distribuidores e sorteios</p>
      </div>

      {/* Barra de abas + filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          {ABAS.map(a => (
            <button
              key={a.key}
              onClick={() => setAba(a.key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                aba === a.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>

        <FiltrosPeriodo
          periodo={periodo}
          onPeriodoChange={setPeriodo}
          onExportarPDF={exportarPDF}
          onExportarExcel={exportarExcel}
          loadingPDF={loadingPDF}
          loadingExcel={loadingExcel}
        />
      </div>

      {/* Erro */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Conteúdo da aba */}
      {aba === 'visao-geral'    && <AbaVisaoGeral    data={data as VisaoGeralData | null}   loading={loading} />}
      {aba === 'distribuidores' && <AbaDistribuidores data={data?.distribuidores ?? []}     loading={loading} />}
      {aba === 'cartelas'       && <AbaCartelas       data={data?.edicoes ?? []}            loading={loading} />}
      {aba === 'sorteios'       && <AbaSorteios        data={data?.sorteios ?? []}           loading={loading} />}
    </div>
  )
}

// ── Aba: Visão Geral ──────────────────────────────────────────────────────────

function AbaVisaoGeral({ data, loading }: { data: VisaoGeralData | null; loading: boolean }) {
  const cards = data?.cards
  const CARDS = [
    { icon: <Ticket size={16} />,     label: 'Cartelas geradas',       value: n(cards?.total_cartelas ?? 0),     color: 'blue'   as const },
    { icon: <TrendingUp size={16} />, label: 'Cartelas vendidas',       value: n(cards?.total_vendidas ?? 0),     color: 'green'  as const },
    { icon: <DollarSign size={16} />, label: 'Receita total',           value: brl(cards?.receita_total ?? 0),   color: 'green'  as const },
    { icon: <Award size={16} />,      label: 'Comissões pagas',         value: brl(cards?.comissoes_pagas ?? 0), color: 'amber'  as const },
    { icon: <Store size={16} />,      label: 'PDVs ativos',             value: n(cards?.pdvs_ativos ?? 0),       color: 'violet' as const },
    { icon: <Users size={16} />,      label: 'Distribuidores ativos',   value: n(cards?.distribuidores_ativos ?? 0), color: 'rose' as const },
  ]

  return (
    <div className="space-y-6">
      {/* Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {CARDS.map(c => (
          <MetricCard key={c.label} {...c} loading={loading} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de barras — vendas por mês */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-medium text-gray-900 mb-4">Vendas por mês</h2>
          {loading ? (
            <div className="h-48 bg-gray-100 rounded-lg animate-pulse" />
          ) : !data?.vendas_por_mes?.length ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.vendas_por_mes} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip content={<TooltipVendas />} />
                <Bar dataKey="vendidas" fill="#1B1B8E" radius={[3, 3, 0, 0]} name="Vendidas" />
                <Bar dataKey="receita"  fill="#FFD700" radius={[3, 3, 0, 0]} name="Receita" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Gráfico de pizza — por status */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-medium text-gray-900 mb-4">Cartelas por status</h2>
          {loading ? (
            <div className="h-48 bg-gray-100 rounded-lg animate-pulse" />
          ) : !data?.por_status?.length ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={data.por_status}
                  dataKey="total"
                  nameKey="label"
                  cx="50%"
                  cy="45%"
                  outerRadius={65}
                  innerRadius={30}
                >
                  {data.por_status.map((entry: any, i: number) => (
                    <Cell key={i} fill={entry.cor} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => n(v)} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 10 }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Aba: Distribuidores ───────────────────────────────────────────────────────

function AbaDistribuidores({ data, loading }: { data: DistribuidorRow[]; loading: boolean }) {
  const colunas: ColumnDef[] = [
    { key: 'nome',              label: 'Nome',           sortable: true },
    { key: 'pdvs_count',        label: 'PDVs',           sortable: true, align: 'right' },
    { key: 'cartelas_enviadas', label: 'Enviadas',       sortable: true, align: 'right' },
    { key: 'cartelas_vendidas', label: 'Vendidas',       sortable: true, align: 'right' },
    {
      key: 'conversao_pct', label: '% Conv.', sortable: true, align: 'right',
      render: v => <span className="font-medium text-emerald-600">{String(v)}%</span>,
    },
    {
      key: 'receita_gerada', label: 'Receita', sortable: true, align: 'right',
      render: v => brl(v as number),
    },
    {
      key: 'comissao_devida', label: 'Comissão devida', sortable: true, align: 'right',
      render: v => brl(v as number),
    },
    {
      key: 'status', label: 'Status', align: 'center',
      render: v => (
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
          v === 'ativo' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
        }`}>
          {String(v)}
        </span>
      ),
    },
  ]

  return (
    <TabelaRelatorio
      columns={colunas}
      data={data as unknown as Record<string, unknown>[]}
      loading={loading}
      searchPlaceholder="Buscar distribuidor..."
      emptyMessage="Nenhum distribuidor encontrado"
    />
  )
}

// ── Aba: Cartelas ─────────────────────────────────────────────────────────────

function AbaCartelas({ data, loading }: { data: CartelaRow[]; loading: boolean }) {
  const colunas: ColumnDef[] = [
    { key: 'numero',      label: 'Edição',   sortable: true },
    {
      key: 'data_sorteio', label: 'Data do sorteio', sortable: true,
      render: v => dataBR(v as string),
    },
    { key: 'total_geradas', label: 'Total geradas', sortable: true, align: 'right' },
    { key: 'distribuidas',  label: 'Distribuídas',  sortable: true, align: 'right' },
    { key: 'vendidas',      label: 'Vendidas',       sortable: true, align: 'right' },
    { key: 'devolvidas',    label: 'Devolvidas',     sortable: true, align: 'right' },
    {
      key: 'vendidas_pct', label: '% Vendidas', sortable: true, align: 'right',
      render: v => {
        const pct = v as number
        return (
          <div className="flex items-center justify-end gap-2">
            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs font-medium">{pct}%</span>
          </div>
        )
      },
    },
    {
      key: 'receita', label: 'Receita', sortable: true, align: 'right',
      render: v => <span className="font-medium text-emerald-700">{brl(v as number)}</span>,
    },
  ]

  return (
    <TabelaRelatorio
      columns={colunas}
      data={data as unknown as Record<string, unknown>[]}
      loading={loading}
      searchPlaceholder="Buscar edição..."
      emptyMessage="Nenhuma edição encontrada"
    />
  )
}

// ── Aba: Sorteios ─────────────────────────────────────────────────────────────

function AbaSorteios({ data, loading }: { data: SorteioRow[]; loading: boolean }) {
  const colunas: ColumnDef[] = [
    { key: 'edicao_numero',  label: 'Edição',     sortable: true, width: '80px' },
    {
      key: 'data_sorteio', label: 'Data', sortable: true,
      render: v => dataBR(v as string),
    },
    { key: 'numero_sorteio', label: 'Nº Sorteio', sortable: true, align: 'center', width: '90px' },
    {
      key: 'dezenas_sorteadas', label: 'Dezenas sorteadas',
      render: v => {
        const arr = v as string[]
        return (
          <div className="flex flex-wrap gap-1 max-w-xs">
            {arr.map((d, i) => (
              <span key={i} className="text-xs bg-[#1B1B8E] text-white rounded px-1.5 py-0.5 font-mono">
                {d}
              </span>
            ))}
          </div>
        )
      },
    },
    { key: 'cartela_codigo', label: 'Cartela vencedora' },
    {
      key: 'valor_premio', label: 'Prêmio pago', sortable: true, align: 'right',
      render: v => <span className="font-medium text-amber-600">{brl(v as number)}</span>,
    },
    {
      key: 'status', label: 'Status', align: 'center',
      render: v => (
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
          v === 'realizado'  ? 'bg-emerald-50 text-emerald-700' :
          v === 'aguardando' ? 'bg-amber-50 text-amber-600'     :
                               'bg-gray-100 text-gray-500'
        }`}>
          {String(v)}
        </span>
      ),
    },
    {
      key: 'realizado_em', label: 'Realizado em', sortable: true,
      render: v => v ? dataBR(v as string) : '—',
    },
  ]

  return (
    <TabelaRelatorio
      columns={colunas}
      data={data as unknown as Record<string, unknown>[]}
      loading={loading}
      searchPlaceholder="Buscar sorteio ou edição..."
      emptyMessage="Nenhum sorteio encontrado"
      pageSize={10}
    />
  )
}

// ── Empty chart placeholder ───────────────────────────────────────────────────

function EmptyChart() {
  return (
    <div className="h-48 flex items-center justify-center text-sm text-gray-400">
      Sem dados para exibir
    </div>
  )
}
