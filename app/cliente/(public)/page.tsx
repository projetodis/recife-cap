'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence, type PanInfo } from 'framer-motion'
import { useConfig } from '@/lib/config-client'
import {
  Trophy, Ticket, QrCode, Tv, ChevronDown, ChevronRight, ChevronLeft, Menu, X,
  ShoppingCart, BarChart2, MessageCircle, Star,
  Shield, Radio, Calendar,
} from 'lucide-react'

// ── SVG brand icons ────────────────────────────────────────────────────────────
function IconInstagram({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
    </svg>
  )
}
function IconFacebook({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
    </svg>
  )
}
function IconYoutube({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/>
    </svg>
  )
}

// ── Tipos do carrossel ─────────────────────────────────────────────────────────
interface DepoimentoItem {
  id: string
  nome: string
  cidade: string
  premio: string
  sorteio: string
  depoimento: string
  foto_url: string | null
}

const cardVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0, scale: 0.9 }),
  center: { x: 0, opacity: 1, scale: 1 },
  exit:  (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0, scale: 0.9 }),
}

// ── Carrossel de depoimentos ───────────────────────────────────────────────────
function CarrosselDepoimentos() {
  const [depoimentos, setDepoimentos] = useState<DepoimentoItem[]>([])
  const [atual,       setAtual]       = useState(0)
  const [direction,   setDirection]   = useState(0)

  useEffect(() => {
    fetch('/api/cliente/depoimentos')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data) && data.length > 0) setDepoimentos(data) })
      .catch(() => {})
  }, [])

  const total = depoimentos.length

  const anterior = () => {
    setDirection(-1)
    setAtual(prev => (prev === 0 ? total - 1 : prev - 1))
  }
  const proximo = () => {
    setDirection(1)
    setAtual(prev => (prev + 1) % total)
  }
  const irPara = (i: number) => { setDirection(i > atual ? 1 : -1); setAtual(i) }

  useEffect(() => {
    if (total === 0) return
    const t = setInterval(proximo, 5000)
    return () => clearInterval(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total])

  if (total === 0) return null

  const g     = depoimentos[atual]
  const prev1 = depoimentos[(atual - 1 + total) % total]
  const next1 = depoimentos[(atual + 1) % total]

  const CardPrincipal = ({ item }: { item: DepoimentoItem }) => (
    <>
      {/* Foto com anel gradiente */}
      <div className="relative mb-4">
        <div className="w-20 h-20 rounded-full p-0.5 mx-auto"
          style={{ background: 'linear-gradient(135deg, #FFC107, #2E7D32)' }}>
          {item.foto_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.foto_url} alt={item.nome}
              className="w-full h-full rounded-full object-cover border-2 border-white" />
          ) : (
            <div className="w-full h-full rounded-full border-2 border-white flex items-center justify-center text-2xl font-black"
              style={{ background: '#2E7D32', color: '#FFC107' }}>
              {item.nome.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="absolute bottom-0 right-1/2 translate-x-8 w-6 h-6 rounded-full flex items-center justify-center"
          style={{ background: '#2E7D32' }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
      {/* Estrelas */}
      <div className="flex gap-1 justify-center mb-3">
        {[1,2,3,4,5].map(i => <Star key={i} size={14} fill="#FFC107" color="#FFC107" />)}
      </div>
      {/* Depoimento */}
      <p className="text-gray-600 text-sm leading-relaxed mb-4 italic">"{item.depoimento}"</p>
      {/* Info */}
      <p className="font-black text-gray-900">{item.nome}</p>
      <p className="text-gray-400 text-xs">{item.cidade}</p>
      <div className="mt-3 px-4 py-1.5 rounded-full text-xs font-black inline-block"
        style={{ background: 'rgba(255,193,7,0.15)', color: '#1B5E20' }}>
        {item.sorteio} · {item.premio}
      </div>
    </>
  )

  return (
    <section className="py-20 overflow-hidden" style={{ background: '#f8faf8' }}>
      <div className="max-w-6xl mx-auto px-4">

        {/* Título */}
        <div className="text-center mb-16">
          <span className="text-xs font-black uppercase tracking-widest" style={{ color: '#2E7D32' }}>
            Ganhadores verificados
          </span>
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 mt-2">Quem já ganhou</h2>
          <p className="text-gray-500 mt-2 text-sm">Histórias reais de ganhadores do Recife Cap</p>
        </div>

        {/* Desktop — 3 cards: prev | main | next */}
        <div className="hidden md:flex items-center justify-center gap-6 h-80">

          {/* Card anterior */}
          <div className="w-64 h-64 rounded-3xl p-6 flex flex-col items-center text-center opacity-40 scale-90 transition-all cursor-pointer flex-shrink-0"
            style={{ background: 'white', border: '1px solid #e5e7eb', filter: 'blur(1px)' }}
            onClick={anterior}>
            {prev1.foto_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={prev1.foto_url} alt={prev1.nome} className="w-14 h-14 rounded-full object-cover mb-3 border-2 border-[#2E7D32]" />
            ) : (
              <div className="w-14 h-14 rounded-full mb-3 border-2 border-[#2E7D32] flex items-center justify-center font-black text-lg"
                style={{ background: '#E8F5E9', color: '#2E7D32' }}>
                {prev1.nome.charAt(0).toUpperCase()}
              </div>
            )}
            <p className="font-black text-gray-900 text-sm">{prev1.nome}</p>
            <p className="text-xs text-gray-500">{prev1.cidade}</p>
          </div>

          {/* Card principal animado */}
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={atual}
              custom={direction}
              variants={cardVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="w-80 rounded-3xl p-8 flex flex-col items-center text-center z-10 flex-shrink-0"
              style={{
                background: 'white',
                border: '2px solid rgba(46,125,50,0.2)',
                boxShadow: '0 20px 60px rgba(46,125,50,0.15)',
              }}>
              <CardPrincipal item={g} />
            </motion.div>
          </AnimatePresence>

          {/* Card seguinte */}
          <div className="w-64 h-64 rounded-3xl p-6 flex flex-col items-center text-center opacity-40 scale-90 transition-all cursor-pointer flex-shrink-0"
            style={{ background: 'white', border: '1px solid #e5e7eb', filter: 'blur(1px)' }}
            onClick={proximo}>
            {next1.foto_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={next1.foto_url} alt={next1.nome} className="w-14 h-14 rounded-full object-cover mb-3 border-2 border-[#2E7D32]" />
            ) : (
              <div className="w-14 h-14 rounded-full mb-3 border-2 border-[#2E7D32] flex items-center justify-center font-black text-lg"
                style={{ background: '#E8F5E9', color: '#2E7D32' }}>
                {next1.nome.charAt(0).toUpperCase()}
              </div>
            )}
            <p className="font-black text-gray-900 text-sm">{next1.nome}</p>
            <p className="text-xs text-gray-500">{next1.cidade}</p>
          </div>
        </div>

        {/* Mobile — swipe */}
        <div className="md:hidden relative">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={atual}
              custom={direction}
              variants={cardVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.7}
              onDragEnd={(_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
                if (info.offset.x < -80) proximo()
                if (info.offset.x > 80)  anterior()
              }}
              className="rounded-3xl p-8 flex flex-col items-center text-center mx-2"
              style={{
                background: 'white',
                border: '2px solid rgba(46,125,50,0.2)',
                boxShadow: '0 20px 60px rgba(46,125,50,0.15)',
              }}>
              <CardPrincipal item={g} />
              <p className="text-gray-300 text-xs mt-4">← arraste para navegar →</p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Controles */}
        <div className="flex items-center justify-center gap-4 mt-10">
          <button onClick={anterior}
            className="w-10 h-10 rounded-full flex items-center justify-center border-2 border-gray-200 hover:border-[#2E7D32] hover:text-[#2E7D32] transition-all text-gray-400">
            <ChevronLeft size={18} />
          </button>
          <div className="flex gap-2">
            {depoimentos.map((_, i) => (
              <button key={i} onClick={() => irPara(i)}
                className="transition-all duration-300 rounded-full"
                style={{
                  width:      i === atual ? '24px' : '8px',
                  height:     '8px',
                  background: i === atual ? '#2E7D32' : '#d1d5db',
                }} />
            ))}
          </div>
          <button onClick={proximo}
            className="w-10 h-10 rounded-full flex items-center justify-center border-2 border-gray-200 hover:border-[#2E7D32] hover:text-[#2E7D32] transition-all text-gray-400">
            <ChevronRight size={18} />
          </button>
        </div>

      </div>
    </section>
  )
}

