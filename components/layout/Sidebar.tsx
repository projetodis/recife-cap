'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useConfig } from '@/lib/config-client'
import type { UserRole } from '@/types'
import {
  LayoutDashboard, Users, Store, Calendar, Tag, Trophy,
  BarChart2, UserPlus, Activity, LayoutGrid, Settings,
  Map, Bike, Route, User, Plus, CreditCard, LogOut, Package,
} from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
}

const NAV_ITEMS: Record<UserRole, NavItem[]> = {
  admin: [
    { label: 'Dashboard',      href: '/admin/dashboard',      icon: <LayoutDashboard size={16} /> },
    { label: 'Distribuidores', href: '/admin/distribuidores',  icon: <Users size={16} /> },
    { label: 'PDVs',           href: '/admin/pdvs',            icon: <Store size={16} /> },
    { label: 'Edições',        href: '/admin/edicoes',         icon: <Calendar size={16} /> },
    { label: 'Cartelas',       href: '/admin/cartelas',        icon: <Tag size={16} /> },
    { label: 'Sorteios',       href: '/admin/sorteios',        icon: <Trophy size={16} /> },
    { label: 'Relatórios',     href: '/admin/relatorios',      icon: <BarChart2 size={16} /> },
    { label: 'Usuários',       href: '/admin/usuarios',        icon: <UserPlus size={16} /> },
    { label: 'Logs',           href: '/admin/logs',            icon: <Activity size={16} /> },
    { label: 'Landing Page',   href: '/admin/landing',         icon: <LayoutGrid size={16} /> },
    { label: 'Configurações',  href: '/admin/configuracoes',   icon: <Settings size={16} /> },
  ],
  distribuidor: [
    { label: 'Dashboard',   href: '/distribuidor/dashboard',  icon: <LayoutDashboard size={16} /> },
    { label: 'Meus PDVs',   href: '/distribuidor/pdvs',       icon: <Store size={16} /> },
    { label: 'Mapa',        href: '/distribuidor/mapa',       icon: <Map size={16} /> },
    { label: 'Motoboys',    href: '/distribuidor/motoboys',   icon: <Bike size={16} /> },
    { label: 'Rotas',       href: '/distribuidor/rotas',      icon: <Route size={16} /> },
    { label: 'Cartelas',    href: '/distribuidor/cartelas',   icon: <Tag size={16} /> },
    { label: 'Relatórios',  href: '/distribuidor/relatorios', icon: <BarChart2 size={16} /> },
    { label: 'Perfil',      href: '/distribuidor/perfil',     icon: <User size={16} /> },
  ],
  pdv: [
    { label: 'Dashboard',  href: '/pdv/dashboard',  icon: <LayoutDashboard size={16} /> },
    { label: 'Nova venda', href: '/pdv/venda',      icon: <Plus size={16} /> },
    { label: 'Cartelas',   href: '/pdv/cartelas',   icon: <Tag size={16} /> },
    { label: 'Saques',     href: '/pdv/saques',     icon: <CreditCard size={16} /> },
  ],
  cliente: [
    { label: 'Minhas cartelas', href: '/cliente/dashboard', icon: <Tag size={16} /> },
    { label: 'Sorteios',        href: '/cliente/sorteios',  icon: <Trophy size={16} /> },
    { label: 'Perfil',          href: '/cliente/perfil',    icon: <User size={16} /> },
  ],
  motoboy: [
    { label: 'Dashboard',     href: '/motoboy',        icon: <LayoutDashboard size={16} /> },
    { label: 'Minhas rotas',  href: '/motoboy/rotas',  icon: <Route size={16} /> },
  ],
  operador_sorteio: [
    { label: 'Sorteio', href: '/operador/sorteio', icon: <Trophy size={16} /> },
  ],
  financeiro: [
    { label: 'Relatórios',     href: '/admin/relatorios',     icon: <BarChart2 size={16} /> },
    { label: 'Distribuidores', href: '/admin/distribuidores', icon: <Users size={16} /> },
    { label: 'Logs',           href: '/admin/logs',           icon: <Activity size={16} /> },
  ],
  suporte: [
    { label: 'Dashboard',      href: '/admin/dashboard',      icon: <LayoutDashboard size={16} /> },
    { label: 'Distribuidores', href: '/admin/distribuidores',  icon: <Users size={16} /> },
    { label: 'PDVs',           href: '/admin/pdvs',            icon: <Store size={16} /> },
    { label: 'Cartelas',       href: '/admin/cartelas',        icon: <Tag size={16} /> },
    { label: 'Sorteios',       href: '/admin/sorteios',        icon: <Trophy size={16} /> },
    { label: 'Relatórios',     href: '/admin/relatorios',      icon: <BarChart2 size={16} /> },
    { label: 'Logs',           href: '/admin/logs',            icon: <Activity size={16} /> },
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

  const roleLabels: Record<UserRole, string> = {
    admin:            'Administrador',
    distribuidor:     `Distribuidor${nivel ? ` nv.${nivel}` : ''}`,
    pdv:              'Ponto de Venda',
    cliente:          'Cliente',
    motoboy:          'Motoboy',
    operador_sorteio: 'Operador de Sorteio',
    financeiro:       'Financeiro',
    suporte:          'Suporte',
  }

  useEffect(() => { setIsOpen(false) }, [pathname])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const navItems = NAV_ITEMS[role]

  return (
    <>
      {/* Botão hamburger — mobile */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-50 w-10 h-10 text-white rounded-xl flex items-center justify-center shadow-md"
        style={{ background: 'var(--dash-sidebar, #1B5E20)' }}
        aria-label="Abrir menu"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      {/* Overlay escuro — mobile */}
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
        style={{ background: 'var(--dash-sidebar, #1B5E20)' }}
      >
        {/* Header: logo + nome do sistema + usuário */}
        <div
          className="px-4 py-5 flex items-start justify-between"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.12)' }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoUrl} alt={nomeSistema} className="w-9 h-9 object-contain" />
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-black leading-none">{nomeSistema}</p>
              <p className="text-xs mt-0.5 text-green-300">{roleLabels[role]}</p>
              <p className="text-xs mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.5)' }}>{nome}</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden flex-shrink-0 w-7 h-7 flex items-center justify-center rounded"
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
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all min-h-11 ${
                  active
                    ? 'text-white font-medium'
                    : 'text-green-200 hover:bg-white/10 hover:text-white'
                }`}
                style={active ? {
                  background: 'var(--color-primary, #2E7D32)',
                  borderLeft: '3px solid var(--color-secondary, #FFC107)',
                  paddingLeft: '9px',
                } : undefined}
              >
                <span className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
                  {item.icon}
                </span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Footer: logout */}
        <div className="px-4 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-xs transition-colors text-green-300 hover:text-white min-h-8 w-full"
          >
            <LogOut size={14} />
            Sair
          </button>
        </div>
      </aside>
    </>
  )
}
