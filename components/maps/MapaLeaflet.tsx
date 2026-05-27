'use client'

import { useEffect, useRef } from 'react'

export interface MapPonto {
  id: string
  nome: string
  lat: number
  lng: number
  status?: string
  responsavel?: string
  telefone?: string
  endereco?: string
  bairro?: string
  cidade?: string
  cartelas_estoque?: number
  cartelas_vendidas?: number
  visitado?: boolean
  ordem?: number
}

interface MapaProps {
  pontos: MapPonto[]
  altura?: string
  mostrarRota?: boolean
  centroLat?: number
  centroLng?: number
}

const COR_STATUS: Record<string, string> = {
  ativo:       '#10b981',
  sem_estoque: '#f59e0b',
  inativo:     '#6b7280',
  visitado:    '#3b82f6',
  pendente:    '#ef4444',
}

export default function MapaLeaflet({
  pontos,
  altura = '500px',
  mostrarRota = false,
  centroLat,
  centroLng,
}: MapaProps) {
  const mapRef       = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (mapRef.current) return
    if (!containerRef.current) return
    if ((containerRef.current as any)._leaflet_id) return

    import('leaflet').then(L => {
      if (mapRef.current) return
      if (!containerRef.current) return
      if ((containerRef.current as any)._leaflet_id) return

      // Fix ícones no Next.js
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      })

      const lat = centroLat ?? pontos[0]?.lat ?? -5.795
      const lng = centroLng ?? pontos[0]?.lng ?? -35.209

      let map: any
      try {
        map = L.map(containerRef.current!).setView([lat, lng], 13)
      } catch (e) {
        console.warn('Leaflet map init error:', e)
        return
      }
      mapRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
      }).addTo(map)

      // Controle "Minha localização"
      const GeoControl = L.Control.extend({
        onAdd: () => {
          const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control')
          const btn = L.DomUtil.create('a', '', div) as HTMLAnchorElement
          btn.innerHTML = '🎯 Minha localização'
          btn.title = 'Centralizar na minha posição'
          btn.href = '#'
          btn.style.cssText = [
            'display:flex', 'align-items:center', 'gap:4px',
            'padding:6px 10px', 'font-size:12px', 'font-weight:600',
            'color:#374151', 'white-space:nowrap', 'text-decoration:none',
          ].join(';')

          L.DomEvent.on(btn, 'click', e => {
            L.DomEvent.preventDefault(e)
            L.DomEvent.stopPropagation(e)
            if (!navigator.geolocation) return
            navigator.geolocation.getCurrentPosition(
              pos => map.setView([pos.coords.latitude, pos.coords.longitude], 16),
              () => { /* permissão negada */ }
            )
          })
          return div
        },
      })
      new GeoControl({ position: 'topright' }).addTo(map)

      // Marcadores
      pontos.forEach((p, idx) => {
        const cor = p.visitado ? COR_STATUS.visitado : (COR_STATUS[p.status ?? 'ativo'] ?? COR_STATUS.ativo)

        const icone = L.divIcon({
          html: mostrarRota
            ? `<div style="
                background:${cor};color:white;
                width:32px;height:32px;border-radius:50%;
                display:flex;align-items:center;justify-content:center;
                font-weight:700;font-size:13px;
                border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);
              ">${p.ordem ?? idx + 1}</div>`
            : `<div style="
                background:${cor};
                width:18px;height:18px;border-radius:50%;
                border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35);
              "></div>`,
          className: '',
          iconSize:   mostrarRota ? [32, 32] : [18, 18],
          iconAnchor: mostrarRota ? [16, 16] : [9, 9],
        })

        const marker = L.marker([p.lat, p.lng], { icon: icone }).addTo(map)

        // Linhas do popup
        const linhas: string[] = []

        if (p.responsavel) {
          linhas.push(`<span style="color:#6b7280;font-size:12px">👤 ${p.responsavel}</span>`)
        }
        if (p.endereco || p.bairro || p.cidade) {
          const end = [p.endereco, p.bairro, p.cidade].filter(Boolean).join(' · ')
          linhas.push(`<span style="color:#6b7280;font-size:12px">📍 ${end}</span>`)
        }
        if (p.telefone) {
          linhas.push(`<span style="color:#6b7280;font-size:12px">📞 ${p.telefone}</span>`)
        }
        if (p.cartelas_estoque !== undefined || p.cartelas_vendidas !== undefined) {
          const partes: string[] = []
          if (p.cartelas_estoque !== undefined)  partes.push(`📦 ${p.cartelas_estoque} em estoque`)
          if (p.cartelas_vendidas !== undefined) partes.push(`✅ ${p.cartelas_vendidas} vendidas`)
          linhas.push(`<span style="color:#6b7280;font-size:12px">${partes.join(' · ')}</span>`)
        }

        const statusLabel: Record<string, string> = {
          ativo: 'Ativo', sem_estoque: 'Sem estoque', inativo: 'Inativo',
        }

        marker.bindPopup(`
          <div style="font-family:sans-serif;min-width:180px;max-width:240px">
            <strong style="font-size:14px;display:block;margin-bottom:6px">${p.nome}</strong>
            <div style="display:flex;flex-direction:column;gap:3px;margin-bottom:8px">
              ${linhas.join('\n')}
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;padding-top:8px;border-top:1px solid #f3f4f6">
              <span style="font-size:11px;font-weight:600;color:${cor}">● ${statusLabel[p.status ?? 'ativo'] ?? p.status}</span>
              <a href="https://maps.google.com/?q=${p.lat},${p.lng}" target="_blank" rel="noreferrer"
                style="font-size:11px;font-weight:600;color:white;background:#10b981;padding:3px 8px;border-radius:4px;text-decoration:none;">
                Abrir no Google Maps
              </a>
            </div>
          </div>
        `, { maxWidth: 260 })
      })

      // Rota tracejada
      if (mostrarRota && pontos.length > 1) {
        const coords = pontos.map(p => [p.lat, p.lng] as [number, number])
        L.polyline(coords, {
          color:     '#10b981',
          weight:    3,
          dashArray: '8, 6',
          opacity:   0.8,
        }).addTo(map)
      }

      // Ajusta zoom para mostrar todos os pontos
      if (pontos.length > 1) {
        const group = L.featureGroup(pontos.map(p => L.marker([p.lat, p.lng])))
        map.fitBounds(group.getBounds().pad(0.15))
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
      <div ref={containerRef} style={{ height: altura, width: '100%', borderRadius: '12px' }} />
    </>
  )
}
