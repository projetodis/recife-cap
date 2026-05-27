'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import type { MapPonto } from '@/components/maps/MapaLeaflet'

const MapaLeaflet = dynamic(() => import('@/components/maps/MapaLeaflet'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center bg-gray-50" style={{ height: '350px' }}>
      <p className="text-sm text-gray-400">Carregando mapa...</p>
    </div>
  ),
})

interface PDVComEstoque {
  id: string
  nome: string
  bairro: string | null
  cidade: string | null
  latitude: number | null
  longitude: number | null
  cartelas_estoque: number
}

interface Motoboy {
  id: string
  nome: string
  veiculo: string
}

interface ParadaSelecionada {
  pdv: PDVComEstoque
  quantidade: number
  ordem: number
}

function hojeISO() {
  return new Date().toISOString().split('T')[0]
}

function nomeDefault() {
  return `Rota do dia - ${new Date().toLocaleDateString('pt-BR')}`
}

function calcDist(a: PDVComEstoque, b: PDVComEstoque) {
  if (a.latitude == null || a.longitude == null || b.latitude == null || b.longitude == null) return Infinity
  const dlat = a.latitude - b.latitude
  const dlng = a.longitude - b.longitude
  return Math.sqrt(dlat * dlat + dlng * dlng)
}

function gerarLinkNavegacao(paradas: ParadaSelecionada[]): string {
  const comGeo = paradas.filter(p => p.pdv.latitude != null && p.pdv.longitude != null)
  if (comGeo.length < 2) return ''
  const origin      = `${comGeo[0].pdv.latitude},${comGeo[0].pdv.longitude}`
  const destination = `${comGeo[comGeo.length - 1].pdv.latitude},${comGeo[comGeo.length - 1].pdv.longitude}`
  const waypoints   = comGeo.slice(1, -1).map(p => `${p.pdv.latitude},${p.pdv.longitude}`).join('|')
  const base = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`
  return waypoints ? `${base}&waypoints=${waypoints}` : base
}

function calcDistanciaTotal(paradas: ParadaSelecionada[]): number {
  let total = 0
  for (let i = 0; i < paradas.length - 1; i++) {
    const d = calcDist(paradas[i].pdv, paradas[i + 1].pdv)
    if (d !== Infinity) total += d
  }
  return Math.round(total * 111)
}

export default function NovaRotaPage() {
  const router = useRouter()

  const [motoboys, setMotoboys]   = useState<Motoboy[]>([])
  const [pdvs, setPdvs]           = useState<PDVComEstoque[]>([])
  const [motoboyId, setMotoboyId] = useState('')
  const [nomeRota, setNomeRota]   = useState(nomeDefault())
  const [dataRota, setDataRota]   = useState(hojeISO())
  const [paradas, setParadas]     = useState<ParadaSelecionada[]>([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro]           = useState('')
  const [toast, setToast]         = useState('')

  useEffect(() => {
    async function carregar() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: dist } = await supabase
        .from('distribuidores').select('id').eq('user_id', user.id).single()
      if (!dist) return

      const [{ data: mb }, { data: pv }] = await Promise.all([
        supabase
          .from('motoboys')
          .select('id, nome, veiculo')
          .eq('distribuidor_id', dist.id)
          .eq('status', 'ativo'),
        supabase
          .from('pontos_de_venda')
          .select('id, nome, bairro, cidade, latitude, longitude')
          .eq('distribuidor_id', dist.id)
          .eq('status', 'ativo'),
      ])

      setMotoboys(mb ?? [])

      const pvList = pv ?? []
      const pvIds  = pvList.map(p => p.id)

      if (pvIds.length === 0) { setPdvs([]); return }

      const { data: cartelas } = await supabase
        .from('cartelas')
        .select('pdv_id')
        .in('pdv_id', pvIds)
        .eq('status', 'em_estoque_pdv')

      const contagem: Record<string, number> = {}
      for (const c of cartelas ?? []) {
        if (!c.pdv_id) continue
        contagem[c.pdv_id] = (contagem[c.pdv_id] ?? 0) + 1
      }

      setPdvs(pvList.map(p => ({
        id:               p.id,
        nome:             p.nome,
        bairro:           p.bairro   ?? null,
        cidade:           p.cidade   ?? null,
        latitude:         p.latitude  != null ? parseFloat(p.latitude)  : null,
        longitude:        p.longitude != null ? parseFloat(p.longitude) : null,
        cartelas_estoque: contagem[p.id] ?? 0,
      })))
    }
    carregar()
  }, [])

  function adicionarPDV(pdv: PDVComEstoque) {
    if (paradas.find(p => p.pdv.id === pdv.id)) return
    setParadas(prev => [
      ...prev,
      { pdv, quantidade: pdv.cartelas_estoque, ordem: prev.length + 1 },
    ])
  }

  function removerParada(pdvId: string) {
    setParadas(prev => {
      const filtrado = prev.filter(p => p.pdv.id !== pdvId)
      return filtrado.map((p, i) => ({ ...p, ordem: i + 1 }))
    })
  }

  function moverParada(idx: number, direcao: 'cima' | 'baixo') {
    setParadas(prev => {
      const novas = [...prev]
      const alvo  = direcao === 'cima' ? idx - 1 : idx + 1
      if (alvo < 0 || alvo >= novas.length) return prev
      ;[novas[idx], novas[alvo]] = [novas[alvo], novas[idx]]
      return novas.map((p, i) => ({ ...p, ordem: i + 1 }))
    })
  }

  function setQuantidade(pdvId: string, qtd: number) {
    setParadas(prev => prev.map(p =>
      p.pdv.id === pdvId ? { ...p, quantidade: qtd } : p
    ))
  }

  function otimizarRota() {
    if (paradas.length < 2) return
    const restantes   = [...paradas]
    const otimizadas: ParadaSelecionada[] = [restantes.shift()!]
    while (restantes.length > 0) {
      const ultimo = otimizadas[otimizadas.length - 1]
      let menorDist    = Infinity
      let idxProximo   = 0
      restantes.forEach((p, i) => {
        const d = calcDist(ultimo.pdv, p.pdv)
        if (d < menorDist) { menorDist = d; idxProximo = i }
      })
      otimizadas.push(restantes.splice(idxProximo, 1)[0])
    }
    setParadas(otimizadas.map((p, i) => ({ ...p, ordem: i + 1 })))
    setToast('Rota otimizada!')
    setTimeout(() => setToast(''), 3000)
  }

  async function handleCriarRota(e: React.FormEvent) {
    e.preventDefault()
    if (paradas.length === 0) { setErro('Adicione pelo menos um PDV à rota.'); return }
    if (!motoboyId)           { setErro('Selecione um motoboy.'); return }
    setErro('')
    setCarregando(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Não autenticado')

      const { data: distribuidor } = await supabase
        .from('distribuidores').select('id').eq('user_id', user.id).single()
      if (!distribuidor) throw new Error('Distribuidor não encontrado')

      const { data: rotaCriada, error: rotaError } = await supabase
        .from('rotas_entrega')
        .insert({
          motoboy_id:      motoboyId,
          distribuidor_id: distribuidor.id,
          nome:            nomeRota,
          data_rota:       dataRota,
          status:          'pendente',
        })
        .select('id')
        .single()

      if (rotaError || !rotaCriada?.id) {
        console.error('[rotas] Erro ao criar rota:', rotaError)
        throw new Error(rotaError?.message ?? 'ID da rota não retornado')
      }

      const { error: paradasError } = await supabase
        .from('paradas_rota')
        .insert(paradas.map(p => ({
          rota_id:             rotaCriada.id,
          pdv_id:              p.pdv.id,
          ordem:               p.ordem,
          quantidade_cartelas: p.quantidade,
          status:              'pendente',
        })))

      if (paradasError) {
        console.error('[rotas] Erro ao criar paradas:', paradasError)
        throw new Error(paradasError.message)
      }

      router.push('/distribuidor/rotas')
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Erro ao criar rota')
    } finally {
      setCarregando(false)
    }
  }

  const pdvsDisponiveis = pdvs.filter(p => !paradas.find(par => par.pdv.id === p.id))
  const totalCartelas   = paradas.reduce((acc, p) => acc + p.quantidade, 0)
  const motoboyNome     = motoboys.find(m => m.id === motoboyId)?.nome

  const pontosDoMapa: MapPonto[] = paradas
    .filter(p => p.pdv.latitude != null && p.pdv.longitude != null)
    .map(p => ({
      id:               p.pdv.id,
      nome:             p.pdv.nome,
      lat:              p.pdv.latitude!,
      lng:              p.pdv.longitude!,
      bairro:           p.pdv.bairro   ?? undefined,
      cidade:           p.pdv.cidade   ?? undefined,
      cartelas_estoque: p.quantidade,
      ordem:            p.ordem,
    }))

  const mapaKey         = paradas.map(p => `${p.pdv.id}:${p.ordem}`).join(',')
  const linkNavegacao   = gerarLinkNavegacao(paradas)
  const distanciaTotal  = calcDistanciaTotal(paradas)

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Criar rota de entrega</h1>
        <p className="text-sm text-gray-500 mt-1">Monte a sequência de paradas e o motoboy recebe no app</p>
      </div>

      <form onSubmit={handleCriarRota} className="space-y-5">

        {/* Grid: 3 colunas */}
        <div className="grid grid-cols-3 gap-5 items-start">

          {/* Col 1 — Configuração */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">Configuração</h2>

            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Motoboy *</label>
              <select
                value={motoboyId}
                onChange={e => setMotoboyId(e.target.value)}
                required
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Selecione...</option>
                {motoboys.map(m => (
                  <option key={m.id} value={m.id}>🛵 {m.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Nome da rota</label>
              <input
                type="text"
                value={nomeRota}
                onChange={e => setNomeRota(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Data da rota</label>
              <input
                type="date"
                value={dataRota}
                onChange={e => setDataRota(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Resumo inline */}
            {paradas.length > 0 && (
              <div className="pt-3 border-t border-gray-100 space-y-1.5">
                <p className="text-xs font-medium text-gray-700 mb-2">Resumo</p>
                {[
                  ['Paradas',   paradas.length],
                  ['Cartelas',  totalCartelas],
                  ...(motoboyNome ? [['Motoboy', motoboyNome]] : []),
                ].map(([label, val]) => (
                  <div key={String(label)} className="flex justify-between text-xs">
                    <span className="text-gray-500">{label}</span>
                    <span className="font-medium text-gray-900 truncate ml-2 max-w-[100px]">{val}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cols 2-3 — Seleção */}
          <div className="col-span-2 grid grid-cols-2 gap-4">

            {/* Painel esquerdo: disponíveis */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col min-h-0">
              <h2 className="text-sm font-semibold text-gray-900 mb-3 flex-shrink-0">
                PDVs disponíveis
                <span className="ml-1.5 text-xs font-normal text-gray-400">({pdvsDisponiveis.length})</span>
              </h2>
              <div className="space-y-2 overflow-y-auto max-h-72 pr-0.5">
                {pdvsDisponiveis.length > 0 ? pdvsDisponiveis.map(pdv => (
                  <div
                    key={pdv.id}
                    className="p-3 rounded-lg border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{pdv.nome}</p>
                        <p className="text-xs text-gray-400 truncate mt-0.5">
                          {[pdv.bairro, pdv.cidade].filter(Boolean).join(' · ') || '—'}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {pdv.latitude == null && (
                            <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                              📍 Sem GPS
                            </span>
                          )}
                          {pdv.cartelas_estoque > 0 ? (
                            <span className="text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                              📦 {pdv.cartelas_estoque} em estoque
                            </span>
                          ) : (
                            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                              Sem estoque
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => adicionarPDV(pdv)}
                        className="flex-shrink-0 text-xs font-medium text-emerald-600 border border-emerald-200 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 px-2.5 py-1.5 rounded-lg transition"
                      >
                        + Adicionar
                      </button>
                    </div>
                  </div>
                )) : (
                  <p className="text-xs text-gray-400 text-center py-8">
                    {pdvs.length === 0
                      ? 'Nenhum PDV cadastrado'
                      : 'Todos os PDVs foram adicionados'}
                  </p>
                )}
              </div>
            </div>

            {/* Painel direito: ordem da rota */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-3 flex-shrink-0">
                <h2 className="text-sm font-semibold text-gray-900">
                  Ordem da rota
                  <span className="ml-1.5 text-xs font-normal text-gray-400">({paradas.length})</span>
                </h2>
                {paradas.length >= 2 && (
                  <button
                    type="button"
                    onClick={otimizarRota}
                    className="text-xs font-medium text-violet-600 border border-violet-200 hover:bg-violet-50 px-2.5 py-1.5 rounded-lg transition whitespace-nowrap"
                  >
                    ⚡ Otimizar rota
                  </button>
                )}
              </div>
              <div className="space-y-2 overflow-y-auto max-h-72 pr-0.5">
                {paradas.length > 0 ? paradas.map((p, i) => (
                  <div key={p.pdv.id} className="p-3 rounded-lg border border-gray-100 bg-gray-50">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="w-5 h-5 bg-emerald-500 text-white rounded-full text-xs flex items-center justify-center font-bold flex-shrink-0">
                        {p.ordem}
                      </span>
                      <p className="text-xs font-medium text-gray-900 flex-1 truncate">{p.pdv.nome}</p>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => moverParada(i, 'cima')}
                          disabled={i === 0}
                          className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700 disabled:opacity-20 rounded hover:bg-gray-200 text-sm"
                        >↑</button>
                        <button
                          type="button"
                          onClick={() => moverParada(i, 'baixo')}
                          disabled={i === paradas.length - 1}
                          className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700 disabled:opacity-20 rounded hover:bg-gray-200 text-sm"
                        >↓</button>
                        <button
                          type="button"
                          onClick={() => removerParada(p.pdv.id)}
                          className="w-6 h-6 flex items-center justify-center text-red-400 hover:text-red-600 rounded hover:bg-red-50 text-sm ml-0.5"
                        >✕</button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">Cartelas:</span>
                      <input
                        type="number"
                        value={p.quantidade}
                        onChange={e => setQuantidade(p.pdv.id, parseInt(e.target.value) || 0)}
                        min="0"
                        className="w-16 px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 text-center bg-white"
                      />
                      {p.pdv.cartelas_estoque > 0 && (
                        <span className="text-xs text-gray-400">/ {p.pdv.cartelas_estoque}</span>
                      )}
                    </div>
                  </div>
                )) : (
                  <p className="text-xs text-gray-400 text-center py-8">
                    Clique em "+ Adicionar" no painel ao lado
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mapa */}
        {pontosDoMapa.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-gray-900">Visualização da rota</p>
                {distanciaTotal > 0 && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {paradas.length} parada{paradas.length !== 1 ? 's' : ''} · ~{distanciaTotal} km estimados (linha reta)
                  </p>
                )}
              </div>
              {linkNavegacao && (
                <a
                  href={linkNavegacao}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-blue-600 border border-blue-200 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition whitespace-nowrap flex-shrink-0"
                >
                  🗺️ Testar rota no Maps
                </a>
              )}
            </div>
            <MapaLeaflet
              key={mapaKey}
              pontos={pontosDoMapa}
              altura="350px"
              mostrarRota
            />
          </div>
        )}

        {erro && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
            {erro}
          </div>
        )}

        {/* Rodapé */}
        <div className="flex items-center justify-between pt-1 pb-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={carregando || paradas.length === 0 || !motoboyId}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition"
          >
            {carregando
              ? 'Criando rota...'
              : `🗺️ Criar rota${paradas.length > 0 ? ` · ${paradas.length} paradas, ${totalCartelas} cartelas` : ''}`
            }
          </button>
        </div>
      </form>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-violet-600 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-lg">
          ⚡ {toast}
        </div>
      )}
    </div>
  )
}
