'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useConfig } from '@/lib/config-client'
import {
  Ticket, QrCode, Tv, Trophy,
  MessageCircle, ChevronDown, Menu, X, CheckCircle,
  Radio, ArrowRight, Shield, Mail, MapPin,
} from 'lucide-react'

function IconInstagram({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
    </svg>
  )
}
function IconFacebook({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
    </svg>
  )
}
function IconYoutube({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/>
    </svg>
  )
}

// ── Ganhadores fictícios ───────────────────────────────────────────────────────
const GANHADORES = [
  { nome: 'Maria S.',  cidade: 'Recife',     pdv: 'PDV Centro',     premio: 'R$ 5.000',   sorteio: '1º Prêmio'  },
  { nome: 'João A.',   cidade: 'Olinda',     pdv: 'PDV Olinda',     premio: 'R$ 120.000', sorteio: 'Principal'  },
  { nome: 'Ana C.',    cidade: 'Caruaru',    pdv: 'PDV Caruaru',    premio: 'R$ 5.000',   sorteio: '3º Prêmio'  },
  { nome: 'Pedro M.',  cidade: 'Recife',     pdv: 'Online',         premio: 'R$ 5.000',   sorteio: '2º Prêmio'  },
  { nome: 'Luiza B.',  cidade: 'Jaboatão',  pdv: 'PDV Jaboatão',  premio: 'R$ 5.000',   sorteio: '4º Prêmio'  },
  { nome: 'Carlos R.', cidade: 'Recife',     pdv: 'PDV Boa Viagem', premio: 'R$ 120.000', sorteio: 'Principal'  },
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
      { threshold: 0.12 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return { ref, visible }
}

// ── Componente principal ───────────────────────────────────────────────────────
export default function ClienteHome() {
  const configs = useConfig()

  const logoUrl     = configs.logo_url        || '/logo.png'
  const fundoUrl    = configs.fundo_hero_url  || '/fundo.png'
  const bannerUrl   = configs.banner_home_url || configs.banner_sorteio_url || '/banner.png'
  const nomeSistema = configs.nome_sistema    || 'Recife Cap'
  const slogan      = configs.slogan          || 'Filantropia Premiável'
  const whatsapp    = configs.whatsapp_suporte || '5581999999999'

  const [scrolled,     setScrolled]     = useState(false)
  const [menuOpen,     setMenuOpen]     = useState(false)
  const [proximaData,  setProximaData]  = useState<string | null>(null)

  // Header — efeito ao scrollar
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Próxima data de sorteio
  useEffect(() => {
    fetch('/api/cliente/sorteio-ativo')
      .then(r => r.json())
      .then(d => {
        if (d.edicao?.data_sorteio) {
          const dt = new Date(d.edicao.data_sorteio + 'T00:00:00')
          setProximaData(dt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' }))
        }
      })
      .catch(() => {})
  }, [])

  function scrollTo(id: string) {
    setMenuOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  // Reveals por seção
  const revealSorteio = useReveal()
  const revealComo    = useReveal()
  const revealDepos   = useReveal()
  const revealSobre   = useReveal()
  const revealAoVivo  = useReveal()

  // Contadores animados (seção Sobre)
  const c1 = useCounter(120000, revealSobre.visible)
  const c2 = useCounter(100000, revealSobre.visible)
  const c3 = useCounter(100,    revealSobre.visible)

  const NAV_LINKS = [
    { label: 'Início',    id: 'hero'    },
    { label: 'Sorteio',   id: 'sorteio' },
    { label: 'Sobre',     id: 'sobre'   },
    { label: 'Contato',   id: 'contato' },
  ]

  function formatBRL(str: string, fallback: string) {
    const n = parseFloat(str)
    return isNaN(n) ? fallback : `R$ ${n.toLocaleString('pt-BR')}`
  }

  return (
    <>
      <style>{`
        .reveal { opacity: 0; transform: translateY(24px); transition: opacity .6s ease, transform .6s ease; }
        .reveal.visible { opacity: 1; transform: translateY(0); }
      `}</style>

      <div className="min-h-screen" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>

        {/* ════════════════════════════════════════════════════ HEADER */}
        <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
          style={{
            background:  scrolled ? '#fff' : 'transparent',
            boxShadow:   scrolled ? '0 2px 20px rgba(0,0,0,0.10)' : 'none',
          }}>
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">

            {/* Logo */}
            <button onClick={() => scrollTo('hero')} className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoUrl} alt={nomeSistema} className="w-9 h-9 object-contain"
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
              <span className="font-black text-base tracking-widest"
                style={{ color: scrolled ? '#1B5E20' : '#fff' }}>
                {nomeSistema.toUpperCase()}
              </span>
            </button>

            {/* Nav desktop */}
            <nav className="hidden lg:flex items-center gap-7">
              {NAV_LINKS.map(item => (
                <button key={item.label} onClick={() => scrollTo(item.id)}
                  className="text-sm font-semibold transition-opacity hover:opacity-70"
                  style={{ color: scrolled ? '#374151' : '#fff' }}>
                  {item.label}
                </button>
              ))}
              <Link href="/cliente/sorteio"
                className="text-sm font-semibold transition-opacity hover:opacity-70"
                style={{ color: scrolled ? '#374151' : '#fff' }}>
                Resultados
              </Link>
            </nav>

            {/* CTA + hamburger */}
            <div className="flex items-center gap-3">
              <Link href="/cliente/compra"
                className="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm transition-all hover:opacity-90"
                style={{ background: '#FFC107', color: '#1B5E20' }}>
                Comprar títulos <ArrowRight size={14} />
              </Link>
              <button onClick={() => setMenuOpen(v => !v)} className="lg:hidden"
                style={{ color: scrolled ? '#1B5E20' : '#fff' }}>
                {menuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>

          {/* Menu mobile */}
          {menuOpen && (
            <div className="lg:hidden border-t bg-white" style={{ borderColor: '#e5e7eb' }}>
              <div className="px-4 py-3 space-y-1">
                {NAV_LINKS.map(item => (
                  <button key={item.label} onClick={() => scrollTo(item.id)}
                    className="w-full text-left px-4 py-3 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                    {item.label}
                  </button>
                ))}
                <Link href="/cliente/sorteio"
                  className="block px-4 py-3 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                  Resultados
                </Link>
                <Link href="/cliente/compra"
                  className="flex items-center justify-center gap-2 mt-2 py-3 rounded-full font-bold text-sm"
                  style={{ background: '#FFC107', color: '#1B5E20' }}>
                  Comprar títulos <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          )}
        </header>

        {/* ════════════════════════════════════════════════════ HERO */}
        <section id="hero" className="relative min-h-screen flex flex-col items-center justify-center text-center px-4"
          style={{
            backgroundImage:    `url('${fundoUrl}')`,
            backgroundSize:     'cover',
            backgroundPosition: 'center top',
          }}>
          <div className="absolute inset-0" style={{ background: 'rgba(27,94,32,0.72)' }} />

          <div className="relative z-10 flex flex-col items-center max-w-3xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt={nomeSistema}
              className="w-28 h-28 md:w-40 md:h-40 object-contain drop-shadow-2xl mb-5"
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />

            <h1 className="text-white font-black text-5xl md:text-7xl tracking-widest drop-shadow-2xl mb-2"
              style={{ textShadow: '0 4px 24px rgba(0,0,0,0.5)' }}>
              {nomeSistema.toUpperCase()}
            </h1>
            <p className="font-bold text-xl md:text-2xl tracking-widest mb-7 drop-shadow"
              style={{ color: '#FFC107' }}>
              {slogan.toUpperCase()}
            </p>

            {/* Badge próximo sorteio */}
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold mb-8"
              style={{ background: 'rgba(255,193,7,0.15)', border: '1.5px solid #FFC107', color: '#FFC107' }}>
              <Radio size={14} />
              {proximaData
                ? `PRÓXIMO SORTEIO: ${proximaData.toUpperCase()} ÀS 09H00`
                : 'SORTEIO TODO DOMINGO ÀS 09H00'}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-16">
              <Link href="/cliente/compra"
                className="flex items-center justify-center gap-2 px-9 py-4 rounded-full font-black text-base shadow-2xl transition-all hover:scale-105 active:scale-95"
                style={{ background: '#FFC107', color: '#1B5E20' }}>
                Quero participar <ArrowRight size={18} />
              </Link>
              <Link href="/cliente/sorteio"
                className="flex items-center justify-center px-9 py-4 rounded-full font-bold text-base border-2 text-white transition-all hover:bg-white/10"
                style={{ borderColor: 'rgba(255,255,255,0.55)' }}>
                Ver resultados
              </Link>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
            <ChevronDown size={30} style={{ color: 'rgba(255,255,255,0.55)' }} />
          </div>
        </section>

        {/* ════════════════════════════════════════════════════ SORTEIO DA SEMANA */}
        <section id="sorteio" className="py-24 px-4 bg-white">
          <div ref={revealSorteio.ref}
            className={`max-w-6xl mx-auto reveal ${revealSorteio.visible ? 'visible' : ''}`}>

            <div className="text-center mb-14">
              <span className="text-xs font-bold tracking-widest uppercase px-3 py-1.5 rounded-full inline-block mb-3"
                style={{ background: '#E8F5E9', color: '#2E7D32' }}>Esta semana</span>
              <h2 className="text-3xl md:text-4xl font-black text-gray-900">Sorteio desta semana</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* Banner */}
              <div className="rounded-2xl overflow-hidden shadow-2xl bg-gray-100 min-h-64">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={bannerUrl} alt="Banner do sorteio"
                  className="w-full object-cover" loading="lazy"
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
              </div>

              {/* Prêmios */}
              <div className="space-y-3">
                <h3 className="text-xl font-bold text-gray-800 mb-5">Prêmios desta edição</h3>

                {([1, 2, 3, 4] as const).map(n => (
                  <div key={n} className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100 bg-gray-50">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: '#E8F5E9' }}>
                      <Trophy size={17} style={{ color: '#2E7D32' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 font-medium">{n}º Prêmio</p>
                      <p className="font-semibold text-gray-800 text-sm truncate">
                        {configs[`premio_${n}_nome`] || 'Prêmio em dinheiro'}
                      </p>
                    </div>
                    <span className="font-black text-lg flex-shrink-0" style={{ color: '#2E7D32' }}>
                      {formatBRL(configs[`premio_${n}_valor`] || '', 'R$ 5.000')}
                    </span>
                  </div>
                ))}

                {/* Prêmio principal */}
                <div className="flex items-center gap-4 p-5 rounded-2xl shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #FFC107, #FFD54F)' }}>
                  <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow">
                    <Trophy size={22} style={{ color: '#1B5E20' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black uppercase tracking-wider" style={{ color: '#1B5E20' }}>
                      Prêmio Principal
                    </p>
                    <p className="font-bold text-sm" style={{ color: '#1B5E20' }}>
                      {configs.premio_principal_nome || 'Grande prêmio'}
                    </p>
                  </div>
                  <span className="font-black text-2xl flex-shrink-0" style={{ color: '#1B5E20' }}>
                    {formatBRL(configs.premio_principal_valor || '', `R$ ${configs.premio_principal || '120.000'}`)}
                  </span>
                </div>

                <div className="flex items-center justify-between px-1 text-sm">
                  <span className="text-gray-500">Valor do título</span>
                  <span className="font-black" style={{ color: '#2E7D32' }}>
                    {configs.valor_titulo
                      ? `R$ ${parseFloat(configs.valor_titulo).toFixed(2).replace('.', ',')}`
                      : 'R$ 10,00'}
                  </span>
                </div>

                <Link href="/cliente/compra"
                  className="flex items-center justify-center gap-2 w-full py-4 rounded-full font-black text-white text-base shadow-lg transition-all hover:opacity-90 hover:shadow-xl"
                  style={{ background: 'linear-gradient(135deg, #2E7D32, #43A047)' }}>
                  Garantir meu título <ArrowRight size={18} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════ COMO FUNCIONA */}
        <section className="py-24 px-4" style={{ background: '#1B5E20' }}>
          <div ref={revealComo.ref}
            className={`max-w-5xl mx-auto reveal ${revealComo.visible ? 'visible' : ''}`}>

            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-black text-white mb-3">Como participar</h2>
              <p className="text-base" style={{ color: 'rgba(187,247,208,0.8)' }}>Simples, seguro e 100% online</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { n: '01', label: 'Escolha seu título',   desc: 'Selecione a quantidade desejada e preencha o cadastro rapidamente', icon: <Ticket size={28} /> },
                { n: '02', label: 'Pague via PIX',        desc: 'Escaneie o QR Code e confirme o pagamento em segundos, sem taxas',  icon: <QrCode  size={28} /> },
                { n: '03', label: 'Acompanhe o sorteio',  desc: 'Assista ao vivo e veja se você é o próximo ganhador',               icon: <Tv      size={28} /> },
              ].map(step => (
                <div key={step.n} className="p-7 rounded-2xl text-center"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(255,193,7,0.25)' }}>
                  <p className="text-5xl font-black mb-4" style={{ color: '#FFC107' }}>{step.n}</p>
                  <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center mb-5"
                    style={{ background: 'rgba(255,193,7,0.15)', color: '#FFC107' }}>
                    {step.icon}
                  </div>
                  <h3 className="font-bold text-white text-lg mb-2">{step.label}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(187,247,208,0.75)' }}>{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════ DEPOIMENTOS */}
        <section className="py-24 px-4" style={{ background: '#f8f9fa' }}>
          <div ref={revealDepos.ref}
            className={`max-w-6xl mx-auto reveal ${revealDepos.visible ? 'visible' : ''}`}>

            <div className="text-center mb-14">
              <span className="text-xs font-bold tracking-widest uppercase px-3 py-1.5 rounded-full inline-block mb-3"
                style={{ background: '#E8F5E9', color: '#2E7D32' }}>Ganhadores</span>
              <h2 className="text-3xl md:text-4xl font-black text-gray-900">Quem já ganhou</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {GANHADORES.map((g, i) => (
                <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-white flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #2E7D32, #43A047)' }}>
                      {g.nome.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900">{g.nome}</p>
                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                        <MapPin size={10} />
                        <span>{g.cidade} · {g.pdv}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                      style={{ background: '#FFF8E1', color: '#F57F17' }}>
                      {g.sorteio}
                    </span>
                    <span className="font-black text-base" style={{ color: '#2E7D32' }}>{g.premio}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-gray-50">
                    <CheckCircle size={12} style={{ color: '#2E7D32' }} />
                    <span className="text-xs font-medium" style={{ color: '#2E7D32' }}>Ganhador verificado</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════ SOBRE NÓS */}
        <section id="sobre" className="py-24 px-4 bg-white">
          <div ref={revealSobre.ref}
            className={`max-w-6xl mx-auto reveal ${revealSobre.visible ? 'visible' : ''}`}>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              {/* Texto */}
              <div>
                <span className="text-xs font-bold tracking-widest uppercase px-3 py-1.5 rounded-full inline-block mb-5"
                  style={{ background: '#E8F5E9', color: '#2E7D32' }}>Quem somos</span>
                <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-6">
                  Sorteios que transformam vidas
                </h2>
                <p className="text-gray-600 leading-relaxed mb-4">
                  O <strong>{nomeSistema}</strong> é um título de capitalização filantrópico.
                  Ao adquirir um título, você concorre a prêmios e contribui diretamente
                  com o <strong>Hospital Infantil Varela Santiago</strong>, cedendo o direito de resgate.
                </p>
                <p className="text-gray-600 leading-relaxed mb-7">
                  Regulamentado pela SUSEP, nossos sorteios são transmitidos ao vivo
                  toda semana, com total transparência e segurança.
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full font-bold text-sm"
                  style={{ background: '#E8F5E9', color: '#2E7D32' }}>
                  <Shield size={14} />
                  Filantropia Premiável · Regulamentado SUSEP
                </div>
              </div>

              {/* Números em destaque */}
              <div className="space-y-4">
                <div className="p-6 rounded-2xl shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #FFC107, #FFD54F)' }}>
                  <p className="font-black text-4xl md:text-5xl" style={{ color: '#1B5E20' }}>
                    R$ {c1.toLocaleString('pt-BR')}
                  </p>
                  <p className="font-medium mt-1 text-sm" style={{ color: '#1B5E20' }}>Prêmio principal</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-6 rounded-2xl bg-gray-50">
                    <p className="font-black text-3xl" style={{ color: '#2E7D32' }}>
                      {c2.toLocaleString('pt-BR')}
                    </p>
                    <p className="text-gray-500 text-sm mt-1">Títulos por edição</p>
                  </div>
                  <div className="p-6 rounded-2xl bg-gray-50">
                    <p className="font-black text-3xl" style={{ color: '#2E7D32' }}>{c3}%</p>
                    <p className="text-gray-500 text-sm mt-1">Pago via PIX instantâneo</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════ SORTEIO AO VIVO */}
        <section className="py-24 px-4 text-center" style={{ background: '#2E7D32' }}>
          <div ref={revealAoVivo.ref}
            className={`max-w-3xl mx-auto reveal ${revealAoVivo.visible ? 'visible' : ''}`}>

            <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-6"
              style={{ background: 'rgba(255,193,7,0.18)' }}>
              <Radio size={30} style={{ color: '#FFC107' }} />
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-white mb-3">
              Sorteio transmitido ao vivo
            </h2>
            <p className="text-lg mb-1" style={{ color: 'rgba(187,247,208,0.9)' }}>
              Todo domingo às 09h00
            </p>
            <p className="text-base mb-10" style={{ color: 'rgba(187,247,208,0.65)' }}>
              {configs.canal_sorteio || 'TV Ponta Negra · Canal 15'}
            </p>
            <Link href="/cliente/sorteio"
              className="inline-flex items-center gap-2 px-9 py-4 rounded-full font-black text-base shadow-xl transition-all hover:opacity-90 hover:scale-105"
              style={{ background: '#FFC107', color: '#1B5E20' }}>
              <Tv size={18} />
              Acompanhar ao vivo
            </Link>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════ RODAPÉ */}
        <footer id="contato" style={{ background: '#1B5E20' }}>
          <div className="max-w-6xl mx-auto px-4 py-14">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-12">

              {/* Marca */}
              <div>
                <div className="flex items-center gap-2.5 mb-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoUrl} alt={nomeSistema} className="w-10 h-10 object-contain"
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                  <span className="font-black text-white text-base tracking-widest">
                    {nomeSistema.toUpperCase()}
                  </span>
                </div>
                <p className="text-sm leading-relaxed mb-5" style={{ color: 'rgba(187,247,208,0.75)' }}>
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
                <p className="text-white font-bold mb-4 text-xs uppercase tracking-widest">Links</p>
                <div className="space-y-2.5">
                  {[
                    { label: 'Início',         action: () => scrollTo('hero')    },
                    { label: 'Como funciona',  action: () => scrollTo('sorteio') },
                    { label: 'Sobre nós',      action: () => scrollTo('sobre')   },
                  ].map(link => (
                    <button key={link.label} onClick={link.action}
                      className="block text-sm hover:text-white transition-colors"
                      style={{ color: 'rgba(187,247,208,0.75)' }}>
                      {link.label}
                    </button>
                  ))}
                  {[
                    { label: 'Comprar títulos', href: '/cliente/compra'   },
                    { label: 'Ver resultados',  href: '/cliente/sorteio'  },
                    { label: 'Consultar CPF',   href: '/cliente'          },
                  ].map(link => (
                    <Link key={link.label} href={link.href}
                      className="block text-sm hover:text-white transition-colors"
                      style={{ color: 'rgba(187,247,208,0.75)' }}>
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Contato */}
              <div>
                <p className="text-white font-bold mb-4 text-xs uppercase tracking-widest">Contato</p>
                <div className="space-y-3">
                  {configs.whatsapp_suporte && (
                    <a href={`https://wa.me/${configs.whatsapp_suporte}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm hover:text-white transition-colors"
                      style={{ color: 'rgba(187,247,208,0.75)' }}>
                      <MessageCircle size={14} />
                      WhatsApp Suporte
                    </a>
                  )}
                  {configs.email_suporte && (
                    <a href={`mailto:${configs.email_suporte}`}
                      className="flex items-center gap-2 text-sm hover:text-white transition-colors"
                      style={{ color: 'rgba(187,247,208,0.75)' }}>
                      <Mail size={14} />
                      {configs.email_suporte}
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Rodapé legal */}
            <div className="border-t pt-7 space-y-2"
              style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
              {configs.rodape_texto && (
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(187,247,208,0.5)' }}>
                  {configs.rodape_texto}
                </p>
              )}
              <p className="text-xs" style={{ color: 'rgba(187,247,208,0.4)' }}>
                {configs.rodape_direitos ||
                  `© ${new Date().getFullYear()} ${nomeSistema}. Todos os direitos reservados.`}
              </p>
            </div>
          </div>
        </footer>

        {/* WhatsApp flutuante */}
        <a href={`https://wa.me/${whatsapp}`}
          target="_blank" rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-transform hover:scale-110 active:scale-95"
          style={{ background: '#25D366' }}
          aria-label="WhatsApp">
          <MessageCircle size={26} color="#fff" />
        </a>

      </div>
    </>
  )
}