// ── Hook: contador animado ─────────────────────────────────────────────────────
function useCounter(target: number, active: boolean, duration = 1500) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!active) return
    let current = 0
    const step = target / (duration / 16)
    const timer = setInterval(() => {
      current += step
      if (current >= target) { setCount(target); clearInterval(timer) }
      else setCount(Math.floor(current))
    }, 16)
    return () => clearInterval(timer)
  }, [active, target, duration])
  return count
}

// ── Hook: reveal ao entrar na viewport ────────────────────────────────────────
function useReveal() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.1 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return { ref, visible }
}

// ── Componente principal ───────────────────────────────────────────────────────
export default function ClienteHome() {
  const configs = useConfig()

  const logoUrl  = configs.logo_url       || '/logo.png'
  const fundoUrl = configs.fundo_hero_url || '/fundo.png'
  const nomeSist = configs.nome_sistema   || 'Recife Cap'
  const slogan   = configs.slogan         || 'Filantropia Premiável'
  const whatsapp = configs.whatsapp_suporte || ''

  const [scrolled,    setScrolled]    = useState(false)
  const [menuOpen,    setMenuOpen]    = useState(false)
  const [proximaData, setProximaData] = useState<string | null>(null)
  const [edicaoNum,   setEdicaoNum]   = useState<number | null>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    fetch('/api/cliente/sorteio-ativo')
      .then(r => r.json())
      .then(d => {
        if (d.edicao?.data_sorteio) {
          const dt = new Date(d.edicao.data_sorteio + 'T00:00:00')
          setProximaData(dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }))
        }
        if (d.edicao?.numero) setEdicaoNum(d.edicao.numero)
      })
      .catch(() => {})
  }, [])

  function scrollTo(id: string) {
    setMenuOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  const revealSorteio = useReveal()
  const revealComo    = useReveal()

  return (
    <>
      <style>{`
        .reveal { opacity: 0; transform: translateY(28px); transition: opacity .65s ease, transform .65s ease; }
        .reveal.visible { opacity: 1; transform: translateY(0); }
        .reveal-delay-1 { transition-delay: .1s; }
        .reveal-delay-2 { transition-delay: .2s; }
        .reveal-delay-3 { transition-delay: .3s; }
      `}</style>

      <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>

        {/* ══════════════════════════════════════════════════════ HEADER */}
        <header
          className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'shadow-lg' : ''}`}
          style={{
            background:    scrolled ? 'rgba(27,94,32,0.98)' : 'rgba(27,94,32,0.85)',
            backdropFilter: 'blur(12px)',
            borderBottom:  '1px solid rgba(255,193,7,0.2)',
          }}
        >
          <div className="max-w-7xl mx-auto px-4 h-16 relative flex items-center justify-between">

            {/* Menu esquerdo — desktop */}
            <nav className="hidden lg:flex items-center gap-8 flex-1">
              {[['Início', 'início'], ['Sorteio', 'sorteio'], ['Sobre', 'sobre']].map(([label, id]) => (
                <button key={id} onClick={() => scrollTo(id)}
                  className="text-white/80 hover:text-[#FFC107] text-sm font-semibold tracking-wide transition-colors">
                  {label}
                </button>
              ))}
            </nav>

            {/* Logo central — absoluta para ficar sempre no meio */}
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoUrl} alt={nomeSist} className="w-10 h-10 object-contain drop-shadow-lg"
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
              <span className="text-white font-black text-base tracking-widest hidden sm:block">
                RECIFE CAP
              </span>
            </div>

            {/* Menu direito — desktop */}
            <nav className="hidden lg:flex items-center gap-8 flex-1 justify-end">
              <button onClick={() => scrollTo('contato')}
                className="text-white/80 hover:text-[#FFC107] text-sm font-semibold tracking-wide transition-colors">
                Contato
              </button>
              <Link href="/cliente/sorteio"
                className="text-white/80 hover:text-[#FFC107] text-sm font-semibold tracking-wide transition-colors">
                Resultados
              </Link>
              <Link href="/cliente/compra"
                className="px-5 py-2 rounded-full text-sm font-black transition-all hover:scale-105 hover:shadow-lg whitespace-nowrap"
                style={{ background: '#FFC107', color: '#1B5E20', boxShadow: '0 4px 15px rgba(255,193,7,0.35)' }}>
                Comprar títulos →
              </Link>
            </nav>

            {/* Mobile: hamburger + CTA */}
            <button onClick={() => setMenuOpen(v => !v)} className="lg:hidden text-white p-2" aria-label="Menu">
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <Link href="/cliente/compra"
              className="lg:hidden px-4 py-1.5 rounded-full text-sm font-black"
              style={{ background: '#FFC107', color: '#1B5E20' }}>
              Comprar →
            </Link>
          </div>

          {/* Mobile dropdown */}
          {menuOpen && (
            <div className="lg:hidden border-t py-4 px-6 space-y-1"
              style={{ background: 'rgba(27,94,32,0.98)', borderColor: 'rgba(255,193,7,0.2)' }}>
              {[['Início', 'início'], ['Sorteio', 'sorteio'], ['Sobre', 'sobre'], ['Contato', 'contato']].map(([label, id]) => (
                <button key={id} onClick={() => scrollTo(id)}
                  className="w-full text-left py-3 text-white/80 hover:text-[#FFC107] font-medium border-b transition-colors text-sm"
                  style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                  {label}
                </button>
              ))}
              <Link href="/cliente/sorteio" onClick={() => setMenuOpen(false)}
                className="block py-3 text-white/80 hover:text-[#FFC107] font-medium text-sm"
                style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                Resultados
              </Link>
            </div>
          )}
        </header>

        {/* ══════════════════════════════════════════════════════ HERO */}
        <section id="início" className="relative flex flex-col items-center justify-center text-center px-6 overflow-hidden"
          style={{ minHeight: '100svh' }}>

          {/* Mobile: usa fundo_hero_mobile_url da config, fallback para fundo-mobile.png */}
          <div className="md:hidden absolute inset-0"
            style={{
              backgroundImage: `url('${configs.fundo_hero_mobile_url || configs.fundo_hero_url || '/fundo-mobile.png'}')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center top',
            }} />

          {/* Desktop: fundo.png (horizontal/landscape) */}
          <div className="hidden md:block absolute inset-0"
            style={{
              backgroundImage: `url('${fundoUrl}')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }} />

          {/* Overlay leve */}
          <div className="absolute inset-0 bg-black/10" />

          {/* Conteúdo */}
          <div className="relative z-10 flex flex-col items-center w-full max-w-sm mx-auto md:max-w-3xl pt-16">

            {/* Logo */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt={nomeSist}
              className="w-28 h-28 md:w-32 md:h-32 object-contain drop-shadow-2xl mb-4"
              style={{ filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.4))' }}
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />

            {/* Título */}
            <h1 className="font-black text-white leading-none tracking-tight mb-2"
              style={{
                fontSize: 'clamp(3.5rem, 15vw, 7rem)',
                textShadow: '0 2px 0 rgba(0,0,0,0.3), 0 4px 20px rgba(0,0,0,0.5)',
                WebkitTextStroke: '1px rgba(255,255,255,0.3)',
              }}>
              RECIFE CAP
            </h1>

            {/* Slogan */}
            <p className="font-bold tracking-[0.25em] text-sm md:text-base mb-6"
              style={{ color: '#FFC107', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
              {(slogan || 'FILANTROPIA PREMIÁVEL').toUpperCase()}
            </p>

            {/* Badge sorteio */}
            <div className="flex items-center gap-2 border rounded-full px-5 py-2.5 mb-8"
              style={{
                borderColor: 'rgba(255,255,255,0.3)',
                background: 'rgba(0,0,0,0.2)',
                backdropFilter: 'blur(10px)',
              }}>
              <Calendar size={14} className="text-white/70" />
              <span className="text-white text-xs md:text-sm font-bold tracking-wider">
                {proximaData
                  ? `PRÓXIMO SORTEIO: ${proximaData} ÀS 09H00`
                  : 'SORTEIO TODO DOMINGO ÀS 09H00'}
              </span>
            </div>

            {/* Botões */}
            <div className="flex flex-col w-full gap-3 md:flex-row md:justify-center">
              <Link href="/cliente/compra"
                className="w-full md:w-auto px-10 py-4 rounded-full font-black text-lg transition-all hover:scale-105 active:scale-95 text-center"
                style={{
                  background: 'linear-gradient(135deg, #FFC107, #FFD54F)',
                  color: '#1B5E20',
                  boxShadow: '0 8px 30px rgba(255,193,7,0.5)',
                }}>
                {configs.texto_btn_principal || 'Quero participar →'}
              </Link>
              <button onClick={() => scrollTo('sorteio')}
                className="w-full md:w-auto px-10 py-4 rounded-full font-bold text-white text-lg border-2 text-center transition-all hover:bg-white/10"
                style={{ borderColor: 'rgba(255,255,255,0.4)' }}>
                {configs.texto_btn_secundario || 'Ver sorteio'}
              </button>
            </div>

            {/* Badges de confiança — mobile only */}
            <div className="flex items-center justify-center gap-6 mt-8 md:hidden">
              <div className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(46,125,50,0.8)', border: '2px solid rgba(255,255,255,0.3)' }}>
                  <Shield size={18} className="text-white" />
                </div>
                <span className="text-white text-xs font-medium text-center leading-tight">100%<br/>Seguro</span>
              </div>
              <div className="w-px h-12 bg-white/20" />
              <div className="flex flex-col items-center gap-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoUrl} alt="" className="w-10 h-10 object-contain"
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                <span className="text-white text-xs font-medium text-center leading-tight">Filantropia<br/>Premiável</span>
              </div>
              <div className="w-px h-12 bg-white/20" />
              <div className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(255,193,7,0.8)', border: '2px solid rgba(255,255,255,0.3)' }}>
                  <Trophy size={18} style={{ color: '#1B5E20' }} />
                </div>
                <span className="text-white text-xs font-medium text-center leading-tight">Prêmios que<br/>transformam</span>
              </div>
            </div>
          </div>

          {/* Scroll indicator — desktop */}
          <div className="hidden md:flex absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
            <ChevronDown size={24} className="text-white/60" />
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════ SORTEIO */}
        <section id="sorteio" className="py-16 bg-white">
          <div ref={revealSorteio.ref}
            className={`max-w-4xl mx-auto px-4 text-center reveal ${revealSorteio.visible ? 'visible' : ''}`}>

            {edicaoNum && (
              <span className="text-[#FFC107] text-xs font-black uppercase tracking-widest">
                Edição {edicaoNum}
              </span>
            )}
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mt-2 mb-8">
              Sorteio desta semana
            </h2>

            {/* Banner centralizado */}
            <div className="relative inline-block w-full max-w-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={configs.banner_sorteio_url || configs.banner_compra_url || '/banner.png'}
                alt="Cartela Recife Cap"
                className="w-full rounded-3xl shadow-2xl"
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
              />
              {configs.valor_titulo && (
                <div className="absolute bottom-4 right-4 px-4 py-2 rounded-full font-black text-sm shadow-lg"
                  style={{ background: '#FFC107', color: '#1B5E20' }}>
                  R$ {configs.valor_titulo} / título
                </div>
              )}
            </div>

            {/* Botão CTA */}
            <div className="mt-8">
              <Link href="/cliente/compra"
                className="inline-flex items-center gap-2 px-10 py-4 rounded-full font-black text-lg transition-all hover:scale-105 active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #FFC107, #FFD54F)',
                  color: '#1B5E20',
                  boxShadow: '0 8px 30px rgba(255,193,7,0.4)',
                }}>
                <ShoppingCart size={20} />
                Garantir meu título agora →
              </Link>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════ COMO FUNCIONA */}
        <section className="py-20 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #1B5E20 0%, #2E7D32 50%, #1B5E20 100%)' }}>

          {/* Pontos de fundo */}
          <div className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }} />

          {/* Arco decorativo */}
          <div className="absolute left-1/2 -translate-x-1/2 rounded-full pointer-events-none"
            style={{
              top: '-300px',
              width: '800px',
              height: '800px',
              border: '2px solid rgba(255,193,7,0.15)',
            }} />

          <div ref={revealComo.ref}
            className={`relative z-10 max-w-6xl mx-auto px-4 reveal ${revealComo.visible ? 'visible' : ''}`}>

            {/* Título */}
            <div className="text-center mb-16">
              <div className="flex items-center justify-center gap-4 mb-3">
                <div className="h-px w-16" style={{ background: 'rgba(255,193,7,0.4)' }} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoUrl} alt="" className="w-8 h-8 object-contain opacity-50"
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                <div className="h-px w-16" style={{ background: 'rgba(255,193,7,0.4)' }} />
              </div>
              <h2 className="font-black leading-tight text-white"
                style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)' }}>
                Como <span style={{ color: '#AAFF00' }}>participar</span>
              </h2>
              <p className="mt-2 text-white/70">
                Simples, seguro e <span className="font-bold" style={{ color: '#AAFF00' }}>100% online</span>
              </p>
            </div>

            {/* Desktop — 3 cards + setas */}
            <div className="hidden md:flex items-center justify-center gap-0">
              {([
                { num: '01', titulo: 'Escolha seu título',   desc: 'Selecione a quantidade de títulos e confirme seus dados pessoais.',     icon: 'Ticket'  },
                { num: '02', titulo: 'Pague via PIX',         desc: 'Pagamento instantâneo e seguro. QR Code gerado automaticamente.',       icon: 'QrCode'  },
                { num: '03', titulo: 'Acompanhe o sorteio',   desc: 'Todo domingo ao vivo na TV. Veja seus números sorteados em tempo real.', icon: 'Tv'      },
              ] as const).map((step, i) => (
                <div key={step.num} className="flex items-center">
                  {/* Card */}
                  <div className="flex flex-col items-center text-center p-8 rounded-3xl w-72"
                    style={{
                      background: 'linear-gradient(145deg, rgba(46,125,50,0.8), rgba(27,94,32,0.9))',
                      border: '1px solid rgba(255,193,7,0.3)',
                      backdropFilter: 'blur(10px)',
                    }}>
                    {/* Ícone com anel dourado */}
                    <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
                      style={{
                        background: 'linear-gradient(145deg, #2E7D32, #1B5E20)',
                        border: '2px solid #FFC107',
                        boxShadow: '0 0 20px rgba(255,193,7,0.3)',
                      }}>
                      {step.icon === 'Ticket' && <Ticket size={32} style={{ color: '#AAFF00' }} />}
                      {step.icon === 'QrCode' && <QrCode size={32} style={{ color: '#AAFF00' }} />}
                      {step.icon === 'Tv'     && <Tv     size={32} style={{ color: '#AAFF00' }} />}
                    </div>
                    {/* Número */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-px w-8" style={{ background: 'rgba(255,193,7,0.4)' }} />
                      <span className="font-black text-3xl" style={{ color: '#AAFF00' }}>{step.num}</span>
                      <div className="h-px w-8" style={{ background: 'rgba(255,193,7,0.4)' }} />
                    </div>
                    <h3 className="text-white font-black text-xl mb-3">{step.titulo}</h3>
                    <p className="text-white/70 text-sm leading-relaxed">{step.desc}</p>
                  </div>

                  {/* Seta entre cards */}
                  {i < 2 && (
                    <div className="w-12 flex items-center justify-center flex-shrink-0">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ background: '#2E7D32', border: '2px solid #FFC107' }}>
                        <ChevronRight size={18} style={{ color: '#FFC107' }} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Mobile — cards empilhados */}
            <div className="md:hidden space-y-0">
              {([
                { num: '01', titulo: 'Escolha seu título',   desc: 'Selecione a quantidade de títulos e confirme seus dados pessoais.',     icon: 'Ticket'  },
                { num: '02', titulo: 'Pague via PIX',         desc: 'Pagamento instantâneo e seguro. QR Code gerado automaticamente.',       icon: 'QrCode'  },
                { num: '03', titulo: 'Acompanhe o sorteio',   desc: 'Todo domingo ao vivo na TV. Veja seus números sorteados em tempo real.', icon: 'Tv'      },
              ] as const).map((step, i) => (
                <div key={step.num}>
                  <div className="flex items-center gap-5 p-5 rounded-3xl"
                    style={{
                      background: 'linear-gradient(145deg, rgba(46,125,50,0.8), rgba(27,94,32,0.9))',
                      border: '1px solid rgba(255,193,7,0.3)',
                    }}>
                    {/* Ícone */}
                    <div className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{
                        background: 'linear-gradient(145deg, #2E7D32, #1B5E20)',
                        border: '2px solid #FFC107',
                        boxShadow: '0 0 15px rgba(255,193,7,0.3)',
                      }}>
                      {step.icon === 'Ticket' && <Ticket size={24} style={{ color: '#AAFF00' }} />}
                      {step.icon === 'QrCode' && <QrCode size={24} style={{ color: '#AAFF00' }} />}
                      {step.icon === 'Tv'     && <Tv     size={24} style={{ color: '#AAFF00' }} />}
                    </div>
                    {/* Texto */}
                    <div className="flex-1">
                      <span className="font-black text-2xl block" style={{ color: '#AAFF00' }}>{step.num}</span>
                      <h3 className="text-white font-black text-lg leading-tight">{step.titulo}</h3>
                      <p className="text-white/70 text-sm mt-1 leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                  {/* Chevron entre cards */}
                  {i < 2 && (
                    <div className="flex justify-center py-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ background: '#2E7D32', border: '2px solid #FFC107' }}>
                        <ChevronDown size={16} style={{ color: '#FFC107' }} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* ══════════════════════════════════════════════════════ DEPOIMENTOS */}
        <CarrosselDepoimentos />

        {/* ══════════════════════════════════════════════════════ SOBRE NÓS */}
        <section id="sobre" className="py-24 bg-white relative overflow-hidden">

          {/* Círculos decorativos de fundo */}
          <div className="absolute top-10 left-10 w-32 h-32 rounded-full opacity-5 pointer-events-none"
            style={{ background: '#2E7D32' }} />
          <div className="absolute bottom-10 right-10 w-48 h-48 rounded-full opacity-5 pointer-events-none"
            style={{ background: '#FFC107' }} />

          <div className="max-w-6xl mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

              {/* ── Coluna esquerda ── */}
              <div className="space-y-6">
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold"
                  style={{ background: 'rgba(46,125,50,0.1)', color: '#2E7D32' }}>
                  QUEM SOMOS
                </span>

                <h2 className="text-4xl lg:text-5xl font-black leading-tight" style={{ color: '#1B5E20' }}>
                  Sorteios que{' '}
                  <span style={{ color: '#2E7D32' }}>transformam</span>
                  <br />
                  <span className="italic" style={{ color: '#2E7D32', fontFamily: 'Georgia, serif' }}>
                    vidas 🍀
                  </span>
                </h2>

                <p className="text-gray-600 leading-relaxed text-lg">
                  O <strong style={{ color: '#1B5E20' }}>RECIFE CAP</strong> é um título de capitalização filantrópico.
                  Ao adquirir um título, você concorre a prêmios e contribui diretamente com o{' '}
                  <strong style={{ color: '#1B5E20' }}>Hospital Infantil Varela Santiago</strong>, cedendo o direito de resgate.
                  Regulamentado pela SUSEP, nossos sorteios são transmitidos ao vivo toda semana,
                  com total transparência e segurança.
                </p>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { valor: 'R$ 120.000', label: 'Prêmio principal por edição' },
                    { valor: '100.000',    label: 'Títulos por edição' },
                    { valor: '100%',       label: 'Pago via PIX instantâneo' },
                  ].map(({ valor, label }) => (
                    <div key={label} className="text-center p-4 rounded-2xl"
                      style={{ background: 'rgba(46,125,50,0.05)', border: '1px solid rgba(46,125,50,0.15)' }}>
                      <p className="font-black text-lg" style={{ color: '#2E7D32' }}>{valor}</p>
                      <p className="text-xs text-gray-500 mt-1">{label}</p>
                    </div>
                  ))}
                </div>

                {/* Badge SUSEP */}
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium text-gray-600"
                  style={{ borderColor: 'rgba(46,125,50,0.3)' }}>
                  <Shield size={16} style={{ color: '#2E7D32' }} />
                  Filantropia Premiável · Regulamentado SUSEP
                </div>

                {/* CTA */}
                <Link href="/cliente/compra"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-black text-lg text-white transition-all hover:scale-105 hover:shadow-xl"
                  style={{
                    background: 'linear-gradient(135deg, #1B5E20, #2E7D32)',
                    boxShadow: '0 8px 30px rgba(46,125,50,0.35)',
                  }}>
                  <Ticket size={20} />
                  Quero meu título
                </Link>
              </div>

              {/* ── Coluna direita — Cartela 3D ── */}
              <div className="relative flex items-center justify-center min-h-[420px]">

                {/* Confetes */}
                {([
                  { top: '5%',  left: '10%',  w: 8,  h: 24, rotate: 12,  color: '#FFC107' },
                  { top: '15%', right: '5%',  w: 10, h: 20, rotate: -20, color: '#2E7D32' },
                  { top: '60%', left: '5%',   w: 6,  h: 18, rotate: 45,  color: '#FFC107' },
                  { top: '75%', right: '10%', w: 8,  h: 22, rotate: -35, color: '#FFC107' },
                  { top: '30%', right: '15%', w: 10, h: 16, rotate: 20,  color: '#2E7D32' },
                  { top: '45%', left: '2%',   w: 6,  h: 20, rotate: -15, color: '#FFC107' },
                  { top: '85%', left: '25%',  w: 8,  h: 14, rotate: 60,  color: '#2E7D32' },
                  { top: '10%', left: '40%',  w: 6,  h: 18, rotate: -45, color: '#FFC107' },
                ] as const).map((c, i) => (
                  <div key={i} className="absolute pointer-events-none rounded-sm"
                    style={{
                      top: c.top, left: (c as any).left, right: (c as any).right,
                      width: c.w, height: c.h,
                      background: c.color,
                      transform: `rotate(${c.rotate}deg)`,
                      opacity: 0.75,
                    }} />
                ))}

                {/* Trevos decorativos */}
                <div className="absolute top-0 right-0 text-8xl opacity-10 select-none pointer-events-none">🍀</div>
                <div className="absolute bottom-0 left-0 text-6xl opacity-10 select-none pointer-events-none">🍀</div>

                {/* Glow dourado */}
                <div className="absolute inset-0 rounded-3xl pointer-events-none"
                  style={{ background: 'radial-gradient(ellipse at center, rgba(255,193,7,0.15) 0%, transparent 70%)' }} />

                {/* Cartela com efeito 3D */}
                <div className="relative z-10 cursor-pointer"
                  style={{
                    transform: 'perspective(1200px) rotateY(-14deg) rotateX(4deg) rotate(-3deg)',
                    filter: 'drop-shadow(0 35px 70px rgba(0,0,0,0.3)) drop-shadow(0 0 30px rgba(255,193,7,0.2))',
                    transition: 'transform 0.4s ease, filter 0.4s ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'perspective(1200px) rotateY(-5deg) rotateX(1deg) rotate(-1deg) scale(1.03)'
                    e.currentTarget.style.filter    = 'drop-shadow(0 40px 80px rgba(0,0,0,0.35)) drop-shadow(0 0 40px rgba(255,193,7,0.3))'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'perspective(1200px) rotateY(-14deg) rotateX(4deg) rotate(-3deg)'
                    e.currentTarget.style.filter    = 'drop-shadow(0 35px 70px rgba(0,0,0,0.3)) drop-shadow(0 0 30px rgba(255,193,7,0.2))'
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={configs.cartela_imagem_url || '/banner.png'}
                    alt="Cartela Recife Cap"
                    className="w-full max-w-lg rounded-2xl"
                    onError={e => { (e.currentTarget as HTMLImageElement).src = '/banner.png' }}
                  />
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════ AO VIVO */}
        <section className="py-20 text-center" style={{ background: '#2E7D32' }}>
          <div className="max-w-2xl mx-auto px-4">
            <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-6"
              style={{ background: 'rgba(255,193,7,0.2)' }}>
              <Radio size={28} style={{ color: '#FFC107' }} />
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-white mb-3">Transmitido ao vivo</h2>
            <p className="text-lg mb-1" style={{ color: 'rgba(187,247,208,0.9)' }}>Todo domingo às 09h00</p>
            <p className="text-base mb-10" style={{ color: 'rgba(187,247,208,0.6)' }}>
              {configs.canal_sorteio || 'TV Ponta Negra · Canal 15'}
            </p>
            <Link href="/cliente/sorteio"
              className="inline-flex items-center gap-2 px-9 py-4 rounded-full font-black text-[#1B5E20] text-base transition-all hover:scale-105 hover:opacity-95"
              style={{ background: '#FFC107', boxShadow: '0 8px 25px rgba(255,193,7,0.4)' }}>
              <Tv size={18} />
              Ver resultados
            </Link>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════ RODAPÉ */}
        <footer id="contato" style={{ background: '#1B5E20' }}>
          <div className="max-w-6xl mx-auto px-4 py-14">
            <div className="grid md:grid-cols-3 gap-10 mb-10">

              {/* Marca */}
              <div>
                <div className="flex items-center gap-2.5 mb-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoUrl} alt={nomeSist} className="w-9 h-9 object-contain"
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                  <span className="font-black text-white tracking-[0.2em] text-sm">RECIFE CAP</span>
                </div>
                <p className="text-sm leading-relaxed mb-5" style={{ color: 'rgba(187,247,208,0.65)' }}>
                  {slogan}
                </p>
                <div className="flex gap-3">
                  {configs.instagram_url && (
                    <a href={configs.instagram_url} target="_blank" rel="noopener noreferrer"
                      className="w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-white/20"
                      style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}>
                      <IconInstagram size={15} />
                    </a>
                  )}
                  {configs.facebook_url && (
                    <a href={configs.facebook_url} target="_blank" rel="noopener noreferrer"
                      className="w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-white/20"
                      style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}>
                      <IconFacebook size={15} />
                    </a>
                  )}
                  {configs.youtube_url && (
                    <a href={configs.youtube_url} target="_blank" rel="noopener noreferrer"
                      className="w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-white/20"
                      style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}>
                      <IconYoutube size={15} />
                    </a>
                  )}
                </div>
              </div>

              {/* Links */}
              <div>
                <p className="text-white font-black text-xs uppercase tracking-widest mb-5">Links</p>
                <div className="space-y-2.5">
                  {[
                    { label: 'Início',        action: () => scrollTo('início')  },
                    { label: 'Sorteio',       action: () => scrollTo('sorteio') },
                    { label: 'Sobre nós',     action: () => scrollTo('sobre')   },
                  ].map(link => (
                    <button key={link.label} onClick={link.action}
                      className="block text-sm hover:text-white transition-colors text-left"
                      style={{ color: 'rgba(187,247,208,0.65)' }}>
                      {link.label}
                    </button>
                  ))}
                  {[
                    { label: 'Comprar títulos', href: '/cliente/compra'  },
                    { label: 'Ver resultados',  href: '/cliente/sorteio' },
                    { label: 'Consultar CPF',   href: '/cliente'         },
                  ].map(link => (
                    <Link key={link.label} href={link.href}
                      className="block text-sm hover:text-white transition-colors"
                      style={{ color: 'rgba(187,247,208,0.65)' }}>
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Contato */}
              <div>
                <p className="text-white font-black text-xs uppercase tracking-widest mb-5">Contato</p>
                <div className="space-y-3">
                  {whatsapp && (
                    <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm hover:text-white transition-colors"
                      style={{ color: 'rgba(187,247,208,0.65)' }}>
                      <MessageCircle size={14} />
                      WhatsApp Suporte
                    </a>
                  )}
                  {configs.email_suporte && (
                    <a href={`mailto:${configs.email_suporte}`}
                      className="flex items-center gap-2 text-sm hover:text-white transition-colors"
                      style={{ color: 'rgba(187,247,208,0.65)' }}>
                      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                      {configs.email_suporte}
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t pt-7 space-y-2" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              {configs.rodape_texto && (
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(187,247,208,0.45)' }}>
                  {configs.rodape_texto}
                </p>
              )}
              <p className="text-xs" style={{ color: 'rgba(187,247,208,0.35)' }}>
                {configs.rodape_direitos ||
                  `© ${new Date().getFullYear()} ${nomeSist}. Todos os direitos reservados.`}
              </p>
            </div>
          </div>
        </footer>

        {/* ══════════════════════════════════════════════════════ BARRA MOBILE FIXA */}
        <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden px-4"
          style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
          <div className="flex items-center justify-around rounded-full px-6 py-3 shadow-2xl"
            style={{
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(0,0,0,0.06)',
            }}>
            <Link href="/cliente"
              className="flex flex-col items-center gap-1 px-4 py-1 text-gray-500 hover:text-[#2E7D32] transition-colors">
              <Ticket size={20} />
              <span className="font-semibold" style={{ fontSize: '10px' }}>Meus Títulos</span>
            </Link>
            <Link href="/cliente/compra"
              className="flex flex-col items-center gap-1 px-6 py-3 rounded-full -mt-8 shadow-xl transition-all hover:scale-105 active:scale-95"
              style={{ background: '#2E7D32', boxShadow: '0 6px 20px rgba(46,125,50,0.5)' }}>
              <ShoppingCart size={22} className="text-white" />
              <span className="font-black text-white" style={{ fontSize: '10px' }}>Comprar</span>
            </Link>
            <Link href="/cliente/sorteio"
              className="flex flex-col items-center gap-1 px-4 py-1 text-gray-500 hover:text-[#2E7D32] transition-colors">
              <BarChart2 size={20} />
              <span className="font-semibold" style={{ fontSize: '10px' }}>Resultados</span>
            </Link>
          </div>
        </div>

        {/* WhatsApp flutuante */}
        {whatsapp && (
          <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer"
            className="fixed right-4 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all"
            style={{ background: '#25D366', bottom: 'calc(env(safe-area-inset-bottom, 0px) + 5.5rem)' }}
            aria-label="WhatsApp">
            <MessageCircle size={26} color="#fff" />
          </a>
        )}

      </div>
    </>
  )
}
