'use client'

import { useEffect } from 'react'

interface ThemeProviderProps {
  children: React.ReactNode
  initialConfigs?: Record<string, string>
}

export default function ThemeProvider({ children, initialConfigs = {} }: ThemeProviderProps) {
  useEffect(() => {
    function aplicarTema(configs: Record<string, string>) {
      const root = document.documentElement
      if (configs.cor_primaria) {
        root.style.setProperty('--color-primary',      configs.cor_primaria)
        root.style.setProperty('--color-primary-dark',  escurecerCor(configs.cor_primaria, 20))
        root.style.setProperty('--color-primary-light', clarearCor(configs.cor_primaria, 20))
      }
      if (configs.cor_secundaria) {
        root.style.setProperty('--color-secondary', configs.cor_secundaria)
      }
      if (configs.cor_sidebar)  root.style.setProperty('--dash-sidebar',    configs.cor_sidebar)
      if (configs.cor_header)   root.style.setProperty('--dash-header',     configs.cor_header)
      if (configs.cor_hero_bg)  root.style.setProperty('--color-hero-bg',   configs.cor_hero_bg)
      if (configs.cor_hero_text) root.style.setProperty('--color-hero-text', configs.cor_hero_text)
      if (configs.cor_site_bg)  root.style.setProperty('--color-site-bg',   configs.cor_site_bg)
      if (configs.nome_sistema) {
        document.title = configs.nome_sistema
      }
    }

    if (Object.keys(initialConfigs).length > 0) {
      aplicarTema(initialConfigs)
    }

    fetch('/api/config')
      .then(r => r.json())
      .then(aplicarTema)
      .catch(() => {})
  }, [initialConfigs])

  return <>{children}</>
}

function escurecerCor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, (num >> 16) - Math.round(255 * percent / 100))
  const g = Math.max(0, ((num >> 8) & 0xff) - Math.round(255 * percent / 100))
  const b = Math.max(0, (num & 0xff) - Math.round(255 * percent / 100))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

function clarearCor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, (num >> 16) + Math.round(255 * percent / 100))
  const g = Math.min(255, ((num >> 8) & 0xff) + Math.round(255 * percent / 100))
  const b = Math.min(255, (num & 0xff) + Math.round(255 * percent / 100))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}
