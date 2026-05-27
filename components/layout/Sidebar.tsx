'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useConfig } from '@/lib/config-client'
import type { UserRole } from '@/types'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
}

const NAV_ITEMS: Record<UserRole, NavItem[]> = {
  admin: [
    { label: 'Dashboard',      href: '/admin/dashboard',      icon: <IconHome /> },
    { label: 'Distribuidores', href: '/admin/distribuidores',  icon: <IconUsers /> },
    { label: 'PDVs',           href: '/admin/pdvs',            icon: <IconStore /> },
    { label: 'Edições',        href: '/admin/edicoes',         icon: <IconCalendar /> },
    { label: 'Cartelas',       href: '/admin/cartelas',        icon: <IconTicket /> },
    { label: 'Sorteios',       href: '/admin/sorteios',        icon: <IconTrophy /> },
    { label: 'Relatórios',     href: '/admin/relatorios',      icon: <IconChart /> },
    { label: 'Usuários',       href: '/admin/usuarios',        icon: <IconUserPlus /> },
    { label: 'Logs',           href: '/admin/logs',            icon: <IconActivity /> },
    { label: 'Configurações',  href: '/admin/configuracoes',   icon: <IconSettings /> },
  ],
  distribuidor: [
    { label: 'Dashboard',   href: '/distribuidor/dashboard',  icon: <IconHome /> },
    { label: 'Meus PDVs',   href: '/distribuidor/pdvs',       icon: <IconStore /> },
    { label: 'Mapa',        href: '/distribuidor/mapa',       icon: <IconMap /> },
    { label: 'Motoboys',    href: '/distribuidor/motoboys',   icon: <IconMoto /> },
    { label: 'Rotas',       href: '/distribuidor/rotas',      icon: <IconRoute /> },
    { label: 'Cartelas',    href: '/distribuidor/cartelas',   icon: <IconTicket /> },
    { label: 'Relatórios',  href: '/distribuidor/relatorios', icon: <IconChart /> },
    { label: 'Perfil',      href: '/distribuidor/perfil',     icon: <IconUser /> },
  ],
  pdv: [
    { label: 'Dashboard',  href: '/pdv/dashboard',  icon: <IconHome /> },
    { label: 'Nova venda', href: '/pdv/venda',      icon: <IconPlus /> },
    { label: 'Cartelas',   href: '/pdv/cartelas',   icon: <IconTicket /> },
    { label: 'Caixa',      href: '/pdv/caixa',      icon: <IconCash /> },
  ],
  cliente: [
    { label: 'Minhas cartelas', href: '/cliente/dashboard', icon: <IconTicket /> },
    { label: 'Sorteios',        href: '/cliente/sorteios',  icon: <IconTrophy /> },
    { label: 'Perfil',          href: '/cliente/perfil',    icon: <IconUser /> },
  ],
  motoboy: [
    { label: 'Minhas rotas',   href: '/motoboy/rotas',   icon: <IconRoute /> },
    { label: 'Paradas',        href: '/motoboy/paradas', icon: <IconMap /> },
  ],
  operador_sorteio: [
    { label: 'Sorteio',        href: '/operador/sorteio', icon: <IconTrophy /> },
  ],
  financeiro: [
    { label: 'Relatórios',     href: '/admin/relatorios',     icon: <IconChart /> },
    { label: 'Distribuidores', href: '/admin/distribuidores', icon: <IconUsers /> },
    { label: 'Logs',           href: '/admin/logs',           icon: <IconActivity /> },
  ],
  suporte: [
    { label: 'Dashboard',      href: '/admin/dashboard',      icon: <IconHome /> },
    { label: 'Distribuidores', href: '/admin/distribuidores',  icon: <IconUsers /> },
    { label: 'PDVs',           href: '/admin/pdvs',            icon: <IconStore /> },
    { label: 'Cartelas',       href: '/admin/cartelas',        icon: <IconTicket /> },
    { label: 'Sorteios',       href: '/admin/sorteios',        icon: <IconTrophy /> },
    { label: 'Relatórios',     href: '/admin/relatorios',      icon: <IconChart /> },
    { label: 'Logs',           href: '/admin/logs',            icon: <IconActivity /> },
  ],
}

