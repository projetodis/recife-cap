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

  const [abaAtiva,          setAbaAtiva]          = useState<string>('')
  const [edicaoSelecionada, setEdicaoSelecionada] = useState<string>('')
  const [data,              setData]              = useState<HistoricoData | null>(null)
  const [loading,           setLoading]           = useState(true)
  const [baixandoPdf,       setBaixandoPdf]       = useState(false)

  async function carregarDados(edicaoId?: string) {
    setLoading(true)
    try {
      const url  = edicaoId ? `/api/cliente/historico?edicao=${edicaoId}` : '/api/cliente/historico'
      const res  = await fetch(url)
      const json = await res.json() as HistoricoData
      setData(json)
      if (json.edicao) setEdicaoSelecionada(json.edicao.id)
      if (json.sorteios?.length) setAbaAtiva(json.sorteios[0].id)
    } catch { /* ignora */ }
    finally { setLoading(false) }
  }

  useEffect(() => { carregarDados() }, [])

  function onChangeEdicao(id: string) {
    setEdicaoSelecionada(id)
    setAbaAtiva('')
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

  const sorteioAtual        = sorteiosData.find(s => s.id === abaAtiva)
  const dezenasAba          = sorteioAtual?.dezenas_sorteadas ?? []
  const ganhadoresDoSorteio = sorteioAtual
    ? ganhadores.filter(g => g.sorteio_id === sorteioAtual.id)
    : []
  const premioAba        = sorteioAtual?.valor_premio ?? 0
  const bannerSorteioUrl = sorteioAtual?.arte_url || sorteioAtual?.banner_url || configs.banner_sorteio_url || null
  const nomeAbaAtiva     = sorteioAtual?.premios_edicao?.nome
    || abas[sorteioAtual ? sorteioAtual.numero_sorteio - 1 : 0]
    || 'Prêmio'

  const fotosPremios: Record<number, string> = {
    1: snapshot?.premio_1_foto_url         || sorteiosData.find(s => s.numero_sorteio === 1)?.premios_edicao?.foto_url || premios.find(p => p.ordem === 1)?.foto_url || logoUrl,
    2: snapshot?.premio_2_foto_url         || sorteiosData.find(s => s.numero_sorteio === 2)?.premios_edicao?.foto_url || premios.find(p => p.ordem === 2)?.foto_url || logoUrl,
    3: snapshot?.premio_3_foto_url         || sorteiosData.find(s => s.numero_sorteio === 3)?.premios_edicao?.foto_url || premios.find(p => p.ordem === 3)?.foto_url || logoUrl,
    4: snapshot?.premio_4_foto_url         || sorteiosData.find(s => s.numero_sorteio === 4)?.premios_edicao?.foto_url || premios.find(p => p.ordem === 4)?.foto_url || logoUrl,
    5: snapshot?.premio_principal_foto_url || sorteiosData.find(s => s.numero_sorteio === 5)?.premios_edicao?.foto_url || premios.find(p => p.ordem === 5)?.foto_url || logoUrl,
  }
  const fotoAbaAtiva = fotosPremios[sorteioAtual?.numero_sorteio ?? 0] ?? logoUrl

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
        className="relative overflow-hidden"
        style={{
          background: 'radial-gradient(ellipse at 30% 50%, #2E7D32 0%, #1B5E20 40%, #0D3B16 100%)',
          minHeight:  '420px',
        }}
      >
        {/* Pontos dourados — canto superior direito */}
        <div
          className="absolute top-0 right-0 w-48 h-48 opacity-20 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, #FFC107 1px, transparent 1px)',
            backgroundSize:  '16px 16px',
          }}
        />
        {/* Pontos dourados — canto inferior esquerdo */}
        <div
          className="absolute bottom-0 left-0 w-48 h-48 opacity-20 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, #FFC107 1px, transparent 1px)',
            backgroundSize:  '16px 16px',
          }}
        />
        {/* Arco decorativo direito */}
        <div
          className="absolute -right-24 top-1/2 -translate-y-1/2 w-64 h-64 rounded-full pointer-events-none opacity-10"
          style={{ border: '40px solid #FFC107' }}
        />
        {/* Linha dourada horizontal acima das abas */}
        <div
          className="absolute bottom-16 left-0 right-0 h-px pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(255,193,7,0.4), transparent)' }}
        />

        {/* Conteúdo central */}
        <div
          className="relative z-10 flex flex-col items-center justify-center text-center px-6 pt-16 pb-6"
          style={{ minHeight: '340px' }}
        >
          <h1
            className="font-black text-white leading-tight mb-4"
            style={{ fontSize: 'clamp(48px, 8vw, 96px)' }}
          >
            Histórico de<br />Resultados
          </h1>

          <div className="w-20 h-1 rounded-full mb-5" style={{ background: '#FFC107' }} />

          <p className="text-green-200 text-lg max-w-md">
            Consulte os{' '}
            <span style={{ color: '#FFC107', fontWeight: 700 }}>ganhadores</span>
            {' '}e{' '}
            <span style={{ color: '#FFC107', fontWeight: 700 }}>dezenas sorteadas</span>
            <br />de todas as edições encerradas
          </p>
        </div>

        {/* Abas dentro do hero */}
        <div className="relative z-10 flex justify-center pb-0">
          <div
            className="flex flex-wrap justify-center gap-1 px-3 py-2 rounded-t-2xl"
            style={{
              background:     'rgba(0,0,0,0.35)',
              border:         '1px solid rgba(255,193,7,0.25)',
              borderBottom:   'none',
              backdropFilter: 'blur(8px)',
            }}
          >
            {sorteiosData.length === 0 && !loading && (
              <span className="text-white/40 text-sm px-4 py-2">Sem sorteios registrados</span>
            )}
            {sorteiosData.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setAbaAtiva(s.id)}
                className="px-5 py-2 rounded-xl text-sm font-bold transition-all"
                style={
                  abaAtiva === s.id
                    ? { background: 'linear-gradient(135deg, #FFC107, #FFB300)', color: '#1B5E20' }
                    : { background: 'transparent', color: 'rgba(255,255,255,0.75)' }
                }
                onMouseEnter={e => {
                  if (abaAtiva !== s.id) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)'
                }}
                onMouseLeave={e => {
                  if (abaAtiva !== s.id) (e.currentTarget as HTMLElement).style.background = 'transparent'
                }}
              >
                {s.premios_edicao?.nome || `${i + 1}º Prêmio`}
              </button>
            ))}
          </div>
        </div>
      </section>

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
                    {nomeAbaAtiva}
                  </span>
                </div>
                <div className="p-6 flex flex-col items-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={fotoAbaAtiva}
                    alt={nomeAbaAtiva}
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
                    const ganhadoresCount = ganhadores.filter(g => g.sorteio_id === s.id).length
                    const isAtivo = s.id === abaAtiva
                    return (
                      <button
                        key={s.id}
                        onClick={() => setAbaAtiva(s.id)}
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
