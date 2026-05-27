'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useConfig } from '@/lib/config-client'
import {
  Trophy, Ticket, QrCode, Tv, ChevronDown, ChevronRight, Menu, X,
  CheckCircle, ShoppingCart, BarChart2, MessageCircle,
  Shield, MapPin, Radio,
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

// ── Ganhadores fictícios ───────────────────────────────────────────────────────
const GANHADORES = [
  { nome: 'Maria S.',  cidade: 'Recife, PE',   pdv: 'PDV Centro',  premio: 'R$ 5.000',   sorteio: '1º Prêmio',       iniciais: 'MS', cor: '#2E7D32' },
  { nome: 'João C.',   cidade: 'Olinda, PE',   pdv: 'Web/App',     premio: 'R$ 120.000', sorteio: 'Prêmio Principal', iniciais: 'JC', cor: '#1B5E20' },
  { nome: 'Ana R.',    cidade: 'Caruaru, PE',  pdv: 'PDV Norte',   premio: 'R$ 5.000',   sorteio: '2º Prêmio',       iniciais: 'AR', cor: '#388E3C' },
  { nome: 'Pedro M.',  cidade: 'Recife, PE',   pdv: 'Web/App',     premio: 'R$ 5.000',   sorteio: '3º Prêmio',       iniciais: 'PM', cor: '#2E7D32' },
  { nome: 'Lucia B.',  cidade: 'Paulista, PE', pdv: 'PDV Sul',     premio: 'R$ 1.000',   sorteio: 'Giro da Sorte',   iniciais: 'LB', cor: '#1B5E20' },
  { nome: 'Carlos N.', cidade: 'Recife, PE',   pdv: 'Web/App',     premio: 'R$ 120.000', sorteio: 'Prêmio Principal', iniciais: 'CN', cor: '#388E3C' },
]

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
  const [edicaoId,    setEdicaoId]    = useState<string | null>(null)
  const [premios,     setPremios]     = useState<any[]>([])

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
        if (d.edicao?.id)     setEdicaoId(d.edicao.id)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!edicaoId) return
    fetch(`/api/cliente/premios?edicao_id=${edicaoId}`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setPremios(data) })
      .catch(() => {})
  }, [edicaoId])

  function scrollTo(id: string) {
    setMenuOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  const revealSorteio = useReveal()
  const revealComo    = useReveal()
  const revealDepos   = useReveal()
  const revealSobre   = useReveal()

  const c1 = useCounter(120000, revealSobre.visible)
  const c2 = useCounter(100000, revealSobre.visible)
  const c3 = useCounter(100,    revealSobre.visible)

  function brl(str: string | undefined, fallback: string) {
    if (!str) return fallback
    const n = parseFloat(str.replace(/\./g, '').replace(',', '.'))
    return isNaN(n) ? fallback : `R$ ${n.toLocaleString('pt-BR')}`
  }

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
        <section id="início" className="relative flex flex-col items-center justify-center text-center px-4"
          style={{
            minHeight: '100dvh',
            backgroundImage: `url('${fundoUrl}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center top',
          }}
        >
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(to bottom, rgba(27,94,32,0.88) 0%, rgba(27,94,32,0.72) 50%, rgba(27,94,32,0.92) 100%)' }} />

          <div className="relative z-10 flex flex-col items-center max-w-3xl pt-16">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt={nomeSist}
              className="w-28 h-28 md:w-36 md:h-36 object-contain drop-shadow-2xl mb-6"
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />

            <h1 className="text-white font-black leading-none tracking-tighter mb-3"
              style={{ fontSize: 'clamp(3.2rem, 9vw, 7.5rem)', textShadow: '0 6px 40px rgba(0,0,0,0.6)' }}>
              RECIFE CAP
            </h1>
            <p className="font-bold tracking-[0.35em] text-sm md:text-base mb-8"
              style={{ color: '#FFC107', textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>
              {slogan.toUpperCase()}
            </p>

            {/* Badge sorteio pulsando */}
            <div className="inline-flex items-center gap-2.5 border rounded-full px-6 py-2.5 mb-10"
              style={{ background: 'rgba(255,193,7,0.12)', borderColor: 'rgba(255,193,7,0.5)' }}>
              <span className="w-2 h-2 rounded-full bg-[#FFC107] animate-pulse flex-shrink-0" />
              <span className="text-[#FFC107] text-sm font-bold tracking-wider">
                {proximaData
                  ? `PRÓXIMO SORTEIO: ${proximaData} ÀS 09H00`
                  : 'SORTEIO TODO DOMINGO ÀS 09H00'}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/cliente/compra"
                className="px-10 py-4 rounded-full font-black text-[#1B5E20] text-lg transition-all hover:scale-105 active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #FFC107, #FFD54F)',
                  boxShadow: '0 8px 30px rgba(255,193,7,0.45)',
                }}>
                Quero participar →
              </Link>
              <button onClick={() => scrollTo('sorteio')}
                className="px-10 py-4 rounded-full font-bold text-white text-lg border-2 hover:bg-white/10 transition-all"
                style={{ borderColor: 'rgba(255,255,255,0.45)' }}>
                Ver sorteio
              </button>
            </div>
          </div>

          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
            <ChevronDown size={28} style={{ color: 'rgba(255,255,255,0.5)' }} />
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════ SORTEIO */}
        <section id="sorteio" className="py-20 bg-white">
          <div ref={revealSorteio.ref}
            className={`max-w-6xl mx-auto px-4 reveal ${revealSorteio.visible ? 'visible' : ''}`}>

            <div className="text-center mb-12">
              {edicaoNum && (
                <span className="text-[#FFC107] text-xs font-black uppercase tracking-widest">
                  Edição {edicaoNum}
                </span>
              )}
              <h2 className="text-3xl md:text-4xl font-black text-gray-900 mt-1">Sorteio desta semana</h2>
            </div>

            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Banner */}
              <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-gray-100 min-h-64">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={configs.banner_sorteio_url || configs.banner_home_url || '/banner.png'}
                  alt="Banner do sorteio"
                  className="w-full object-cover"
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                />
                {configs.valor_titulo && (
                  <div className="absolute -bottom-0 right-4 bottom-4 bg-[#FFC107] text-[#1B5E20] px-5 py-2.5 rounded-2xl font-black text-base shadow-lg">
                    R$ {parseFloat(configs.valor_titulo).toFixed(2).replace('.', ',')} / título
                  </div>
                )}
              </div>

              {/* Prêmios */}
              <div className="space-y-3">
                {premios.length > 0 ? (
                  premios.map(p => (
                    <div key={p.id}
                      className={`flex items-center gap-4 p-4 rounded-2xl border transition-all hover:shadow-md ${
                        p.destaque
                          ? 'border-[#FFC107] text-white'
                          : 'border-gray-100 hover:border-[#2E7D32]/30 hover:bg-green-50'
                      }`}
                      style={p.destaque ? { background: 'linear-gradient(135deg, #1B5E20, #2E7D32)' } : undefined}>

                      {/* Foto do prêmio */}
                      <div className="w-20 h-16 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center"
                        style={{ background: '#000' }}>
                        {p.foto_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.foto_url}
                            alt={p.nome}
                            className="w-full h-full object-contain p-1"
                            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                          />
                        ) : (
                          <Trophy size={28} style={{ color: p.destaque ? '#FFC107' : '#2E7D32' }} />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium truncate ${p.destaque ? 'text-green-300' : 'text-gray-500'}`}>
                          {p.nome}{p.quantidade > 1 ? ` · ${p.quantidade}x` : ''}
                        </p>
                        <p className={`font-black text-xl leading-tight ${p.destaque ? 'text-white' : 'text-gray-900'}`}>
                          R$ {p.valor}
                        </p>
                      </div>

                      {p.destaque && <Trophy size={32} style={{ color: '#FFC107', flexShrink: 0 }} />}
                    </div>
                  ))
                ) : (
                  /* Fallback estático enquanto não há prêmios cadastrados */
                  <>
                    {([1, 2, 3, 4] as const).map(n => (
                      <div key={n} className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100 hover:border-[#2E7D32]/25 hover:bg-green-50/50 transition-all">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: '#E8F5E9' }}>
                          <Trophy size={18} style={{ color: '#2E7D32' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-400 font-medium">{n}º Prêmio</p>
                          <p className="font-semibold text-gray-700 text-sm truncate">
                            {configs[`premio_${n}_nome`] || 'Prêmio em dinheiro'}
                          </p>
                        </div>
                        <span className="font-black text-base flex-shrink-0" style={{ color: '#2E7D32' }}>
                          {brl(configs[`premio_${n}_valor`], 'R$ 5.000')}
                        </span>
                      </div>
                    ))}
                    <div className="p-5 rounded-2xl text-white"
                      style={{ background: 'linear-gradient(135deg, #1B5E20, #2E7D32)' }}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-green-300 text-xs font-black uppercase tracking-wider mb-1">Prêmio Principal</p>
                          <p className="text-2xl md:text-3xl font-black">
                            {brl(configs.premio_principal_valor, 'R$ 120.000')}
                          </p>
                          {configs.premio_principal_nome && (
                            <p className="text-green-200 text-sm mt-0.5">{configs.premio_principal_nome}</p>
                          )}
                        </div>
                        <Trophy size={44} style={{ color: '#FFC107', opacity: 0.9 }} />
                      </div>
                    </div>
                  </>
                )}

                <Link href="/cliente/compra"
                  className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-black text-[#1B5E20] text-base transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(135deg, #FFC107, #FFD54F)',
                    boxShadow: '0 6px 20px rgba(255,193,7,0.35)',
                  }}>
                  <ShoppingCart size={18} />
                  Garantir meu título agora →
                </Link>
              </div>
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
        <section className="py-20" style={{ background: '#f8f9fa' }}>
          <div ref={revealDepos.ref}
            className={`max-w-6xl mx-auto px-4 reveal ${revealDepos.visible ? 'visible' : ''}`}>

            <div className="text-center mb-12">
              <span className="text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-full inline-block mb-3"
                style={{ background: '#E8F5E9', color: '#2E7D32' }}>
                Ganhadores
              </span>
              <h2 className="text-3xl md:text-4xl font-black text-gray-900">Quem já ganhou</h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {GANHADORES.map((g, i) => (
                <div key={i}
                  className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all duration-300">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-base flex-shrink-0"
                      style={{ background: g.cor }}>
                      {g.iniciais}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-gray-900">{g.nome}</p>
                      <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                        <MapPin size={10} />
                        <span>{g.cidade} · {g.pdv}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black px-3 py-1.5 rounded-full"
                      style={{ background: 'rgba(255,193,7,0.15)', color: '#1B5E20' }}>
                      {g.sorteio}
                    </span>
                    <span className="font-black text-lg" style={{ color: '#2E7D32' }}>{g.premio}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-gray-50">
                    <CheckCircle size={13} style={{ color: '#2E7D32' }} />
                    <span className="text-xs font-medium text-gray-400">Ganhador verificado</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════ SOBRE NÓS */}
        <section id="sobre" className="py-20 bg-white">
          <div ref={revealSobre.ref}
            className={`max-w-6xl mx-auto px-4 reveal ${revealSobre.visible ? 'visible' : ''}`}>

            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <span className="text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-full inline-block mb-5"
                  style={{ background: '#E8F5E9', color: '#2E7D32' }}>
                  Quem somos
                </span>
                <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-6">
                  Sorteios que transformam vidas
                </h2>
                <p className="text-gray-600 leading-relaxed mb-4">
                  O <strong>RECIFE CAP</strong> é um título de capitalização filantrópico.
                  Ao adquirir um título, você concorre a prêmios e contribui diretamente com o{' '}
                  <strong>Hospital Infantil Varela Santiago</strong>, cedendo o direito de resgate.
                </p>
                <p className="text-gray-600 leading-relaxed mb-8">
                  Regulamentado pela SUSEP, nossos sorteios são transmitidos ao vivo toda semana,
                  com total transparência e segurança.
                </p>
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-full font-bold text-sm w-fit"
                  style={{ background: '#E8F5E9', color: '#2E7D32' }}>
                  <Shield size={14} />
                  Filantropia Premiável · Regulamentado SUSEP
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-7 rounded-3xl shadow-xl"
                  style={{ background: 'linear-gradient(135deg, #FFC107, #FFD54F)' }}>
                  <p className="font-black text-4xl md:text-5xl" style={{ color: '#1B5E20' }}>
                    R$ {c1.toLocaleString('pt-BR')}
                  </p>
                  <p className="font-semibold text-sm mt-1" style={{ color: '#1B5E20', opacity: 0.75 }}>
                    Prêmio principal por edição
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-6 rounded-3xl bg-gray-50">
                    <p className="font-black text-3xl" style={{ color: '#2E7D32' }}>
                      {c2.toLocaleString('pt-BR')}
                    </p>
                    <p className="text-gray-500 text-sm mt-1">Títulos por edição</p>
                  </div>
                  <div className="p-6 rounded-3xl bg-gray-50">
                    <p className="font-black text-3xl" style={{ color: '#2E7D32' }}>{c3}%</p>
                    <p className="text-gray-500 text-sm mt-1">Pago via PIX instantâneo</p>
                  </div>
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
