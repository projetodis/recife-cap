'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useConfig } from '@/lib/config-client'
import {
  Download, Calendar, ChevronDown, ChevronLeft, Trophy, MapPin, Clock,
} from 'lucide-react'

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface EdicaoItem {
  id: string
  numero: number
  data_sorteio: string
  status: string
}
interface SorteioRow {
  id: string
  numero_sorteio: number
  valor_premio: number
  status: string
  dezenas_sorteadas: string[]
  realizado_em: string | null
  cartela_vencedora: string | null
}
interface Ganhador {
  sorteio_numero: number
  cartela: {
    numero: string
    nome_comprador: string | null
    status: string | null
    pdv_nome: string | null
  } | null
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
  const configs      = useConfig()
  const logoUrl      = configs.logo_url       || '/logo.png'
  const fundoUrl     = configs.fundo_hero_url || '/fundo.png'
  const nomeSistema  = configs.nome_sistema   || 'Recife Cap'

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
    const p = premios.find(p => p.ordem === i + 1)
    return p?.nome ?? ABAS_FALLBACK[i] ?? `${i + 1}º Prêmio`
  })

  const dezenasAba    = sorteiosData.find(s => s.numero_sorteio === abaAtiva + 1)?.dezenas_sorteadas ?? []
  const ganhadoresAba = ganhadores.filter(g => g.sorteio_numero === abaAtiva + 1)
  const premioAba     = sorteiosData.find(s => s.numero_sorteio === abaAtiva + 1)?.valor_premio ?? 0

  const fotosPremios: Record<number, string> = {
    0: snapshot?.premio_1_foto_url         || premios.find(p => p.ordem === 1)?.foto_url || logoUrl,
    1: snapshot?.premio_2_foto_url         || premios.find(p => p.ordem === 2)?.foto_url || logoUrl,
    2: snapshot?.premio_3_foto_url         || premios.find(p => p.ordem === 3)?.foto_url || logoUrl,
    3: snapshot?.premio_4_foto_url         || premios.find(p => p.ordem === 4)?.foto_url || logoUrl,
    4: snapshot?.premio_principal_foto_url || premios.find(p => p.ordem === 5)?.foto_url || logoUrl,
  }

  const bannerUrl = snapshot?.banner_url || configs.banner_sorteio_url || fundoUrl

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
      <div
        className="relative py-10 flex flex-col items-center justify-center text-center"
        style={{
          backgroundImage:    `url('${bannerUrl}')`,
          backgroundSize:     'cover',
          backgroundPosition: 'center top',
        }}
      >
        <div className="absolute inset-0 bg-black/55" />
        <div className="relative z-10 flex flex-col items-center px-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl} alt={nomeSistema} className="w-16 h-16 object-contain mb-3 drop-shadow-2xl" />
          <h1 className="text-white text-2xl md:text-3xl font-black tracking-wider drop-shadow-lg">
            Histórico de Resultados
          </h1>
          <p className="text-sm mt-1 drop-shadow" style={{ color: '#FFC107' }}>
            Consulte os contemplados de todas as edições encerradas.
          </p>

          {/* Abas dos prêmios */}
          <div className="flex gap-2 mt-6 flex-wrap justify-center">
            {abas.map((aba, i) => (
              <button
                key={i}
                onClick={() => setAbaAtiva(i)}
                className="px-4 py-1.5 rounded-full text-sm font-semibold transition-all"
                style={
                  abaAtiva === i
                    ? { background: '#FFC107', color: '#1B5E20' }
                    : { background: 'rgba(255,255,255,0.2)', color: '#fff' }
                }
                onMouseEnter={e => { if (abaAtiva !== i) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.3)' }}
                onMouseLeave={e => { if (abaAtiva !== i) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.2)' }}
              >
                {aba}
              </button>
            ))}
          </div>
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

              {/* Dezenas sorteadas */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 className="font-bold text-gray-600 mb-4 text-xs uppercase tracking-widest">
                  Dezenas Sorteadas ({dezenasAba.length})
                </h3>
                {dezenasAba.length === 0 ? (
                  <div className="text-center py-6 text-gray-400">
                    <p className="text-sm font-medium">Sem dezenas registradas.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-7 gap-2">
                    {dezenasAba.map((n, i) => (
                      <div
                        key={i}
                        className="w-9 h-9 flex items-center justify-center rounded-full text-sm font-bold text-gray-700 bg-white border-2 border-gray-200 shadow-sm"
                      >
                        {String(n).padStart(2, '0')}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── COLUNA DIREITA ──────────────────────────────────────────── */}
            <div className="lg:col-span-3 space-y-4">

              {/* Contemplados */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-bold text-gray-800">Contemplados</h3>
                  {ganhadoresAba.length > 0 && (
                    <span
                      className="text-xs font-bold px-3 py-1 rounded-full"
                      style={{ background: '#FFC107', color: '#1B5E20' }}
                    >
                      {ganhadoresAba.length} ganhador{ganhadoresAba.length !== 1 ? 'es' : ''}
                    </span>
                  )}
                </div>

                {ganhadoresAba.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    <Trophy size={40} className="mx-auto mb-3 opacity-25" />
                    <p className="font-medium text-gray-500">Sem contemplados registrados.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {ganhadoresAba.map((g, i) => (
                      <div key={i} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">
                              Título Nº
                            </p>
                            <p className="font-black text-gray-800 text-lg font-mono">
                              {g.cartela?.numero ?? '---'}
                            </p>
                            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                              <span className="flex items-center gap-1.5 text-xs text-gray-500">
                                <span
                                  className="w-2 h-2 rounded-full inline-block"
                                  style={{ background: '#2E7D32' }}
                                />
                                {g.cartela?.status === 'vendida' ? 'Presencial' : 'Online'}
                              </span>
                              {g.cartela?.pdv_nome && (
                                <span className="flex items-center gap-1 text-xs text-gray-500">
                                  <MapPin size={11} />
                                  {g.cartela.pdv_nome}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-bold text-gray-900">
                              {g.cartela?.nome_comprador ?? 'Ganhador'}
                            </p>
                            {premioAba > 0 && (
                              <p className="text-xs font-semibold mt-1" style={{ color: '#2E7D32' }}>
                                {brl(premioAba)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Resumo de todos os sorteios da edição */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Resumo da Edição</p>
                </div>
                <div className="divide-y divide-gray-50">
                  {Array.from({ length: 5 }, (_, i) => {
                    const s  = sorteiosData.find(s => s.numero_sorteio === i + 1)
                    const gs = ganhadores.filter(g => g.sorteio_numero === i + 1)
                    return (
                      <button
                        key={i}
                        onClick={() => setAbaAtiva(i)}
                        className="w-full px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                            style={
                              abaAtiva === i
                                ? { background: '#FFC107', color: '#1B5E20' }
                                : { background: '#f3f4f6', color: '#6b7280' }
                            }
                          >
                            {i + 1}
                          </span>
                          <span className="text-sm font-medium text-gray-700">{abas[i]}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-semibold" style={{ color: '#2E7D32' }}>
                            {s && s.valor_premio > 0 ? brl(s.valor_premio) : '—'}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {gs.length > 0
                              ? `${gs.length} contemplado${gs.length !== 1 ? 's' : ''}`
                              : 'Sem ganhadores'}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
