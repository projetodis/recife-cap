'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useConfig } from '@/lib/config-client'
import {
  Download, Calendar, ChevronDown, ChevronLeft, ChevronRight,
  Trophy, MapPin, Clock, Store, BarChart2,
} from 'lucide-react'

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface EdicaoItem {
  id: string
  numero: number
  data_sorteio: string
  status: string
}
interface PremioEdicao {
  id: string
  nome: string
  valor: number
  foto_url: string | null
  ordem: number
}
interface SorteioRow {
  id: string
  numero_sorteio: number
  valor_premio: number
  status: string
  dezenas_sorteadas: string[]
  realizado_em: string | null
  cartela_vencedora: string | null
  arte_url: string | null
  banner_url: string | null
  premios_edicao: PremioEdicao | null
}
interface Ganhador {
  id: string
  sorteio_id: string
  sorteio_numero: number
  nome_ganhador: string | null
  numero_titulo: string | null
  cidade: string | null
  pdv_nome: string | null
  premio_nome: string | null
  premio_valor: number | null
  confirmado: boolean | null
}
interface Premio {
  id: string
  ordem: number
  nome: string
  valor: number
  foto_url: string | null
  destaque: boolean
}
interface Snapshot {
  banner_url:                string | null
  nome_sistema:              string | null
  premio_1_foto_url:         string | null
  premio_2_foto_url:         string | null
  premio_3_foto_url:         string | null
  premio_4_foto_url:         string | null
  premio_principal_foto_url: string | null
  premio_1_nome:             string | null
  premio_2_nome:             string | null
  premio_3_nome:             string | null
  premio_4_nome:             string | null
  premio_principal_nome:     string | null
  premio_1_valor:            string | null
  premio_2_valor:            string | null
  premio_3_valor:            string | null
  premio_4_valor:            string | null
  premio_principal_valor:    string | null
}
interface HistoricoData {
  edicoes:    EdicaoItem[]
  edicao:     EdicaoItem | null
  sorteios:   SorteioRow[]
  ganhadores: Ganhador[]
  premios:    Premio[]
  snapshot:   Snapshot | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function brl(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function dataBR(iso: string): string {
  if (!iso) return ''
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR')
}

const ABAS_FALLBACK = ['1º Prêmio', '2º Prêmio', '3º Prêmio', '4º Prêmio', 'Giro da Sorte']

// ── Componente ────────────────────────────────────────────────────────────────
export default function HistoricoPage() {
  const configs  = useConfig()
  const logoUrl  = configs.logo_url || '/logo.png'

  const [abaAtiva,         setAbaAtiva]         = useState(0)
  const [edicaoSelecionada, setEdicaoSelecionada] = useState<string>('')
  const [data,             setData]             = useState<HistoricoData | null>(null)
  const [loading,          setLoading]          = useState(true)
  const [baixandoPdf,      setBaixandoPdf]      = useState(false)

  async function carregarDados(edicaoId?: string) {
    setLoading(true)
    try {
      const url  = edicaoId ? `/api/cliente/historico?edicao=${edicaoId}` : '/api/cliente/historico'
      const res  = await fetch(url)
      const json = await res.json() as HistoricoData
      setData(json)
      if (json.edicao) setEdicaoSelecionada(json.edicao.id)
    } catch { /* ignora */ }
    finally { setLoading(false) }
  }

  useEffect(() => { carregarDados() }, [])

  function onChangeEdicao(id: string) {
    setEdicaoSelecionada(id)
    setAbaAtiva(0)
    carregarDados(id)
  }

  async function baixarPdf() {
    if (!data?.edicao) return
    setBaixandoPdf(true)
    try {
      const res = await fetch(`/api/cliente/historico/pdf?edicao=${data.edicao.id}`)
      if (!res.ok) throw new Error('Erro ao gerar PDF')
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `resultado-edicao-${data.edicao.numero}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch { /* ignora */ }
    finally { setBaixandoPdf(false) }
  }

  const sorteiosData = data?.sorteios   ?? []
  const ganhadores   = data?.ganhadores ?? []
  const premios      = data?.premios    ?? []
  const snapshot     = data?.snapshot   ?? null

  const abas = Array.from({ length: 5 }, (_, i) => {
    const s = sorteiosData.find(s => s.numero_sorteio === i + 1)
    if (s?.premios_edicao?.nome) return s.premios_edicao.nome
    const p = premios.find(p => p.ordem === i + 1)
    return p?.nome ?? ABAS_FALLBACK[i] ?? `${i + 1}º Prêmio`
  })

  const sorteioAtual        = sorteiosData.find(s => s.numero_sorteio === abaAtiva + 1)
  const dezenasAba          = sorteioAtual?.dezenas_sorteadas ?? []
  const ganhadoresDoSorteio = ganhadores.filter(g => g.sorteio_numero === abaAtiva + 1)
  const premioAba           = sorteioAtual?.valor_premio ?? 0
  const bannerSorteioUrl    = sorteioAtual?.arte_url || sorteioAtual?.banner_url || configs.banner_sorteio_url || null

  const fotosPremios: Record<number, string> = {
    0: snapshot?.premio_1_foto_url         || sorteiosData.find(s => s.numero_sorteio === 1)?.premios_edicao?.foto_url || premios.find(p => p.ordem === 1)?.foto_url || logoUrl,
    1: snapshot?.premio_2_foto_url         || sorteiosData.find(s => s.numero_sorteio === 2)?.premios_edicao?.foto_url || premios.find(p => p.ordem === 2)?.foto_url || logoUrl,
    2: snapshot?.premio_3_foto_url         || sorteiosData.find(s => s.numero_sorteio === 3)?.premios_edicao?.foto_url || premios.find(p => p.ordem === 3)?.foto_url || logoUrl,
    3: snapshot?.premio_4_foto_url         || sorteiosData.find(s => s.numero_sorteio === 4)?.premios_edicao?.foto_url || premios.find(p => p.ordem === 4)?.foto_url || logoUrl,
    4: snapshot?.premio_principal_foto_url || sorteiosData.find(s => s.numero_sorteio === 5)?.premios_edicao?.foto_url || premios.find(p => p.ordem === 5)?.foto_url || logoUrl,
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── BARRA DE NAVEGAÇÃO SUPERIOR ───────────────────────────────────── */}
      <div style={{ background: 'var(--color-primary, #2E7D32)' }}>
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1 text-white/70 hover:text-white text-sm font-medium transition-colors"
          >
            <ChevronLeft size={16} />
            Início
          </Link>
          <Link
            href="/cliente/sorteio"
            className="flex items-center gap-1.5 text-white/70 hover:text-white text-xs font-medium transition-colors"
          >
            <Clock size={13} />
            Ver sorteio ao vivo
          </Link>
        </div>
      </div>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section
        className="relative py-20 text-center overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1B5E20 0%, #2E7D32 60%, #388E3C 100%)' }}
      >
        {/* Padrão hexagonal decorativo */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        {/* Círculos decorativos */}
        <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full opacity-10"
          style={{ background: '#FFC107' }} />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full opacity-10"
          style={{ background: '#FFC107' }} />

        <div className="relative z-10 max-w-3xl mx-auto px-4">
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full mb-6"
            style={{ background: 'rgba(255,193,7,0.2)', border: '1px solid rgba(255,193,7,0.4)' }}
          >
            <Trophy size={16} style={{ color: '#FFC107' }} />
            <span className="text-sm font-bold" style={{ color: '#FFC107' }}>Resultados Oficiais</span>
          </div>

          <h1 className="text-5xl lg:text-6xl font-black text-white mb-4 leading-tight">
            Histórico de<br />
            <span style={{ color: '#FFC107' }}>Resultados</span>
          </h1>

          <p className="text-green-200 text-lg max-w-xl mx-auto">
            Consulte os contemplados de todas as edições encerradas
          </p>

          {/* Stats decorativos */}
          <div className="flex items-center justify-center gap-8 mt-8">
            <div className="text-center">
              <p className="text-2xl font-black text-white">{data?.edicoes?.length || 0}</p>
              <p className="text-xs text-green-300 uppercase tracking-wider">Edições</p>
            </div>
            <div className="w-px h-10 bg-green-600" />
            <div className="text-center">
              <p className="text-2xl font-black" style={{ color: '#FFC107' }}>100%</p>
              <p className="text-xs text-green-300 uppercase tracking-wider">Transparente</p>
            </div>
            <div className="w-px h-10 bg-green-600" />
            <div className="text-center">
              <p className="text-2xl font-black text-white">PIX</p>
              <p className="text-xs text-green-300 uppercase tracking-wider">Pagamento</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── ABAS DOS PRÊMIOS ─────────────────────────────────────────────── */}
      <div style={{ background: '#1B5E20' }}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex gap-2 flex-wrap justify-center">
          {abas.map((aba, i) => (
            <button
              key={i}
              onClick={() => setAbaAtiva(i)}
              className="px-4 py-1.5 rounded-full text-sm font-semibold transition-all"
              style={
                abaAtiva === i
                  ? { background: '#FFC107', color: '#1B5E20' }
                  : { background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.85)' }
              }
              onMouseEnter={e => { if (abaAtiva !== i) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.25)' }}
              onMouseLeave={e => { if (abaAtiva !== i) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.15)' }}
            >
              {aba}
            </button>
          ))}
        </div>
      </div>

      {/* ── FILTRO + DOWNLOAD ────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Seletor de edição */}
          <div className="relative">
            <select
              value={edicaoSelecionada}
              onChange={e => onChangeEdicao(e.target.value)}
              disabled={loading || !data?.edicoes?.length}
              className="appearance-none pl-4 pr-9 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 shadow-sm font-medium focus:outline-none focus:ring-2 cursor-pointer disabled:opacity-60"
              style={{ minWidth: '200px' }}
            >
              {!data?.edicoes?.length
                ? <option>Carregando...</option>
                : data.edicoes.map(e => (
                    <option key={e.id} value={e.id}>
                      Edição {e.numero} — {dataBR(e.data_sorteio)}
                    </option>
                  ))
              }
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {data?.edicao && (
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <Calendar size={14} />
              <span>{dataBR(data.edicao.data_sorteio)}</span>
            </div>
          )}
        </div>

        <button
          onClick={baixarPdf}
          disabled={baixandoPdf || !data?.edicao}
          className="flex items-center gap-2 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ background: '#2E7D32' }}
          onMouseEnter={e => { if (!baixandoPdf) (e.currentTarget as HTMLElement).style.background = '#1B5E20' }}
          onMouseLeave={e => { if (!baixandoPdf) (e.currentTarget as HTMLElement).style.background = '#2E7D32' }}
        >
          <Download size={16} />
          {baixandoPdf ? 'Gerando PDF…' : 'Baixar PDF'}
        </button>
      </div>

      {/* ── CONTEÚDO PRINCIPAL ───────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 pb-16">
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white rounded-2xl h-64 animate-pulse" />
              <div className="bg-white rounded-2xl h-48 animate-pulse" />
            </div>
            <div className="lg:col-span-3 space-y-4">
              <div className="bg-white rounded-2xl h-48 animate-pulse" />
              <div className="bg-white rounded-2xl h-64 animate-pulse" />
            </div>
          </div>
        ) : !data?.edicao ? (
          <div className="py-20 text-center">
            <Trophy size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium text-gray-500">Nenhuma edição encerrada ainda.</p>
            <p className="text-sm mt-1 text-gray-400">Os resultados aparecerão aqui após o encerramento das edições.</p>
            <Link
              href="/cliente/sorteio"
              className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-xl text-white text-sm font-semibold shadow transition-all hover:opacity-90"
              style={{ background: '#2E7D32' }}
            >
              <Clock size={15} />
              Ver sorteio ao vivo
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

            {/* ── COLUNA ESQUERDA ─────────────────────────────────────────── */}
            <div className="lg:col-span-2 space-y-4">

              {/* Card do prêmio */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-b border-gray-100">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Edição {data.edicao.numero}
                  </span>
                  <span
                    className="text-xs font-bold px-3 py-1 rounded-full"
                    style={{ background: '#FFC107', color: '#1B5E20' }}
                  >
                    {abas[abaAtiva]}
                  </span>
                </div>
                <div className="p-6 flex flex-col items-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={fotosPremios[abaAtiva] ?? logoUrl}
                    alt={abas[abaAtiva]}
                    className="w-full max-h-40 object-contain rounded-xl"
                    onError={e => { (e.currentTarget as HTMLImageElement).src = logoUrl }}
                  />
                  <div className="mt-4 w-full border-t border-gray-100 pt-4 text-center">
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Valor Líquido</p>
                    <p className="text-2xl font-black mt-1" style={{ color: '#2E7D32' }}>
                      {premioAba > 0 ? brl(premioAba) : '—'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Dezenas Sorteadas */}
              <div className="bg-white rounded-2xl border p-5 shadow-sm">
                <h3 className="font-bold text-gray-700 mb-4 text-sm uppercase tracking-wider">
                  Dezenas Sorteadas ({dezenasAba.length})
                </h3>
                {dezenasAba.length === 0 ? (
                  <div className="text-center py-6 text-gray-400">
                    <p className="text-sm font-medium">Sem dezenas registradas.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-8 gap-2">
                    {dezenasAba.map((dezena, i) => (
                      <div
                        key={i}
                        className="aspect-square rounded-full flex items-center justify-center text-sm font-black shadow-sm"
                        style={{
                          background: 'white',
                          border:     '2px solid #E5E7EB',
                          color:      '#1A1A1A',
                          minWidth:   40,
                          minHeight:  40,
                        }}
                      >
                        {String(dezena).padStart(2, '0')}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── COLUNA DIREITA ──────────────────────────────────────────── */}
            <div className="lg:col-span-3 space-y-4">

              {/* Banner do sorteio */}
              {bannerSorteioUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={bannerSorteioUrl}
                  alt="Arte do sorteio"
                  className="w-full rounded-2xl shadow-sm"
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                />
              )}

              {/* Contemplados */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="font-bold text-gray-800 text-lg">Contemplados</h3>
                  <span
                    className="px-3 py-1 rounded-full text-xs font-bold text-white"
                    style={{ background: '#2E7D32' }}
                  >
                    {ganhadoresDoSorteio.length} ganhador(es)
                  </span>
                </div>

                {ganhadoresDoSorteio.length === 0 ? (
                  <div className="py-8 text-center text-gray-400">
                    <Trophy size={40} className="mx-auto mb-3 opacity-25" />
                    <p className="font-medium text-gray-500">Sem contemplados registrados.</p>
                  </div>
                ) : (
                  <div>
                    {ganhadoresDoSorteio.map(g => (
                      <div
                        key={g.id}
                        className="pl-4 py-3 mb-3 rounded-r-xl"
                        style={{
                          background: 'rgba(46,125,50,0.03)',
                          border:     '1px solid #E5E7EB',
                          borderLeft: '4px solid #2E7D32',
                        }}
                      >
                        <p className="text-xs text-gray-400 font-mono mb-1 tracking-wider">
                          TÍTULO Nº {g.numero_titulo || '---'}
                        </p>
                        <p className="font-black text-gray-800 text-base">
                          {g.nome_ganhador || 'Nome não informado'}
                        </p>
                        <div className="flex items-center gap-4 mt-2 flex-wrap">
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <MapPin size={11} style={{ color: '#2E7D32' }} />
                            {g.cidade || 'Cidade não informada'}
                          </span>
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Store size={11} style={{ color: '#2E7D32' }} />
                            PDV: {g.pdv_nome || 'APLICATIVO'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Resumo da Edição */}
              <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                <div
                  className="px-5 py-4 border-b flex items-center gap-2"
                  style={{ background: 'rgba(46,125,50,0.04)' }}
                >
                  <BarChart2 size={16} style={{ color: '#2E7D32' }} />
                  <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wider">
                    Resumo da Edição
                  </h3>
                </div>

                <div className="divide-y divide-gray-50">
                  {sorteiosData.map((s, index) => {
                    const ganhadoresCount = ganhadores.filter(
                      g => g.sorteio_id === s.id || g.sorteio_numero === s.numero_sorteio
                    ).length
                    const isAtivo = s.numero_sorteio === abaAtiva + 1
                    return (
                      <button
                        key={s.id}
                        onClick={() => setAbaAtiva(s.numero_sorteio - 1)}
                        className="w-full flex items-center gap-4 px-5 py-4 transition-all hover:bg-gray-50 text-left"
                        style={{ background: isAtivo ? 'rgba(46,125,50,0.05)' : 'white' }}
                      >
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
                          style={{
                            background: isAtivo ? '#2E7D32' : '#F5F5F5',
                            color:      isAtivo ? 'white'   : '#6B7280',
                          }}
                        >
                          {index + 1}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-800 text-sm">
                            {s.premios_edicao?.nome || abas[index] || `${index + 1}º Prêmio`}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {ganhadoresCount} contemplado{ganhadoresCount !== 1 ? 's' : ''}
                          </p>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <p className="font-black text-sm" style={{ color: '#2E7D32' }}>
                            {s.valor_premio > 0 ? brl(s.valor_premio) : '—'}
                          </p>
                          {isAtivo && (
                            <div className="flex items-center justify-end gap-1 mt-1">
                              <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#FFC107' }} />
                              <span className="text-xs" style={{ color: '#FFC107' }}>Visualizando</span>
                            </div>
                          )}
                        </div>

                        <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
                      </button>
                    )
                  })}
                </div>

                {/* Total da edição */}
                {sorteiosData.length > 0 && (
                  <div
                    className="px-5 py-4 flex items-center justify-between"
                    style={{ background: 'rgba(46,125,50,0.05)', borderTop: '1px solid #E5E7EB' }}
                  >
                    <span className="text-sm font-bold text-gray-600">Total em prêmios</span>
                    <span className="text-lg font-black" style={{ color: '#1B5E20' }}>
                      {brl(sorteiosData.reduce((acc, s) => acc + (s.valor_premio || 0), 0))}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
