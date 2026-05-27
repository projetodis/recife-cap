'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

const MapaLeaflet = dynamic(() => import('@/components/maps/MapaLeaflet'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center bg-gray-900" style={{ height: '280px' }}>
      <p className="text-sm text-gray-400">Carregando mapa...</p>
    </div>
  ),
})

type Ponto = {
  parada_id: string
  pdv_id: string
  nome: string
  lat: number | null
  lng: number | null
  status: string
  responsavel?: string
  telefone?: string
  endereco?: string
  bairro?: string
  cidade?: string
  uf?: string
  cartelas: number
  visitado: boolean
  visitado_em?: string
  ordem: number
}

interface Props {
  nomeMotoboy: string
  nomeRota: string
  rotaId: string | null
  rotaStatus: string | null
  pontos: Ponto[]
}

function formatarHora(iso?: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function montarEndereco(p: Ponto): string {
  const partes = [p.endereco, p.bairro, p.cidade, p.uf]
    .filter(v => v && v.trim() !== '')
  return partes.length > 0 ? partes.join(' · ') : 'Endereço não informado'
}

async function geocodificarEndereco(p: Ponto): Promise<{ lat: number; lng: number } | null> {
  const query = [p.endereco, p.bairro, p.cidade, p.uf, 'Brasil']
    .filter(v => v && v.trim() !== '')
    .join(', ')
  if (!query) return null
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
      { headers: { 'User-Agent': 'RecifeCap/1.0' } }
    )
    const data = await res.json()
    if (data[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  } catch (_e) {
    console.warn('Geocoding falhou para:', query)
  }
  return null
}

function calcularDistancia(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function otimizarPontos(pts: Ponto[], startLat: number, startLng: number): Ponto[] {
  const pendentes     = pts.filter(p => !p.visitado && p.lat != null && p.lng != null)
  const semGeo        = pts.filter(p => !p.visitado && (p.lat == null || p.lng == null))
  const jaVisitados   = pts.filter(p => p.visitado)

  const restantes  = [...pendentes]
  const ordenados: Ponto[] = []
  let curLat = startLat, curLng = startLng

  while (restantes.length > 0) {
    let melhorIdx = 0, melhorDist = Infinity
    restantes.forEach((p, i) => {
      const d = calcularDistancia(curLat, curLng, p.lat!, p.lng!)
      if (d < melhorDist) { melhorDist = d; melhorIdx = i }
    })
    const prox = restantes.splice(melhorIdx, 1)[0]
    ordenados.push(prox)
    curLat = prox.lat!; curLng = prox.lng!
  }

  return [
    ...jaVisitados,
    ...ordenados.map((p, i) => ({ ...p, ordem: jaVisitados.length + i + 1 })),
    ...semGeo,
  ]
}

export default function RotaClienteWrapper({ nomeMotoboy, nomeRota, rotaId, pontos }: Props) {
  const [pontosState, setPontosState] = useState<Ponto[]>(pontos)
  const [paradaAtual, setParadaAtual] = useState<Ponto | null>(
    pontos.find(p => !p.visitado) ?? null
  )
  const [vistaLista, setVistaLista]             = useState(false)
  const [concluida, setConcluida]               = useState(
    pontos.length > 0 && pontos.every(p => p.visitado)
  )
  const [carregando, setCarregando]             = useState(false)
  const [localizacaoAtual, setLocalizacaoAtual] = useState<{ lat: number; lng: number } | null>(null)
  const [rotaCoords, setRotaCoords]             = useState<[number, number][]>([])
  const [distanciaKm, setDistanciaKm]           = useState(0)

  const visitados = pontosState.filter(p => p.visitado).length
  const total     = pontosState.length
  const progresso = total > 0 ? Math.round((visitados / total) * 100) : 0

  const primeiroComGeo = pontosState.find(p => !p.visitado && p.lat && p.lng)
    ?? pontosState.find(p => p.lat && p.lng)
  const centroLat = primeiroComGeo?.lat ?? -5.7945
  const centroLng = primeiroComGeo?.lng ?? -35.2110

  const pontosDoMapa = pontosState
    .filter(p => p.lat !== null && p.lng !== null)
    .map(p => ({
      id:               p.parada_id,
      nome:             p.nome,
      lat:              p.lat!,
      lng:              p.lng!,
      status:           p.status,
      responsavel:      p.responsavel,
      telefone:         p.telefone,
      endereco:         p.endereco,
      bairro:           p.bairro,
      cidade:           p.cidade,
      cartelas_estoque: p.cartelas,
      visitado:         p.visitado,
      ordem:            p.ordem,
    }))

  const mapaKey = pontosState.map(p => `${p.parada_id}:${p.visitado}:${p.lat}:${p.lng}`).join(',')

  async function buscarRotaOSRM(pts: Ponto[]): Promise<void> {
    const comGeo = pts.filter(p => !p.visitado && p.lat != null && p.lng != null)
    if (comGeo.length < 2) {
      setRotaCoords([])
      setDistanciaKm(0)
      return
    }
    try {
      const coordStr = comGeo.map(p => `${p.lng!},${p.lat!}`).join(';')
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson`
      )
      if (!res.ok) return
      const data = await res.json()
      const rota = data.routes?.[0]
      if (!rota) return
      const coords: [number, number][] = (rota.geometry.coordinates as [number, number][]).map(
        ([lng, lat]) => [lat, lng]
      )
      setRotaCoords(coords)
      setDistanciaKm(Math.round(rota.distance / 100) / 10)
    } catch (_e) {
      // OSRM indisponível, mantém rota atual
    }
  }

  useEffect(() => {
    if (!navigator?.geolocation) {
      buscarRotaOSRM(pontos)
      return
    }

    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords
        setLocalizacaoAtual({ lat, lng })
        const otimizados = otimizarPontos(pontos, lat, lng)
        setPontosState(otimizados)
        setParadaAtual(otimizados.find(p => !p.visitado) ?? null)
        buscarRotaOSRM(otimizados)
      },
      () => buscarRotaOSRM(pontos),
      { enableHighAccuracy: true, timeout: 10000 }
    )

    const watchId = navigator.geolocation.watchPosition(
      pos => setLocalizacaoAtual({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000 }
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Geocoding para PDVs sem coordenadas (Nominatim, 1 req/s)
  useEffect(() => {
    const semGeo = pontos.filter(p => p.lat === null || p.lng === null)
    if (semGeo.length === 0) return
    let cancelado = false

    async function geocodar() {
      for (const p of semGeo) {
        if (cancelado) break
        const coords = await geocodificarEndereco(p)
        if (coords && !cancelado) {
          setPontosState(prev => prev.map(pt =>
            pt.parada_id === p.parada_id ? { ...pt, lat: coords.lat, lng: coords.lng } : pt
          ))
        }
        await new Promise(r => setTimeout(r, 1100)) // respeita limite Nominatim 1 req/s
      }
    }

    geocodar()
    return () => { cancelado = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function navegarParaParada(p: Ponto) {
    if (!p.lat || !p.lng) return
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}&travelmode=driving`,
      '_blank',
    )
  }

  function navegarRotaCompleta() {
    const restantes = pontosState.filter(p => !p.visitado)
    const comGeo    = restantes.filter(p => p.lat && p.lng)

    if (comGeo.length >= 2) {
      const origin    = `${comGeo[0].lat},${comGeo[0].lng}`
      const dest      = `${comGeo[comGeo.length - 1].lat},${comGeo[comGeo.length - 1].lng}`
      const waypoints = comGeo.slice(1, -1).map(p => `${p.lat},${p.lng}`).join('|')
      const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}${waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : ''}&travelmode=driving`
      window.open(url, '_blank')
    } else if (comGeo.length === 1) {
      navegarParaParada(comGeo[0])
    } else if (restantes.length > 0) {
      const query = encodeURIComponent([restantes[0].endereco, restantes[0].cidade].filter(Boolean).join(', '))
      window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank')
    }
  }

  function navegarWaze(p: Ponto) {
    if (!p.lat || !p.lng) return
    window.open(`https://waze.com/ul?ll=${p.lat},${p.lng}&navigate=yes`, '_blank')
  }

  async function marcarEntregue(parada: Ponto) {
    if (carregando) return
    setCarregando(true)
    const agora = new Date().toISOString()

    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()

    await supabase
      .from('paradas_rota')
      .update({ status: 'visitado', visitado_em: agora })
      .eq('id', parada.parada_id)

    const atualizados = pontosState.map(p =>
      p.parada_id === parada.parada_id
        ? { ...p, visitado: true, status: 'visitado', visitado_em: agora }
        : p
    )
    setPontosState(atualizados)

    const proxima = atualizados.find(p => !p.visitado) ?? null
    setParadaAtual(proxima)

    if (!proxima && rotaId) {
      await supabase
        .from('rotas_entrega')
        .update({ status: 'concluida', concluida_em: agora })
        .eq('id', rotaId)
      setConcluida(true)
      setRotaCoords([])
      setDistanciaKm(0)
    } else if (proxima) {
      await buscarRotaOSRM(atualizados)
    }

    setCarregando(false)
  }

  /* ── Sem rota ───────────────────────────────────────────────────── */
  if (!rotaId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center px-6">
        <p className="text-6xl mb-5">🛵</p>
        <p className="text-xl font-semibold text-gray-200 mb-2">Sem rota para hoje</p>
        <p className="text-gray-500 text-sm">Aguarde seu distribuidor criar uma rota.</p>
      </div>
    )
  }

  /* ── Rota concluída ─────────────────────────────────────────────── */
  if (concluida) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center px-6">
        <p className="text-6xl mb-4">🎉</p>
        <p className="text-2xl font-bold text-emerald-400 mb-2">Rota concluída!</p>
        <p className="text-gray-400 text-sm">
          {total} parada{total !== 1 ? 's' : ''} entregue{total !== 1 ? 's' : ''} hoje
        </p>
      </div>
    )
  }

  /* ── UI principal ───────────────────────────────────────────────── */
  return (
    <div className="h-screen flex flex-col overflow-hidden">

      {/* HEADER */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 pt-4 pb-3 flex-shrink-0">

        {/* Linha 1: saudação + botões de navegação */}
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-gray-400">Olá, {nomeMotoboy}</p>
          <div className="flex gap-1.5">
            {paradaAtual?.lat && (
              <button
                onClick={() => navegarWaze(paradaAtual)}
                className="text-xs px-2.5 py-1 bg-blue-900/60 hover:bg-blue-800 text-blue-300 rounded-full transition"
              >
                🔵 Waze
              </button>
            )}
            {pontosState.some(p => !p.visitado && p.lat) && (
              <button
                onClick={navegarRotaCompleta}
                className="text-xs px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-full transition"
              >
                🗺️ Rota completa
              </button>
            )}
          </div>
        </div>

        {/* Linha 2: nome da rota */}
        <p className="text-base font-semibold leading-tight mb-2">{nomeRota}</p>

        {/* Linha 3: barra de progresso */}
        <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden mb-2">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${progresso}%` }}
          />
        </div>

        {/* Linha 4: contagem + distância + toggle */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">
            {visitados} de {total} concluídas
            {distanciaKm > 0 && (
              <span className="ml-2 text-emerald-400">· {distanciaKm} km restante</span>
            )}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setVistaLista(false)}
              className={`text-xs px-3 py-1.5 rounded-full transition ${
                !vistaLista ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              🗺️ Mapa
            </button>
            <button
              onClick={() => setVistaLista(true)}
              className={`text-xs px-3 py-1.5 rounded-full transition ${
                vistaLista ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              📋 Lista
            </button>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto">
        {!vistaLista ? (
          <MapaLeaflet
            key={mapaKey}
            pontos={pontosDoMapa}
            altura="calc(100vh - 180px)"
            mostrarRota
            centroLat={centroLat}
            centroLng={centroLng}
            rotaCoords={rotaCoords}
            locAtual={localizacaoAtual}
          />
        ) : (
          <div className="p-3 space-y-2 pb-6">
            {pontosState.map(p => {
              const isAtual    = paradaAtual?.parada_id === p.parada_id
              const isVisitada = p.visitado

              return (
                <div
                  key={p.parada_id}
                  className={`rounded-2xl border p-4 transition ${
                    isVisitada
                      ? 'bg-gray-900 border-gray-800'
                      : isAtual
                      ? 'bg-gray-900 border-amber-500/70'
                      : 'bg-gray-900 border-gray-800'
                  }`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                      isVisitada ? 'bg-emerald-600 text-white'
                      : isAtual  ? 'bg-amber-500 text-white'
                      :            'bg-gray-700 text-gray-300'
                    }`}>
                      {isVisitada ? '✓' : p.ordem}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold truncate leading-tight ${
                        isVisitada ? 'text-gray-400' : 'text-white'
                      }`}>
                        {p.nome}
                      </p>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{montarEndereco(p)}</p>
                    </div>
                    {isVisitada ? (
                      <span className="text-xs bg-emerald-900/50 text-emerald-400 px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0">
                        ✅ {formatarHora(p.visitado_em)}
                      </span>
                    ) : (
                      <span className="text-xs bg-gray-800 text-gray-400 px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0">
                        📦 {p.cartelas}
                      </span>
                    )}
                  </div>

                  {!isVisitada && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => navegarParaParada(p)}
                        className="py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition active:scale-95"
                      >
                        📍 Esta parada
                      </button>
                      <button
                        onClick={() => marcarEntregue(p)}
                        disabled={carregando}
                        className="py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition active:scale-95"
                      >
                        {carregando && isAtual ? '⏳' : '✅'} Entregue
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* FOOTER */}
      {paradaAtual && (
        <div className="bg-gray-900 border-t border-emerald-500 p-4 flex-shrink-0">
          {/* PDV atual */}
          <div className="flex items-start gap-3 mb-4">
            <span className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center text-base font-bold flex-shrink-0">
              {paradaAtual.ordem}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold text-white leading-tight truncate">{paradaAtual.nome}</p>
              <p className="text-xs text-gray-400 truncate mt-0.5">{montarEndereco(paradaAtual)}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-gray-400">Cartelas</p>
              <p className="text-3xl font-bold text-emerald-400 leading-none">{paradaAtual.cartelas}</p>
            </div>
          </div>

          {/* Botões */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => navegarParaParada(paradaAtual)}
              className="flex flex-col items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-2xl transition active:scale-95"
            >
              <span className="text-2xl">📍</span>
              <span className="text-xs font-semibold">Esta parada</span>
            </button>

            <button
              onClick={navegarRotaCompleta}
              className="flex flex-col items-center gap-1.5 bg-blue-800 hover:bg-blue-900 text-white py-3.5 rounded-2xl transition active:scale-95"
            >
              <span className="text-2xl">🗺️</span>
              <span className="text-xs font-semibold">Rota completa</span>
            </button>

            {paradaAtual.telefone && (
              <button
                onClick={() => window.open(`tel:${paradaAtual.telefone!.replace(/\D/g, '')}`)}
                className="flex flex-col items-center gap-1.5 bg-gray-700 hover:bg-gray-600 text-white py-3.5 rounded-2xl transition active:scale-95"
              >
                <span className="text-2xl">📞</span>
                <span className="text-xs font-semibold">Ligar</span>
              </button>
            )}

            <button
              onClick={() => marcarEntregue(paradaAtual)}
              disabled={carregando}
              className={`flex flex-col items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-3.5 rounded-2xl transition active:scale-95 ${
                paradaAtual.telefone ? '' : 'col-span-2'
              }`}
            >
              <span className="text-2xl">{carregando ? '⏳' : '✅'}</span>
              <span className="text-xs font-semibold">Entregue</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