interface SidebarProps {
  role: UserRole
  nome: string
  nivel?: number
}

export function Sidebar({ role, nome, nivel }: SidebarProps) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()
  const configs  = useConfig()
  const [isOpen, setIsOpen] = useState(false)

  const logoUrl     = configs.logo_url     || '/logo.png'
  const nomeSistema = configs.nome_sistema || 'Recife Cap'

  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const navItems = NAV_ITEMS[role]

  const roleLabels: Record<UserRole, string> = {
    admin:            'Administrador',
    distribuidor:     `Distribuidor${nivel ? ` nv:${nivel}` : ''}`,
    pdv:              'Ponto de Venda',
    cliente:          'Cliente',
    motoboy:          'Motoboy',
    operador_sorteio: 'Operador de Sorteio',
    financeiro:       'Financeiro',
    suporte:          'Suporte',
  }

  return (
    <>
      {/* Botão hamburger — só mobile, só quando fechado */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-50 w-10 h-10 text-white rounded-lg flex items-center justify-center shadow-md"
        style={{ background: 'var(--color-primary-dark)' }}
        aria-label="Abrir menu"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      {/* Overlay escuro — só mobile quando aberto */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 top-0 h-full w-52 flex flex-col z-40
          transition-transform duration-300
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
        style={{ background: 'var(--color-primary-dark)' }}
      >
        {/* Logo + botão fechar */}
        <div
          className="px-4 py-5 flex items-center justify-between"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.12)' }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoUrl} alt={nomeSistema} className="w-9 h-9 object-contain" />
            </div>
            <div>
              <p className="text-white text-sm font-bold leading-none">{nomeSistema}</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>{roleLabels[role]}</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden w-7 h-7 flex items-center justify-center rounded transition-colors"
            style={{ color: 'rgba(255,255,255,0.5)' }}
            aria-label="Fechar menu"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(item => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors min-h-11"
                style={active ? {
                  background: 'var(--color-primary)',
                  color: '#fff',
                  borderLeft: '3px solid var(--color-secondary)',
                  paddingLeft: '9px',
                } : {
                  color: 'rgba(255,255,255,0.7)',
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--color-primary)'; (e.currentTarget as HTMLElement).style.color = '#fff' }}
                onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.7)' } }}
              >
                <span className="w-4 h-4 flex-shrink-0">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}>
          <p className="text-xs truncate mb-2" style={{ color: 'rgba(255,255,255,0.55)' }}>{nome}</p>
          <button
            onClick={handleLogout}
            className="text-xs transition-colors min-h-8"
            style={{ color: 'rgba(255,255,255,0.55)' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#fff'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.55)'}
          >
            Sair
          </button>
        </div>
      </aside>
    </>
  )
}

// Icons inline
function IconHome() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
}
function IconUsers() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
}
function IconStore() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M3 9l1-6h16l1 6"/><path d="M3 9a2 2 0 004 0 2 2 0 004 0 2 2 0 004 0 2 2 0 004 0"/><path d="M5 9v12h14V9"/></svg>
}
function IconMap() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
}
function IconMoto() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="5" cy="17" r="3"/><circle cx="19" cy="17" r="3"/><path d="M9 17h6"/><path d="M5 14V9l4-4h4l4 4v5"/><path d="M13 5v4"/></svg>
}
function IconRoute() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 000-7h-11a3.5 3.5 0 010-7H15"/><circle cx="18" cy="5" r="3"/></svg>
}
function IconCalendar() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
}
function IconTicket() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M2 9a3 3 0 010-6h20a3 3 0 010 6"/><path d="M2 15a3 3 0 000 6h20a3 3 0 000-6"/><path d="M6 9v6M10 9v6M14 9v6M18 9v6"/></svg>
}
function IconTrophy() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><polyline points="8 21 12 17 16 21"/><path d="M4 7h16"/><path d="M4 7a8 8 0 008 8 8 8 0 008-8"/><path d="M4 7H2"/><path d="M22 7h-2"/></svg>
}
function IconChart() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
}
function IconUser() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
}
function IconPlus() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
}
function IconCash() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 12h.01M18 12h.01"/></svg>
}
function IconUserPlus() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
}
function IconActivity() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
}
function IconSettings() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
}
