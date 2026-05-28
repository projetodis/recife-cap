'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useConfig } from '@/lib/config-client'

// ── Máscaras ──────────────────────────────────────────────────────────────────
function maskCPF(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}
function maskFone(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return `(${d}`
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}
function formatTime(secs: number): string {
  const m = Math.floor(secs / 60).toString().padStart(2, '0')
  const s = (secs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}
function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function dataBR(iso: string): string {
  if (!iso) return ''
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR')
}

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface EdicaoAtiva {
  id: string; numero: number; data_sorteio: string
  hora_sorteio: string; valor_unitario: number; premio_principal: number
}

interface PixData {
  pix_id: string; qr_base64: string; pix_payload: string
  chave_pix: string; valor_total: number; quantidade: number
  titulos_reservados: string[]; expira_em: string
}

type Tela = 'selecao' | 'formulario'

// ── Componente ────────────────────────────────────────────────────────────────
export default function CompraPage() {
  const router  = useRouter()
  const configs = useConfig()

  const logoUrl     = configs.logo_url       || '/logo.png'
  const fundoUrl    = configs.fundo_hero_url || '/fundo.png'
  const nomeSistema = configs.nome_sistema   || 'Recife Cap'

  const [tela, setTela]                         = useState<Tela>('selecao')
  const [etapa, setEtapa]                       = useState<1 | 2 | 3>(1)

  const [edicoes, setEdicoes]                   = useState<EdicaoAtiva[]>([])
  const [edicaoSelecionada, setEdicaoSelecionada] = useState<EdicaoAtiva | null>(null)
  const [carregando, setCarregando]             = useState(true)

  const [cpf, setCpf]               = useState('')
  const [nome, setNome]             = useState('')
  const [telefone, setTelefone]     = useState('')
  const [dataNasc, setDataNasc]     = useState('')
  const [quantidade, setQuantidade] = useState(1)
  const [aceite, setAceite]         = useState(false)
  const [erros, setErros]           = useState<Record<string, string>>({})
  const [loadingContinuar, setLoadingContinuar] = useState(false)

  const [pixData, setPixData]             = useState<PixData | null>(null)
  const [tempoRestante, setTempoRestante] = useState(900)
  const [loadingPagar, setLoadingPagar]   = useState(false)
  const [erroPix, setErroPix]             = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [titulosConfirmados, setTitulosConfirmados] = useState<string[]>([])

  useEffect(() => {
    fetch('/api/cliente/sorteio-ativo')
      .then(r => r.json())
      .then(d => { if (d.edicao) setEdicoes([d.edicao]) })
      .catch(() => {})
      .finally(() => setCarregando(false))
  }, [])

  useEffect(() => {
    if (etapa !== 2) return
    setTempoRestante(900)
    const timer = setInterval(() => {
      setTempoRestante(t => {
        if (t <= 1) { clearInterval(timer); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [etapa])

  useEffect(() => {
    if (etapa !== 2 || !pixData?.pix_id) return
    pollRef.current = setInterval(async () => {
      try {
        const res  = await fetch(`/api/cliente/status-pagamento?pix_id=${pixData.pix_id}`)
        const data = await res.json()
        if (data.pago) {
          clearInterval(pollRef.current!)
          setTitulosConfirmados(data.titulos)
          setEtapa(3)
        }
      } catch { /* ignora erros de rede no poll */ }
    }, 5000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [etapa, pixData?.pix_id])

  function selecionarEdicao(edicao: EdicaoAtiva) {
    setEdicaoSelecionada(edicao)
    setEtapa(1)
    setTela('formulario')
  }

  async function continuar(e: React.FormEvent) {
    e.preventDefault()
    const novosErros: Record<string, string> = {}
    if (cpf.replace(/\D/g, '').length !== 11) novosErros.cpf = 'CPF inválido'
    if (!nome.trim()) novosErros.nome = 'Nome obrigatório'
    if (telefone.replace(/\D/g, '').length < 10) novosErros.telefone = 'Telefone inválido'
    if (!aceite) novosErros.aceite = 'Aceite os termos para continuar'
    if (Object.keys(novosErros).length) { setErros(novosErros); return }

    setLoadingContinuar(true)
    try {
      const res = await fetch('/api/cliente/comprar', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ cpf, nome, telefone, data_nascimento: dataNasc, quantidade }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.erro ?? `Erro ${res.status}`)
      setPixData(data)
      setEtapa(2)
    } catch (err: unknown) {
      setErros({ geral: err instanceof Error ? err.message : 'Erro ao reservar cartelas' })
    } finally {
      setLoadingContinuar(false)
    }
  }

  async function confirmarPagamento() {
    if (!pixData) return
    setLoadingPagar(true)
    setErroPix('')
    try {
      const res = await fetch('/api/cliente/confirmar-pagamento', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ pix_id: pixData.pix_id }),
      })
      const data = await res.json()
      if (!res.ok || !data.pago) throw new Error(data.erro ?? 'Pagamento não confirmado')
      if (pollRef.current) clearInterval(pollRef.current)
      setTitulosConfirmados(data.titulos)
      setEtapa(3)
    } catch (err: unknown) {
      setErroPix(err instanceof Error ? err.message : 'Erro ao confirmar pagamento')
    } finally {
      setLoadingPagar(false)
    }
  }

  function compartilharWhatsApp() {
    const txt = encodeURIComponent(
      `Acabei de comprar meu título Recife Cap! 🍀\nNúmero(s): ${titulosConfirmados.join(', ')}\nSorteio: ${edicaoSelecionada ? dataBR(edicaoSelecionada.data_sorteio) : ''}`
    )
    window.open(`https://wa.me/?text=${txt}`, '_blank')
  }

  const etapaLabels = ['', 'Seus dados', 'Pagamento PIX', 'Tudo certo!']

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section
        style={{
          backgroundImage: `url('${fundoUrl}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
        }}
        className="relative flex flex-col items-center justify-center h-[25vh]"
      >
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 flex flex-col items-center text-center px-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl} alt={nomeSistema} className="w-32 h-32 object-contain drop-shadow-2xl mb-3" />
          <h1 className="text-white text-2xl font-black tracking-widest drop-shadow-xl">{nomeSistema.toUpperCase()}</h1>
        </div>
      </section>

      {/* ── Card principal ────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col items-center px-4 pb-10">
        <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-auto -mt-10 relative z-10 overflow-hidden">

          {/* ════════════════════════════════════════════════════════════════
              TELA: SELEÇÃO DE PRODUTO
          ════════════════════════════════════════════════════════════════ */}
          {tela === 'selecao' && (
            <>
              {/* Header seleção */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <button
                  onClick={() => router.back()}
                  className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M15 18l-6-6 6-6"/>
                  </svg>
                  Voltar
                </button>
                <Link
                  href="/cliente/consulta-cpf"
                  className="border text-sm font-medium px-4 py-1.5 rounded-full transition-colors"
                  style={{ borderColor: '#2E7D32', color: '#2E7D32' }}
                >
                  Consultar
                </Link>
              </div>

              {/* Conteúdo seleção */}
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Compra de títulos</h2>

                {carregando && (
                  <div className="border border-gray-100 rounded-xl p-4 animate-pulse h-24" />
                )}

                {!carregando && edicoes.length === 0 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 text-sm text-orange-700 text-center">
                    Nenhuma edição ativa no momento. Volte em breve!
                  </div>
                )}

                {!carregando && edicoes.map(edicao => (
                  <div
                    key={edicao.id}
                    className="flex items-center justify-between p-4 border-2 border-l-4 rounded-xl mb-3 cursor-pointer transition-all hover:shadow-md"
                    style={{ borderColor: '#E5E7EB', borderLeftColor: '#2E7D32' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = '#2E7D32'}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLElement
                      el.style.borderColor = '#E5E7EB'
                      el.style.borderLeftColor = '#2E7D32'
                    }}
                    onClick={() => selecionarEdicao(edicao)}
                  >
                    <div className="flex items-center gap-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={logoUrl}
                        alt={nomeSistema}
                        className="w-14 h-14 rounded-xl object-contain p-1"
                        style={{ background: '#F0FAF0' }}
                      />
                      <div>
                        <p className="font-bold text-gray-900">{nomeSistema.toUpperCase()}</p>
                        <p className="text-sm text-gray-500">
                          Edição {edicao.numero} · Sorteio: {dataBR(edicao.data_sorteio)}
                        </p>
                        <p className="text-sm font-semibold mt-0.5" style={{ color: '#2E7D32' }}>
                          {formatBRL(edicao.valor_unitario)} · Prêmio {formatBRL(edicao.premio_principal)}
                        </p>
                      </div>
                    </div>
                    <button
                      className="text-white font-bold px-6 py-2.5 rounded-full text-sm transition-colors flex-shrink-0 ml-4"
                      style={{ background: '#2E7D32' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#1B5E20'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#2E7D32'}
                    >
                      Selecionar
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ════════════════════════════════════════════════════════════════
              TELA: FORMULÁRIO (etapas 1 / 2 / 3)
          ════════════════════════════════════════════════════════════════ */}
          {tela === 'formulario' && (
            <>
              {/* Header formulário com steps */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <button
                  onClick={() => {
                    if (etapa === 1) { setTela('selecao'); return }
                    setEtapa(e => (e - 1) as 1 | 2 | 3)
                  }}
                  className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M15 18l-6-6 6-6"/>
                  </svg>
                  Voltar
                </button>

                {/* Step indicators */}
                <div className="flex items-center gap-2">
                  {[1, 2, 3].map(n => (
                    <div key={n} className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                        style={{
                          background: n < etapa ? '#2E7D32' : n === etapa ? '#FFC107' : '#E5E7EB',
                          color: n < etapa ? '#fff' : n === etapa ? '#1B5E20' : '#9CA3AF',
                        }}
                      >
                        {n < etapa ? '✓' : n}
                      </div>
                      {n < 3 && (
                        <div className="w-8 h-0.5 rounded-full" style={{ background: n < etapa ? '#2E7D32' : '#E5E7EB' }} />
                      )}
                    </div>
                  ))}
                </div>

                <Link
                  href="/cliente/consulta-cpf"
                  className="text-sm font-medium transition-colors"
                  style={{ color: '#2E7D32' }}
                >
                  Consultar
                </Link>
              </div>

              {/* Step label */}
              <div className="px-6 pt-4 pb-2">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                  Passo {etapa} de 3 · {etapaLabels[etapa]}
                </p>
              </div>

              {/* ── ETAPA 1: Formulário ─────────────────────────────────────── */}
              {etapa === 1 && (
                <div className="flex flex-col lg:flex-row gap-0 px-6 pb-6">

                  {/* Coluna esquerda: banner de compra */}
                  <div className="lg:w-2/5 flex flex-col items-center justify-start pt-4 lg:pr-8 mb-6 lg:mb-0">
                    <div className="w-full bg-gray-50 flex items-center justify-center rounded-2xl min-h-[220px] p-4">
                      {configs.banner_compra_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={configs.banner_compra_url}
                          alt={nomeSistema}
                          className="w-full rounded-xl object-contain max-h-[400px]"
                        />
                      ) : logoUrl !== '/logo.png' ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={logoUrl}
                          alt={nomeSistema}
                          className="w-48 h-48 object-contain mx-auto"
                        />
                      ) : (
                        <div className="text-center text-gray-300">
                          <p className="text-6xl mb-2">🍀</p>
                          <p className="text-sm">{nomeSistema}</p>
                        </div>
                      )}
                    </div>

                    {edicaoSelecionada && (
                      <div className="mt-4 w-full bg-gray-50 rounded-xl p-4 space-y-1">
                        <p className="text-xs text-gray-500">Sorteio</p>
                        <p className="font-semibold text-gray-800 text-sm">
                          {dataBR(edicaoSelecionada.data_sorteio)} às {edicaoSelecionada.hora_sorteio}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">Prêmio principal</p>
                        <p className="font-bold text-base" style={{ color: 'var(--color-primary)' }}>
                          {formatBRL(edicaoSelecionada.premio_principal)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Coluna direita: formulário */}
                  <div className="lg:w-3/5 lg:pl-8 lg:border-l border-gray-100">
                    <form onSubmit={continuar} className="space-y-4">

                      <div>
                        <label className="text-xs font-medium text-gray-500 mb-1 block">CPF *</label>
                        <input
                          type="text" inputMode="numeric" placeholder="000.000.000-00"
                          value={cpf} onChange={e => setCpf(maskCPF(e.target.value))}
                          className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 tracking-widest ${erros.cpf ? 'border-red-400' : 'border-gray-200'}`}
                          style={{ '--tw-ring-color': '#2E7D32' } as React.CSSProperties}
                        />
                        {erros.cpf && <p className="text-red-500 text-xs mt-1">{erros.cpf}</p>}
                      </div>

                      <div>
                        <label className="text-xs font-medium text-gray-500 mb-1 block">Nome completo *</label>
                        <input
                          type="text" placeholder="Seu nome" autoCapitalize="words"
                          value={nome} onChange={e => setNome(e.target.value)}
                          className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ${erros.nome ? 'border-red-400' : 'border-gray-200'}`}
                          style={{ '--tw-ring-color': '#2E7D32' } as React.CSSProperties}
                        />
                        {erros.nome && <p className="text-red-500 text-xs mt-1">{erros.nome}</p>}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-gray-500 mb-1 block">Data de nascimento</label>
                          <input
                            type="date" value={dataNasc} onChange={e => setDataNasc(e.target.value)}
                            className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2"
                            style={{ '--tw-ring-color': '#2E7D32' } as React.CSSProperties}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500 mb-1 block">Telefone *</label>
                          <input
                            type="text" inputMode="numeric" placeholder="(81) 99999-9999"
                            value={telefone} onChange={e => setTelefone(maskFone(e.target.value))}
                            className={`w-full border rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 ${erros.telefone ? 'border-red-400' : 'border-gray-200'}`}
                            style={{ '--tw-ring-color': '#2E7D32' } as React.CSSProperties}
                          />
                          {erros.telefone && <p className="text-red-500 text-xs mt-1">{erros.telefone}</p>}
                        </div>
                      </div>

                      {/* Stepper de quantidade */}
                      <div className="border border-gray-100 rounded-xl p-4">
                        <p className="text-xs font-medium text-gray-500 mb-3">Quantidade de títulos</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <button
                              type="button"
                              onClick={() => setQuantidade(q => Math.max(1, q - 1))}
                              className="w-9 h-9 rounded-full border-2 flex items-center justify-center font-bold text-lg active:scale-90 transition-transform"
                              style={{ borderColor: '#2E7D32', color: '#2E7D32' }}
                            >
                              −
                            </button>
                            <span className="text-2xl font-bold text-gray-900 w-6 text-center">{quantidade}</span>
                            <button
                              type="button"
                              onClick={() => setQuantidade(q => Math.min(10, q + 1))}
                              className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-lg text-white active:scale-90 transition-transform"
                              style={{ background: '#2E7D32' }}
                            >
                              +
                            </button>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-400">Total</p>
                            <p className="text-xl font-bold" style={{ color: '#2E7D32' }}>
                              {formatBRL((edicaoSelecionada?.valor_unitario ?? 10) * quantidade)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Aceite */}
                      <label className={`flex items-start gap-3 cursor-pointer rounded-xl p-3 border transition-colors ${erros.aceite ? 'border-red-400 bg-red-50' : 'border-gray-100 bg-gray-50'}`}>
                        <input
                          type="checkbox" checked={aceite} onChange={e => setAceite(e.target.checked)}
                          className="mt-0.5 w-4 h-4 rounded flex-shrink-0"
                          style={{ accentColor: '#2E7D32' }}
                        />
                        <p className="text-xs text-gray-500 leading-relaxed">
                          Li e estou de acordo com as{' '}
                          <span className="underline font-medium" style={{ color: '#2E7D32' }}>Condições Gerais</span>
                          {' '}do título de capitalização Recife Cap, incluindo as regras de sorteio e resgate.
                        </p>
                      </label>
                      {erros.aceite && <p className="text-red-500 text-xs -mt-2">{erros.aceite}</p>}

                      {erros.geral && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">
                          {erros.geral}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={loadingContinuar || !edicaoSelecionada}
                        className="w-full py-3.5 rounded-full font-bold text-sm disabled:opacity-50 active:opacity-80 transition-opacity flex items-center justify-between px-6"
                        style={{ background: 'linear-gradient(135deg, #2E7D32, #43A047)', color: '#fff' }}
                      >
                        {loadingContinuar ? 'Aguarde...' : 'Continuar para pagamento'}
                        {!loadingContinuar && (
                          <span className="w-6 h-6 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                          </span>
                        )}
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* ── ETAPA 2: PIX ─────────────────────────────────────────────── */}
              {etapa === 2 && pixData && (
                <div className="px-6 pb-6">
                  <div className="flex flex-col lg:flex-row gap-6">

                    {/* QR Code */}
                    <div className="flex flex-col items-center lg:w-1/2">
                      <p className="font-bold text-gray-900 text-base mb-1">Pague com PIX</p>
                      <p className="text-gray-400 text-xs mb-4 text-center">Escaneie o QR Code com o app do seu banco</p>

                      <div className="border-4 rounded-2xl p-2 mb-4" style={{ borderColor: '#2E7D32' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={pixData.qr_base64} alt="QR Code PIX" width={200} height={200} />
                      </div>

                      <div className="text-3xl font-black mb-1" style={{ color: '#2E7D32' }}>
                        {formatBRL(pixData.valor_total)}
                      </div>
                      <p className="text-xs text-gray-400">{pixData.quantidade} título(s)</p>
                    </div>

                    {/* Detalhes e ações */}
                    <div className="lg:w-1/2 flex flex-col gap-4">
                      <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600">
                        <p className="text-gray-400 mb-1">Chave PIX</p>
                        <p className="font-mono break-all select-all">{pixData.chave_pix}</p>
                      </div>

                      <div className={`flex items-center gap-2 text-sm font-semibold ${tempoRestante < 60 ? 'text-red-600' : 'text-gray-600'}`}>
                        <span>⏱</span>
                        <span>{formatTime(tempoRestante)} restantes</span>
                      </div>

                      {tempoRestante === 0 && (
                        <p className="text-red-600 text-xs">
                          Reserva expirada.{' '}
                          <button className="underline font-medium" onClick={() => { setEtapa(1); setPixData(null) }}>
                            Tentar novamente
                          </button>
                        </p>
                      )}

                      <div>
                        <p className="text-xs text-gray-400 mb-2">Títulos reservados</p>
                        <div className="flex flex-wrap gap-1.5">
                          {pixData.titulos_reservados.map(t => (
                            <span key={t} className="text-xs font-mono bg-gray-100 px-2.5 py-1 rounded-full font-semibold text-gray-700">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>

                      {erroPix && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">
                          {erroPix}
                        </div>
                      )}

                      <button
                        onClick={confirmarPagamento}
                        disabled={loadingPagar || tempoRestante === 0}
                        className="w-full py-3.5 rounded-full font-bold text-sm disabled:opacity-50 active:opacity-80 transition-opacity flex items-center justify-center gap-2"
                        style={{ background: '#FFC107', color: '#1B5E20' }}
                      >
                        {loadingPagar ? 'Verificando...' : '✅ Já paguei'}
                      </button>

                      <p className="text-gray-400 text-xs text-center">
                        O pagamento é verificado automaticamente a cada 5 segundos
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ── ETAPA 3: Sucesso ─────────────────────────────────────────── */}
              {etapa === 3 && (
                <div className="px-6 pb-8 flex flex-col items-center text-center">
                  <div className="text-6xl mb-4">🍀</div>
                  <h2 className="text-xl font-black text-gray-900 mb-1">Pagamento confirmado!</h2>
                  <p className="text-gray-500 text-sm mb-6">Boa sorte no sorteio!</p>

                  <div className="w-full max-w-md bg-gray-50 rounded-xl p-4 mb-6">
                    <p className="text-xs text-gray-400 mb-2">Seus títulos</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {titulosConfirmados.map(t => (
                        <span
                          key={t}
                          className="text-sm font-mono border-2 px-4 py-2 rounded-xl font-bold"
                          style={{ borderColor: '#2E7D32', color: '#2E7D32' }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  {edicaoSelecionada && (
                    <p className="text-xs text-gray-500 mb-6">
                      Sorteio: <strong>{dataBR(edicaoSelecionada.data_sorteio)}</strong> às <strong>{edicaoSelecionada.hora_sorteio}</strong>
                    </p>
                  )}

                  <div className="flex flex-col gap-3 w-full max-w-xs">
                    <button
                      onClick={() => router.push(`/cliente/consulta/${cpf.replace(/\D/g, '')}`)}
                      className="w-full py-3.5 rounded-full font-bold text-sm text-white flex items-center justify-between px-6"
                      style={{ background: 'linear-gradient(135deg, #2E7D32, #43A047)' }}
                    >
                      Ver meus títulos
                      <span className="w-6 h-6 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                      </span>
                    </button>

                    <button
                      onClick={compartilharWhatsApp}
                      className="w-full py-3.5 rounded-full font-bold text-sm border-2 flex items-center justify-center gap-2"
                      style={{ borderColor: '#25D366', color: '#25D366' }}
                    >
                      <span>📲</span> Compartilhar no WhatsApp
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* ── Rodapé ──────────────────────────────────────────────────────────── */}
      <footer className="text-center pb-8 px-4">
        <p className="text-gray-300 text-xs">
          Recife Cap · Título de Capitalização nº XXXX/XXXX SUSEP
        </p>
      </footer>
    </div>
  )
}
