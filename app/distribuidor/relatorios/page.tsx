'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  DollarSign, TrendingUp, Store, LayoutGrid,
  FileText, Package, CheckCircle, AlertCircle,
} from 'lucide-react'
import MetricCard from '@/components/relatorios/MetricCard'
import TabelaRelatorio, { ColumnDef } from '@/components/relatorios/TabelaRelatorio'
import FiltrosPeriodo from '@/components/relatorios/FiltrosPeriodo'

type Tab = 'financeiro' | 'pdvs' | 'cartelas'

function moeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function pct(v: number) { return `${v}%` }

// ── Tab: Financeiro ───────────────────────────────────────────────────────────

interface FinanceiroData {
  cards: {
    receita_total: number
    comissao_devida: number
    comissao_pendente: number
    comissao_recebida: number
    total_cartelas: number
    cartelas_vendidas: number
    taxa_conversao: number
    progresso_meta: number | null
    meta_mensal: number
    receita_mes_atual: number
  }
  vendas_por_mes: { mes: string; label: string; receita: number; vendidas: number }[]
}

function TabFinanceiro({ periodo, onPeriodoChange }: { periodo: string; onPeriodoChange: (p: string) => void }) {
  const [data, setData]         = useState<FinanceiroData | null>(null)
  const [loading, setLoading]   = useState(true)
  const [loadingPDF, setLoadingPDF]     = useState(false)
  const [loadingExcel, setLoadingExcel] = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ tipo: 'financeiro' })
      if (periodo) params.set('periodo', periodo)
      const res = await fetch(`/api/distribuidor/relatorios?${params}`)
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
    }
  }, [periodo])

  useEffect(() => { carregar() }, [carregar])

  async function exportarPDF() {
    if (!data) return
    setLoadingPDF(true)
    try {
      const rows = data.vendas_por_mes.map(m => ({
        'Mês':               m.label,
        'Cartelas vendidas': m.vendidas,
        'Receita gerada':    moeda(m.receita),
      }))
      const res = await fetch('/api/distribuidor/relatorios/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'financeiro',
          titulo: 'Relatório Financeiro',
          periodo: periodo || 'Todos os períodos',
          rows,
          colunas: ['Mês', 'Cartelas vendidas', 'Receita gerada'],
        }),
      })
      if (res.ok) {
        const blob = await res.blob()
        const url  = URL.createObjectURL(blob)
        const a    = document.createElement('a')
        a.href     = url
        a.download = 'relatorio-financeiro.pdf'
        a.click()
        URL.revokeObjectURL(url)
      }
    } finally {
      setLoadingPDF(false)
    }
  }

  async function exportarExcel() {
    setLoadingExcel(true)
    try {
      const params = new URLSearchParams({ tipo: 'financeiro' })
      if (periodo) params.set('periodo', periodo)
      const res = await fetch(`/api/distribuidor/relatorios/excel?${params}`)
      if (res.ok) {
        const blob = await res.blob()
        const url  = URL.createObjectURL(blob)
        const a    = document.createElement('a')
        a.href     = url
        a.download = `financeiro${periodo ? `-${periodo}` : ''}.xlsx`
        a.click()
        URL.revokeObjectURL(url)
      }
    } finally {
      setLoadingExcel(false)
    }
  }

  const cards = data?.cards
  const prog  = cards?.progresso_meta

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <FiltrosPeriodo
          periodo={periodo}
          onPeriodoChange={onPeriodoChange}
          onExportarPDF={exportarPDF}
          onExportarExcel={exportarExcel}
          loadingPDF={loadingPDF}
          loadingExcel={loadingExcel}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={<DollarSign size={16} />} label="Receita gerada" value={loading ? '…' : moeda(cards?.receita_total ?? 0)} color="green" loading={loading} />
        <MetricCard icon={<TrendingUp size={16} />} label="Comissão devida" value={loading ? '…' : moeda(cards?.comissao_devida ?? 0)} color="violet" loading={loading} />
        <MetricCard icon={<AlertCircle size={16} />} label="Comissão pendente" value={loading ? '…' : moeda(cards?.comissao_pendente ?? 0)} color="amber" loading={loading} />
        <MetricCard icon={<CheckCircle size={16} />} label="Comissão recebida" value={loading ? '…' : moeda(cards?.comissao_recebida ?? 0)} color="blue" loading={loading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de barras */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-medium text-gray-900 mb-4">Receita mensal</h2>
          {loading ? (
            <div className="h-48 bg-gray-100 rounded animate-pulse" />
          ) : (data?.vendas_por_mes ?? []).every(m => m.receita === 0) ? (
            <p className="text-sm text-gray-400 text-center py-16">Nenhuma venda ainda.</p>
          ) : (
            <ResponsiveContainer width="100%" height={192}>
              <BarChart data={data?.vendas_por_mes ?? []} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => moeda(typeof v === 'number' ? v : 0)} labelFormatter={l => `Mês: ${l}`} />
                <Bar dataKey="receita" name="Receita" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Métricas de cartelas */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-sm font-medium text-gray-900">Cartelas</h2>
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-5 bg-gray-100 rounded animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              {[
                { label: 'Total atribuídas', value: cards?.total_cartelas ?? 0, color: 'text-gray-900' },
                { label: 'Vendidas (pagas)', value: cards?.cartelas_vendidas ?? 0, color: 'text-emerald-600' },
                { label: 'Taxa de conversão', value: pct(cards?.taxa_conversao ?? 0), color: 'text-violet-600' },
              ].map(c => (
                <div key={c.label} className="flex justify-between items-center">
                  <span className="text-gray-500">{c.label}</span>
                  <span className={`font-medium ${c.color}`}>{c.value}</span>
                </div>
              ))}
              {prog !== null && (
                <div className="pt-3 border-t border-gray-100">
                  <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                    <span>Meta do mês ({moeda(cards?.meta_mensal ?? 0)})</span>
                    <span>{prog}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${(prog ?? 0) >= 100 ? 'bg-emerald-500' : (prog ?? 0) >= 50 ? 'bg-amber-400' : 'bg-rose-400'}`}
                      style={{ width: `${prog}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{moeda(cards?.receita_mes_atual ?? 0)} este mês</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Evolução de vendas (line chart) */}
      {!loading && (data?.vendas_por_mes ?? []).some(m => m.vendidas > 0) && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-medium text-gray-900 mb-4">Cartelas vendidas por mês</h2>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={data?.vendas_por_mes ?? []} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="vendidas" name="Cartelas" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

// ── Tab: PDVs ─────────────────────────────────────────────────────────────────

interface PdvItem {
  id: string
  nome: string
  bairro: string
  status: string
  comissao_pct: number
  vendidas: number
  em_estoque: number
  receita: number
}

const COLUNAS_PDVS: ColumnDef[] = [
  { key: 'nome',        label: 'PDV',          sortable: true },
  { key: 'bairro',      label: 'Bairro' },
  { key: 'status',      label: 'Status',       render: (v) => (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${v === 'ativo' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
      {v as string}
    </span>
  )},
  { key: 'comissao_pct', label: 'Comissão', align: 'right', render: (v) => `${v}%` },
  { key: 'vendidas',    label: 'Vendidas',     align: 'right', sortable: true },
  { key: 'em_estoque',  label: 'Em estoque',   align: 'right', sortable: true },
  { key: 'receita',     label: 'Receita',      align: 'right', sortable: true, render: (v) => moeda(v as number) },
]

function TabPdvs({ periodo, onPeriodoChange }: { periodo: string; onPeriodoChange: (p: string) => void }) {
  const [pdvs, setPdvs]         = useState<PdvItem[]>([])
  const [loading, setLoading]   = useState(true)
  const [loadingPDF, setLoadingPDF]     = useState(false)
  const [loadingExcel, setLoadingExcel] = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ tipo: 'pdvs' })
      if (periodo) params.set('periodo', periodo)
      const res = await fetch(`/api/distribuidor/relatorios?${params}`)
      if (res.ok) {
        const json = await res.json()
        setPdvs(json.pdvs ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [periodo])

  useEffect(() => { carregar() }, [carregar])

  async function exportarPDF() {
    setLoadingPDF(true)
    try {
      const rows = pdvs.map(p => ({
        'PDV':            p.nome,
        'Bairro':         p.bairro,
        'Status':         p.status,
        'Comissão (%)':   p.comissao_pct,
        'Vendidas':       p.vendidas,
        'Em estoque':     p.em_estoque,
        'Receita':        moeda(p.receita),
      }))
      const res = await fetch('/api/distribuidor/relatorios/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'pdvs',
          titulo: 'Relatório de PDVs',
          periodo: periodo || 'Todos os períodos',
          rows,
          colunas: ['PDV', 'Bairro', 'Status', 'Comissão (%)', 'Vendidas', 'Em estoque', 'Receita'],
        }),
      })
      if (res.ok) {
        const blob = await res.blob()
        const url  = URL.createObjectURL(blob)
        const a    = document.createElement('a')
        a.href = url; a.download = 'pdvs.pdf'; a.click()
        URL.revokeObjectURL(url)
      }
    } finally {
      setLoadingPDF(false)
    }
  }

  async function exportarExcel() {
    setLoadingExcel(true)
    try {
      const params = new URLSearchParams({ tipo: 'pdvs' })
      if (periodo) params.set('periodo', periodo)
      const res = await fetch(`/api/distribuidor/relatorios/excel?${params}`)
      if (res.ok) {
        const blob = await res.blob()
        const url  = URL.createObjectURL(blob)
        const a    = document.createElement('a')
        a.href = url; a.download = `pdvs${periodo ? `-${periodo}` : ''}.xlsx`; a.click()
        URL.revokeObjectURL(url)
      }
    } finally {
      setLoadingExcel(false)
    }
  }

  const totalReceita  = pdvs.reduce((a, p) => a + p.receita, 0)
  const totalVendidas = pdvs.reduce((a, p) => a + p.vendidas, 0)
  const ativos        = pdvs.filter(p => p.status === 'ativo').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <FiltrosPeriodo
          periodo={periodo}
          onPeriodoChange={onPeriodoChange}
          onExportarPDF={exportarPDF}
          onExportarExcel={exportarExcel}
          loadingPDF={loadingPDF}
          loadingExcel={loadingExcel}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard icon={<Store size={16} />}      label="PDVs ativos"       value={loading ? '…' : String(ativos)}           color="green"  loading={loading} />
        <MetricCard icon={<TrendingUp size={16} />} label="Total vendidas"     value={loading ? '…' : String(totalVendidas)}    color="violet" loading={loading} />
        <MetricCard icon={<DollarSign size={16} />} label="Receita nos PDVs"   value={loading ? '…' : moeda(totalReceita)}      color="blue"   loading={loading} />
      </div>

      {/* Gráfico de receita por PDV */}
      {!loading && pdvs.some(p => p.receita > 0) && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-medium text-gray-900 mb-4">Receita por PDV</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={[...pdvs].sort((a, b) => b.receita - a.receita).slice(0, 10)}
              layout="vertical"
              margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="nome" tick={{ fontSize: 11 }} width={120} />
              <Tooltip formatter={(v) => moeda(typeof v === 'number' ? v : 0)} />
              <Bar dataKey="receita" name="Receita" fill="#6366f1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <TabelaRelatorio
        columns={COLUNAS_PDVS}
        data={pdvs as unknown as Record<string, unknown>[]}
        loading={loading}
        searchPlaceholder="Buscar PDV..."
        emptyMessage="Nenhum PDV cadastrado."
      />
    </div>
  )
}

// ── Tab: Cartelas ─────────────────────────────────────────────────────────────

interface CartelaItem {
  codigo: string
  dv: string
  status: string
  status_label: string
  edicao: string
  valor: number
  pdv: string
  paga_em: string | null
  criada_em: string
}

const STATUS_COLOR: Record<string, string> = {
  paga:                    'bg-emerald-50 text-emerald-700',
  em_estoque_distribuidor: 'bg-amber-50 text-amber-700',
  em_estoque_pdv:          'bg-blue-50 text-blue-700',
  cancelada:               'bg-red-50 text-red-600',
  reservada:               'bg-violet-50 text-violet-700',
  vendida:                 'bg-gray-100 text-gray-600',
}

const COLUNAS_CARTELAS: ColumnDef[] = [
  { key: 'codigo',      label: 'Código',      sortable: true },
  { key: 'dv',          label: 'DV',          width: '60px' },
  { key: 'edicao',      label: 'Edição',      sortable: true },
  { key: 'status_label', label: 'Status',     render: (v, row) => (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[(row.status as string) ?? ''] ?? 'bg-gray-100 text-gray-600'}`}>
      {v as string}
    </span>
  )},
  { key: 'pdv',         label: 'PDV',         sortable: true },
  { key: 'valor',       label: 'Valor',       align: 'right', render: (v) => moeda(v as number) },
  { key: 'paga_em',     label: 'Paga em',     render: (v) => v ? new Date(v as string).toLocaleDateString('pt-BR') : '—' },
  { key: 'criada_em',   label: 'Criada em',   render: (v) => new Date(v as string).toLocaleDateString('pt-BR') },
]

function TabCartelas({ periodo, onPeriodoChange }: { periodo: string; onPeriodoChange: (p: string) => void }) {
  const [cartelas, setCartelas]   = useState<CartelaItem[]>([])
  const [porStatus, setPorStatus] = useState<Record<string, number>>({})
  const [loading, setLoading]     = useState(true)
  const [loadingPDF, setLoadingPDF]     = useState(false)
  const [loadingExcel, setLoadingExcel] = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ tipo: 'cartelas' })
      if (periodo) params.set('periodo', periodo)
      const res = await fetch(`/api/distribuidor/relatorios?${params}`)
      if (res.ok) {
        const json = await res.json()
        setCartelas(json.cartelas ?? [])
        setPorStatus(json.por_status ?? {})
      }
    } finally {
      setLoading(false)
    }
  }, [periodo])

  useEffect(() => { carregar() }, [carregar])

  async function exportarPDF() {
    setLoadingPDF(true)
    try {
      const rows = cartelas.slice(0, 500).map(c => ({
        'Código':   c.codigo,
        'Status':   c.status_label,
        'Edição':   c.edicao,
        'PDV':      c.pdv,
        'Valor':    moeda(c.valor),
        'Paga em':  c.paga_em ? new Date(c.paga_em).toLocaleDateString('pt-BR') : '—',
      }))
      const res = await fetch('/api/distribuidor/relatorios/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'cartelas',
          titulo: 'Relatório de Cartelas',
          periodo: periodo || 'Todos os períodos',
          rows,
          colunas: ['Código', 'Status', 'Edição', 'PDV', 'Valor', 'Paga em'],
        }),
      })
      if (res.ok) {
        const blob = await res.blob()
        const url  = URL.createObjectURL(blob)
        const a    = document.createElement('a')
        a.href = url; a.download = 'cartelas.pdf'; a.click()
        URL.revokeObjectURL(url)
      }
    } finally {
      setLoadingPDF(false)
    }
  }

  async function exportarExcel() {
    setLoadingExcel(true)
    try {
      const params = new URLSearchParams({ tipo: 'cartelas' })
      if (periodo) params.set('periodo', periodo)
      const res = await fetch(`/api/distribuidor/relatorios/excel?${params}`)
      if (res.ok) {
        const blob = await res.blob()
        const url  = URL.createObjectURL(blob)
        const a    = document.createElement('a')
        a.href = url; a.download = `cartelas${periodo ? `-${periodo}` : ''}.xlsx`; a.click()
        URL.revokeObjectURL(url)
      }
    } finally {
      setLoadingExcel(false)
    }
  }

  const STATUS_LABEL: Record<string, string> = {
    em_estoque_distribuidor: 'Em estoque',
    em_estoque_pdv: 'No PDV',
    vendida: 'Vendida',
    paga: 'Paga',
    cancelada: 'Cancelada',
    reservada: 'Reservada',
  }

  const total     = Object.values(porStatus).reduce((a, v) => a + v, 0)
  const vendidas  = porStatus['paga'] ?? 0
  const emEstoque = porStatus['em_estoque_distribuidor'] ?? 0
  const noPdv     = porStatus['em_estoque_pdv'] ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <FiltrosPeriodo
          periodo={periodo}
          onPeriodoChange={onPeriodoChange}
          onExportarPDF={exportarPDF}
          onExportarExcel={exportarExcel}
          loadingPDF={loadingPDF}
          loadingExcel={loadingExcel}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={<Package size={16} />}     label="Total de cartelas" value={loading ? '…' : String(total)}      color="blue"   loading={loading} />
        <MetricCard icon={<CheckCircle size={16} />} label="Vendidas (pagas)"  value={loading ? '…' : String(vendidas)}   color="green"  loading={loading} />
        <MetricCard icon={<LayoutGrid size={16} />}  label="Em estoque"        value={loading ? '…' : String(emEstoque)}  color="amber"  loading={loading} />
        <MetricCard icon={<Store size={16} />}       label="Nos PDVs"          value={loading ? '…' : String(noPdv)}      color="violet" loading={loading} />
      </div>

      {/* Breakdown por status */}
      {!loading && Object.keys(porStatus).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-medium text-gray-900 mb-4">Distribuição por status</h2>
          <div className="space-y-2.5">
            {Object.entries(porStatus)
              .sort(([, a], [, b]) => b - a)
              .map(([status, count]) => (
                <div key={status} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-36 shrink-0">{STATUS_LABEL[status] ?? status}</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${STATUS_COLOR[status]?.split(' ')[0] ?? 'bg-gray-300'}`}
                      style={{ width: total > 0 ? `${(count / total) * 100}%` : '0%' }}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-700 w-8 text-right">{count}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      <TabelaRelatorio
        columns={COLUNAS_CARTELAS}
        data={cartelas as unknown as Record<string, unknown>[]}
        loading={loading}
        searchPlaceholder="Buscar código, PDV, edição..."
        emptyMessage="Nenhuma cartela encontrada."
        pageSize={25}
      />
    </div>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'financeiro', label: 'Financeiro', icon: <DollarSign size={15} /> },
  { id: 'pdvs',       label: 'PDVs',       icon: <Store size={15} /> },
  { id: 'cartelas',   label: 'Cartelas',   icon: <FileText size={15} /> },
]

export default function RelatoriosDistribuidorPage() {
  const [tab, setTab]       = useState<Tab>('financeiro')
  const [periodo, setPeriodo] = useState('')

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Relatórios</h1>
        <p className="text-sm text-gray-500 mt-1">Financeiro, PDVs e cartelas do seu portfólio</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.id
                ? 'border-violet-600 text-violet-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'financeiro' && <TabFinanceiro periodo={periodo} onPeriodoChange={setPeriodo} />}
      {tab === 'pdvs'       && <TabPdvs       periodo={periodo} onPeriodoChange={setPeriodo} />}
      {tab === 'cartelas'   && <TabCartelas   periodo={periodo} onPeriodoChange={setPeriodo} />}
    </div>
  )
}
