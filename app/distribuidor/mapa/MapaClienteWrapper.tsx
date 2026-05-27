'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import type { PDVComEstoque } from './page'

const COR_STATUS: Record<string, string> = {
  ativo:       '#10b981',
  sem_estoque: '#f59e0b',
  inativo:     '#6b7280',
}

/* ── Mapa Leaflet inline ─────────────────────────────────────────── */

function MapaDist({ pdvs }: { pdvs: PDVComEstoque[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<any>(null)

  const comGeo = pdvs.filter(p => p.latitude != null && p.longitude != null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    import('leaflet').then(L => {
      // Verificações dentro do .then() para cobrir race conditions do StrictMode
      if (mapRef.current)        return
      if (!containerRef.current) return

      delete (L.Icon.Default.prototype as any)._getIconUrl

      const primeiroGeo = comGeo[0]
      const centerLat   = primeiroGeo?.latitude  ?? -5.7945
      const centerLng   = primeiroGeo?.longitude ?? -35.2110

      let map: any
      try {
        map = L.map(containerRef.current!).setView([centerLat, centerLng], primeiroGeo ? 13 : 12)
      } catch {
        return // "Map container is already initialized"
      }
      mapRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
      }).addTo(map)

      /* Botão "Minha localização" */
      const LocControl = L.Control.extend({
        onAdd() {
          const btn = L.DomUtil.create('button') as HTMLButtonElement
          btn.innerHTML = '🎯 Minha localização'
          btn.style.cssText =
            'background:white;border:1px solid #ccc;padding:6px 10px;' +
            'border-radius:6px;cursor:pointer;font-size:12px;'
          L.DomEvent.on(btn, 'click', e => {
            L.DomEvent.stopPropagation(e)
            navigator.geolocation?.getCurrentPosition(pos => {
              map.setView([pos.coords.latitude, pos.coords.longitude], 16)
            })
          })
          return btn
        },
      })
      new LocControl({ position: 'topright' }).addTo(map)

      /* Marcadores */
      comGeo.forEach(p => {
        const cor     = COR_STATUS[p.status] ?? COR_STATUS.ativo
        const endereco = [p.logradouro, p.numero].filter(Boolean).join(', ')

        const icone = L.divIcon({
          html: `<div style="
            background:${cor};color:white;
            width:36px;height:36px;
            border-radius:50% 50% 50% 0;
            transform:rotate(-45deg);
            display:flex;align-items:center;justify-content:center;
            border:2px solid white;
            box-shadow:0 2px 8px rgba(0,0,0,0.3);
          "><span style="transform:rotate(45deg);font-size:16px;">🏪</span></div>`,
          className:  '',
          iconSize:   [36, 36],
          iconAnchor: [18, 36],
        })

        const marker = L.marker([p.latitude!, p.longitude!], { icon: icone }).addTo(map)

        marker.bindPopup(`
          <div style="font-family:sans-serif;min-width:200px;padding:4px">
            <strong style="font-size:14px">${p.nome}</strong><br/>
            <span style="color:#6b7280;font-size:12px">${p.responsavel_nome}</span><br/>
            <span style="font-size:12px">📍 ${endereco}${p.bairro ? ', ' + p.bairro : ''}</span><br/>
            <span style="font-size:12px">🏙️ ${p.cidade ?? ''} ${p.uf ?? ''}</span><br/>
            ${p.telefone ? `<span style="font-size:12px">📞 ${p.telefone}</span><br/>` : ''}
            <div style="margin-top:8px">
              <a href="https://maps.google.com/?q=${p.latitude},${p.longitude}" target="_blank"
                 style="font-size:11px;color:#10b981;text-decoration:none">
                🗺️ Abrir no Maps
              </a>
            </div>
          </div>
        `, { maxWidth: 280 })
      })

      /* Ajuste de zoom */
      if (comGeo.length > 1) {
        const group = L.featureGroup(comGeo.map(p => L.marker([p.latitude!, p.longitude!])))
        map.fitBounds(group.getBounds().pad(0.15))
      } else if (comGeo.length === 1) {
        map.setView([comGeo[0].latitude!, comGeo[0].longitude!], 14)
      } else {
        map.setView([-5.7945, -35.2110], 13)
      }
    })

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"
      />
      <div id="mapa-distribuidor" ref={containerRef} style={{ height: 'clamp(400px, 60vh, 500px)', width: '100%', borderRadius: '12px' }} />
    </>
  )
}

/* ── Wrapper principal ───────────────────────────────────────────── */

export default function MapaClienteWrapper({ pdvs }: { pdvs: PDVComEstoque[] }) {
  const comGeo = pdvs.filter(p => p.latitude != null && p.longitude != null)
  const semGeo = pdvs.filter(p => p.latitude == null || p.longitude == null)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 lg:mb-6 gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-semibold text-gray-900">Mapa dos PDVs</h1>
          <p className="text-sm text-gray-500 mt-1">
            {comGeo.length} no mapa · {semGeo.length} sem localização
          </p>
        </div>
        <Link
          href="/distribuidor/rotas/nova"
          className="flex-shrink-0 px-3 lg:px-4 py-2 min-h-11 flex items-center bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition"
        >
          🛵 <span className="hidden sm:inline ml-1">Criar rota de entrega</span><span className="sm:hidden ml-1">Nova rota</span>
        </Link>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-3 gap-2 lg:gap-4 mb-4 lg:mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 mb-1">Total de PDVs</p>
          <p className="text-3xl font-semibold text-gray-900">{pdvs.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 mb-1">PDVs no mapa</p>
          <p className="text-3xl font-semibold text-emerald-600">{comGeo.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 mb-1">Sem localização</p>
          <p className="text-3xl font-semibold text-amber-500">{semGeo.length}</p>
        </div>
      </div>

      {/* Legenda */}
      <div className="flex gap-5 mb-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />Ativo
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />Sem estoque
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-gray-400 inline-block" />Inativo
        </span>
      </div>

      {/* Mapa — sempre visível */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
        <MapaDist pdvs={pdvs} />
      </div>

      {/* Lista de PDVs sem localização */}
      {semGeo.length > 0 && (
        <div className="bg-white rounded-xl border border-amber-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-amber-100 bg-amber-50">
            <p className="text-sm font-medium text-amber-800">
              ⚠️ {semGeo.length} PDV{semGeo.length > 1 ? 's' : ''} sem localização no mapa
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              Adicione a localização para incluir estes PDVs nas rotas de entrega
            </p>
          </div>
          <ul className="divide-y divide-gray-100">
            {semGeo.map(p => (
              <li key={p.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{p.nome}</p>
                  <p className="text-xs text-gray-400">
                    {[p.logradouro, p.numero, p.bairro, p.cidade]
                      .filter(Boolean).join(' · ') || p.responsavel_nome}
                  </p>
                </div>
                <Link
                  href="/distribuidor/pdvs/novo"
                  className="text-xs font-medium text-emerald-600 hover:text-emerald-700 border border-emerald-200 hover:border-emerald-300 px-3 py-1.5 rounded-lg transition"
                >
                  Definir localização
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
