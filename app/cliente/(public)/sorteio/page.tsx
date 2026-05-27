'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Download, Calendar } from 'lucide-react'
import { useConfig } from '@/lib/config-client'

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface EdicaoAtiva {
  id: string; numero: number; data_sorteio: string
  hora_sorteio: string; premio_principal: number; valor_unitario: number
  status: string; total_cartelas: number
}
interface SorteioRow {
  id: string; numero_sorteio: number; valor_premio: number
  status: string; dezenas_sorteadas: string[]
  realizado_em: string | null; cartela_vencedora: string | null
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

// ── Helpers ───────────────────────────────────────────────────────────────────
function brl(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function dataBR(iso: string): string {
  if (!iso) return ''
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR')
}

const ABAS = ['1º Prêmio', '2º Prêmio', '3º Prêmio', '4º Prêmio', 'Giro da Sorte']

// ── Componente ────────────────────────────────────────────────────────────────
export default function SorteioPage() {
  const configs = useConfig()

  const logoUrl     = configs.logo_url       || '/logo.png'
  const fundoUrl    = configs.fundo_hero_url || '/fundo.png'
  const nomeSistema = configs.nome_sistema   || 'Recife Cap'

  const [abaAtiva, setAbaAtiva]         = useState(0)
  const [edicao, setEdicao]             = useState<EdicaoAtiva | null>(null)
  const [sorteiosData, setSorteiosData] = useState<SorteioRow[]>([])
  const [dezenas, setDezenas]           = useState<string[][]>([[], [], [], [], []])
  const [ganhadores, setGanhadores]     = useState<Ganhador[]>([])
  const [snapshot, setSnapshot]         = useState<Snapshot | null>(null)
  const [loading, setLoading]           = useState(true)

  const supabase = useRef(createClient()).current

  async function carregarDados() {
    try {
      const res  = await fetch('/api/cliente/sorteio-ativo')
      const data = await res.json()
      if (data.edicao) {
        setEdicao(data.edicao)
        const sorteios: SorteioRow[] = data.sorteios ?? []
        setSorteiosData(sorteios)

        // Agrupar dezenas por numero_sorteio (1-5)
        const grupos: string[][] = [[], [], [], [], []]
        for (const s of sorteios) {
          const idx = s.numero_sorteio - 1
          if (idx >= 0 && idx <= 4) grupos[idx] = s.dezenas_sorteadas ?? []
        }
        setDezenas(grupos)
        setGanhadores(data.ganhadores ?? [])
        if (data.snapshot) setSnapshot(data.snapshot)
      }
    } catch { /* ignora */ }
    finally { setLoading(false) }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  // Realtime — re-carrega quando sorteios ou ganhadores mudam
  useEffect(() => {
    if (!edicao?.id) return
    const channel = supabase
      .channel(`sorteio-live-${edicao.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sorteios', filter: `edicao_id=eq.${edicao.id}` },
        () => carregarDados(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ganhadores' },
        () => carregarDados(),
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [edicao?.id])

  const dezenasAba    = dezenas[abaAtiva] ?? []
  const ganhadoresAba = ganhadores.filter(g => g.sorteio_numero === abaAtiva + 1)
  const premioAba     = sorteiosData.find(s => s.numero_sorteio === abaAtiva + 1)?.valor_premio ?? 0

  const fotosPremios: Record<number, string> = {
    0: snapshot?.premio_1_foto_url         || configs.premio_1_foto_url         || logoUrl,
    1: snapshot?.premio_2_foto_url         || configs.premio_2_foto_url         || logoUrl,
    2: snapshot?.premio_3_foto_url         || configs.premio_3_foto_url         || logoUrl,
    3: snapshot?.premio_4_foto_url         || configs.premio_4_foto_url         || logoUrl,
    4: snapshot?.premio_principal_foto_url || configs.premio_principal_foto_url || logoUrl,
  }

  const bannerUrl = snapshot?.banner_url || configs.banner_sorteio_url || fundoUrl

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <div
        className="relative py-10 flex flex-col items-center justify-center text-center"
        style={{
          backgroundImage: `url('${bannerUrl}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
        }}
      >
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 flex flex-col items-center px-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl} alt={nomeSistema} className="w-20 h-20 object-contain mb-3 drop-shadow-2xl" />
          <h1 className="text-white text-2xl md:text-3xl font-black tracking-wider drop-shadow-lg">
            Confira os contemplados do Recife Cap
          </h1>
          <p className="text-sm mt-1 drop-shadow" style={{ color: '#FFC107' }}>
            Veja os ganhadores dos sorteios e a lista completa de contemplados.
          </p>

          {/* Abas sobre o hero */}
          <div className="flex gap-2 mt-6 flex-wrap justify-center">
            {ABAS.map((aba, i) => (
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
        <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-4 py-2.5 bg-white shadow-sm">
          <Calendar size={16} className="text-gray-400" />
          <span className="text-sm text-gray-700">
            {edicao
              ? `Edição ${edicao.numero} · ${dataBR(edicao.data_sorteio)}`
              : 'Carregando...'}
          </span>
        </div>
        <button
          className="flex items-center gap-2 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow transition-colors"
          style={{ background: '#2E7D32' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#1B5E20'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#2E7D32'}
        >
          <Download size={16} />
          Baixar versão PDF
        </button>
      </div>

      {/* ── CONTEÚDO PRINCIPAL ───────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 pb-12">
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
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

            {/* ── COLUNA ESQUERDA ─────────────────────────────────────────── */}
            <div className="lg:col-span-2 space-y-4">

              {/* Card do prêmio */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-b border-gray-100">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Edição {edicao?.numero ?? '—'}
                  </span>
                  <span
                    className="text-xs font-bold px-3 py-1 rounded-full"
                    style={{ background: '#FFC107', color: '#1B5E20' }}
                  >
                    {ABAS[abaAtiva]}
                  </span>
                </div>
                <div className="p-6 flex flex-col items-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={fotosPremios[abaAtiva]} alt={ABAS[abaAtiva]} className="w-full max-h-40 object-contain rounded-xl" />
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
                    <p className="text-3xl mb-2">🎲</p>
                    <p className="text-sm font-medium">Aguardando sorteio...</p>
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

              {/* Imagem da cartela */}
              <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-100 bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/cartela-preview.png"
                  alt="Cartela Recife Cap"
                  className="w-full object-cover"
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                />
              </div>

              {/* Contemplados */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-bold text-gray-800">Contemplados</h3>
                  {ganhadoresAba.length > 0 && (
                    <span
                      className="text-xs font-bold px-3 py-1 rounded-full animate-pulse"
                      style={{ background: '#FFC107', color: '#1B5E20' }}
                    >
                      🏆 Ganhador!
                    </span>
                  )}
                </div>

                {ganhadoresAba.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    <p className="text-4xl mb-2">🍀</p>
                    <p className="font-medium text-gray-500">Aguardando ganhadores...</p>
                    <p className="text-sm mt-1">Os contemplados aparecerão aqui em tempo real</p>
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
                                  📍 {g.cartela.pdv_nome}
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
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
