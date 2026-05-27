'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Trophy, AlertTriangle } from 'lucide-react'
import type { GanhadorDetectado, ProximidadeItem } from '@/lib/sorteio-engine'

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface SorteioRow {
  id: string
  numero_sorteio: number
  dezenas_sorteadas: number[]
  status: string
  valor_premio: number
  cartela_vencedora: string | null
  cartela_codigo: string | null
}

interface EdicaoInfo {
  id: string
  numero: number
  data_sorteio: string
  hora_sorteio: string
  status: string
  premio_principal: number
}

function brl(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// ── Componente principal ───────────────────────────────────────────────────────
export default function PainelSorteioLive() {
  const { id: edicaoId } = useParams<{ id: string }>()
  const router           = useRouter()
  const supabase         = useRef(createClient()).current
  const inputRef         = useRef<HTMLInputElement>(null)

  const [edicao, setEdicao]       = useState<EdicaoInfo | null>(null)
  const [sorteios, setSorteios]   = useState<SorteioRow[]>([])
  const [loading, setLoading]     = useState(true)
  const [erro, setErro]           = useState('')

  const [dezenaInput, setDezenaInput] = useState('')
  const [salvando, setSalvando]       = useState(false)
  const [flashDezena, setFlashDezena] = useState<number | null>(null)

  const [ganhadores, setGanhadores]     = useState<GanhadorDetectado[]>([])
  const [ranking, setRanking]           = useState<ProximidadeItem[]>([])
  const [novoGanhador, setNovoGanhador] = useState<GanhadorDetectado | null>(null)

  const [ultimas, setUltimas]               = useState<number[]>([])
  const [sorteioIniciadoId, setSorteioIniciadoId] = useState<string | null>(null)
  // Rastreia quais cartelas já dispararam o modal, para não repetir
  const ganhadorNotificadosRef = useRef<Set<string>>(new Set())

  const sorteioAtivo   = sorteios.find(s => s.status !== 'realizado') ?? sorteios[sorteios.length - 1]
  const todosCompletos = sorteios.length > 0 && sorteios.every(s => s.status === 'realizado')
  const aoVivo         = edicao?.status === 'em_sorteio'
  // Input ativo apenas quando admin clicou "Iniciar Xº Sorteio" para o sorteio atual
  const sorteioAtualAtivoParaInput = !!sorteioAtivo && sorteioAtivo.id === sorteioIniciadoId
  const podeEncerrar = aoVivo && !!sorteioAtivo && sorteioAtivo.status !== 'realizado'

  // ── Busca inicial ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function carregar() {
      setLoading(true)
      const sb = createClient()

      let resolvedEdicaoId = edicaoId
      const { data: sorteioDir } = await sb
        .from('sorteios').select('edicao_id').eq('id', edicaoId).maybeSingle()
      if (sorteioDir?.edicao_id) resolvedEdicaoId = sorteioDir.edicao_id

      const { data: ed } = await sb
        .from('edicoes')
        .select('id, numero, data_sorteio, hora_sorteio, status, premio_principal')
        .eq('id', resolvedEdicaoId)
        .single()
      if (!ed) { setErro('Edição não encontrada'); setLoading(false); return }
      setEdicao(ed)

      let { data: sRows } = await sb
        .from('sorteios')
        .select('id, numero_sorteio, dezenas_sorteadas, status, valor_premio, cartela_vencedora')
        .eq('edicao_id', resolvedEdicaoId)
        .order('numero_sorteio', { ascending: true })

      if (!sRows?.length) {
        const { data: novo } = await sb
          .from('sorteios')
          .insert({ edicao_id: resolvedEdicaoId, status: 'aguardando', numero_sorteio: 1, valor_premio: 0 })
          .select('id, numero_sorteio, dezenas_sorteadas, status, valor_premio, cartela_vencedora')
          .single()
        sRows = novo ? [novo] : []
      }

      const vencedoraIds = (sRows ?? []).map((s: any) => s.cartela_vencedora).filter(Boolean)
      const codigosMap: Record<string, string> = {}
      if (vencedoraIds.length > 0) {
        const { data: cartelas } = await sb
          .from('cartelas').select('id, codigo, dv').in('id', vencedoraIds)
        for (const c of cartelas ?? []) codigosMap[c.id] = `${c.codigo}-${c.dv}`
      }

      const rows: SorteioRow[] = (sRows ?? []).map((s: any) => ({
        id:                s.id,
        numero_sorteio:    s.numero_sorteio,
        dezenas_sorteadas: (s.dezenas_sorteadas ?? []).map(Number),
        status:            s.status ?? 'aguardando',
        valor_premio:      parseFloat(s.valor_premio ?? 0),
        cartela_vencedora: s.cartela_vencedora ?? null,
        cartela_codigo:    s.cartela_vencedora ? (codigosMap[s.cartela_vencedora] ?? null) : null,
      }))

      setSorteios(rows)
      const ativo = rows.find(s => s.status !== 'realizado') ?? rows[rows.length - 1]
      if (ativo) setUltimas(ativo.dezenas_sorteadas.slice(-5).reverse())

      // Retoma input se o sorteio já estava em andamento (page refresh)
      if (ed.status === 'em_sorteio' && ativo && ativo.dezenas_sorteadas.length > 0) {
        setSorteioIniciadoId(ativo.id)
      }

      setLoading(false)
    }
    carregar()
  }, [edicaoId])

  // ── Realtime ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!edicaoId) return
    const channel = supabase
      .channel(`painel-sorteio-${edicaoId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sorteios', filter: `edicao_id=eq.${edicaoId}` },
        (payload) => {
          setSorteios(prev => prev.map(s => {
            if (s.id !== payload.new.id) return s
            const dezenas = ((payload.new.dezenas_sorteadas ?? []) as unknown[]).map(Number)
            setUltimas(dezenas.slice(-5).reverse())
            return {
              ...s,
              dezenas_sorteadas: dezenas,
              status:            payload.new.status ?? s.status,
              cartela_vencedora: payload.new.cartela_vencedora ?? null,
            }
          }))
        },
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [edicaoId, supabase])

  // ── Iniciar sorteio ───────────────────────────────────────────────────────
  async function iniciarSorteioAtual() {
    if (!sorteioAtivo) return
    await fetch(`/api/sorteios/${sorteioAtivo.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao: 'iniciar' }),
    })
    setSorteioIniciadoId(sorteioAtivo.id)
    ganhadorNotificadosRef.current = new Set()
    setEdicao(prev => prev ? { ...prev, status: 'em_sorteio' } : prev)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  // ── Confirmar dezena ──────────────────────────────────────────────────────
  const confirmarDezena = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault()
    const num = parseInt(dezenaInput, 10)
    if (!num || num < 1 || num > 60) { setErro('Número entre 1 e 60'); return }
    if (!sorteioAtivo || sorteioAtivo.status === 'realizado') return

    setSalvando(true)
    setErro('')
    try {
      const res  = await fetch(`/api/sorteios/${sorteioAtivo.id}/dezena`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ dezena: num }),
      })
      const data = await res.json()
      if (!res.ok) { setErro(data.erro ?? 'Erro ao confirmar'); return }

      try { new Audio('/sounds/dezena.mp3').play().catch(() => {}) } catch {}

      setFlashDezena(num)
      setTimeout(() => setFlashDezena(null), 1000)

      setSorteios(prev => prev.map(s =>
        s.id === sorteioAtivo.id ? { ...s, dezenas_sorteadas: data.dezenas_sorteadas } : s
      ))
      setUltimas((data.dezenas_sorteadas as number[]).slice(-5).reverse())

      if (data.ganhadores?.length > 0) {
        // Só dispara modal para ganhadores novos (ainda não notificados)
        const novos = (data.ganhadores as GanhadorDetectado[]).filter(
          g => !ganhadorNotificadosRef.current.has(g.cartela_id)
        )
        setGanhadores(data.ganhadores)
        if (novos.length > 0) {
          setNovoGanhador(novos[0])
          novos.forEach((g: GanhadorDetectado) => ganhadorNotificadosRef.current.add(g.cartela_id))
        }
      }
      if (data.ranking) setRanking(data.ranking)
      setDezenaInput('')
      inputRef.current?.focus()
    } finally {
      setSalvando(false)
    }
  }, [dezenaInput, sorteioAtivo])

  // ── Desfazer última ───────────────────────────────────────────────────────
  async function desfazerUltima() {
    if (!sorteioAtivo) return
    const res  = await fetch(`/api/sorteios/${sorteioAtivo.id}/dezena`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) { setErro(data.erro ?? 'Erro ao desfazer'); return }
    setSorteios(prev => prev.map(s =>
      s.id === sorteioAtivo.id ? { ...s, dezenas_sorteadas: data.dezenas_sorteadas } : s
    ))
    setUltimas((data.dezenas_sorteadas as number[]).slice(-5).reverse())
    setGanhadores([])
    setNovoGanhador(null)
    ganhadorNotificadosRef.current = new Set()
    inputRef.current?.focus()
  }

  // ── Encerrar sorteio ──────────────────────────────────────────────────────
  async function encerrarSorteio() {
    if (!sorteioAtivo) return
    const res  = await fetch(`/api/sorteios/${sorteioAtivo.id}/status`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ acao: 'encerrar' }),
    })
    const data = await res.json()
    if (!res.ok) { setErro(data.erro ?? 'Erro ao encerrar'); return }
    setSorteios(prev => prev.map(s =>
      s.id === sorteioAtivo.id ? { ...s, status: 'realizado' } : s
    ))
    if (data.edicao_encerrada) {
      setEdicao(prev => prev ? { ...prev, status: 'encerrada' } : prev)
    }
    setGanhadores([])
    setNovoGanhador(null)
    setSorteioIniciadoId(null)
    ganhadorNotificadosRef.current = new Set()
  }

  function fecharModalGanhador() {
    setNovoGanhador(null)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  // ── Enter key handler ─────────────────────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Enter' && document.activeElement === inputRef.current) confirmarDezena()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [confirmarDezena])

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#2E7D32', borderTopColor: 'transparent' }} />
    </div>
  )

  if (erro && !edicao) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 gap-4">
      <AlertTriangle size={40} className="text-red-400" />
      <p className="text-gray-600">{erro}</p>
      <button onClick={() => router.back()} className="text-sm underline" style={{ color: '#2E7D32' }}>Voltar</button>
    </div>
  )

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f8faf8' }}>

      {/* ── Modal: novo ganhador — clique fora fecha sem parar o sorteio ── */}
      {novoGanhador && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={fecharModalGanhador}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center border-2"
            style={{ borderColor: '#FFC107' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce" style={{ background: '#FFC107' }}>
              <Trophy size={32} style={{ color: '#1B5E20' }} />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-1">GANHADOR!</h2>
            <p className="text-3xl font-black font-mono mb-3" style={{ color: '#2E7D32' }}>{novoGanhador.numero}</p>
            <p className="text-gray-700 font-semibold mb-1">{novoGanhador.nome_comprador}</p>
            <p className="text-gray-400 text-sm mb-1">{novoGanhador.cpf_mascarado}</p>
            <p className="font-bold text-lg mb-4" style={{ color: '#2E7D32' }}>{brl(novoGanhador.valor_premio)}</p>
            <p className="text-gray-400 text-xs mb-5">O sorteio continua — confirme para voltar ao painel</p>
            <button
              onClick={fecharModalGanhador}
              className="w-full py-3 font-bold rounded-xl text-white transition-colors"
              style={{ background: 'linear-gradient(135deg, #2E7D32, #43A047)' }}
            >
              Confirmar e continuar ↵
            </button>
          </div>
        </div>
      )}

      {/* ── Header sticky ────────────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-40 flex items-center justify-between px-6 py-3 flex-shrink-0"
        style={{
          background: 'rgba(248,250,248,0.95)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="text-gray-400 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Recife Cap" className="w-8 h-8 object-contain" />
          <div>
            <h1 className="text-gray-900 font-bold text-base leading-tight">
              Sorteio ao Vivo — Edição #{edicao?.numero}
            </h1>
            <p className="text-gray-400 text-xs">Recife Cap · Filantropia Premiável</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Últimas bolinhas */}
          {ultimas.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Últimas:</span>
              {ultimas.slice(0, 5).map((n, i) => (
                <div
                  key={i}
                  className="w-9 h-9 rounded-full flex items-center justify-center font-black text-sm shadow-sm transition-all"
                  style={
                    i === 0
                      ? { background: '#FFC107', color: '#1B5E20', boxShadow: '0 0 12px rgba(255,193,7,0.5)' }
                      : { background: '#e8f5e9', color: '#2E7D32', border: '1px solid #c8e6c9' }
                  }
                >
                  {String(n).padStart(2, '0')}
                </div>
              ))}
            </div>
          )}

          {/* Badge status */}
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold border"
            style={
              aoVivo
                ? { background: '#dcfce7', color: '#166534', borderColor: '#86efac' }
                : { background: '#fef9c3', color: '#854d0e', borderColor: '#fde047' }
            }
          >
            <div
              className={`w-2 h-2 rounded-full ${aoVivo ? 'animate-pulse' : ''}`}
              style={{ background: aoVivo ? '#16a34a' : '#ca8a04' }}
            />
            {aoVivo ? 'AO VIVO' : 'AGUARDANDO'}
          </div>
        </div>
      </div>

      {/* ── 3 colunas ───────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ═══ COL ESQUERDA — Controle (280px) ═══ */}
        <div
          className="w-[280px] flex-shrink-0 overflow-y-auto p-4 space-y-4"
          style={{ borderRight: '1px solid #e5e7eb' }}
        >

          {/* Input placar */}
          <div
            className="rounded-2xl p-6 text-center"
            style={{
              background: 'linear-gradient(135deg, rgba(46,125,50,0.08), rgba(27,94,32,0.04))',
              border: '1px solid rgba(46,125,50,0.2)',
            }}
          >
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#2E7D32' }}>
              {sorteioAtualAtivoParaInput
                ? `${sorteioAtivo?.numero_sorteio}º Sorteio — Próxima Bolinha`
                : 'Próxima Ação'}
            </p>

            {!sorteioAtualAtivoParaInput ? (
              <button
                onClick={iniciarSorteioAtual}
                disabled={!sorteioAtivo || todosCompletos}
                className="w-full py-4 rounded-xl font-bold text-white text-sm transition-all disabled:opacity-40"
                style={{
                  background: 'linear-gradient(135deg, #2E7D32, #43A047)',
                  boxShadow: '0 4px 20px rgba(46,125,50,0.3)',
                }}
              >
                {todosCompletos
                  ? '✓ Edição encerrada'
                  : `▶ Iniciar ${sorteioAtivo?.numero_sorteio ?? ''}º Sorteio`}
              </button>
            ) : (
              <>
                <input
                  ref={inputRef}
                  type="number"
                  min={1}
                  max={60}
                  value={dezenaInput}
                  onChange={e => { setDezenaInput(e.target.value); setErro('') }}
                  onKeyDown={e => e.key === 'Enter' && confirmarDezena()}
                  className="w-full text-center text-7xl font-black bg-transparent border-none outline-none transition-all"
                  style={{ color: '#2E7D32', caretColor: '#2E7D32' }}
                  placeholder="00"
                  autoFocus
                />
                <p className="text-gray-400 text-xs mt-1">Digite e pressione Enter</p>
                {erro && <p className="text-red-500 text-xs mt-2">{erro}</p>}
              </>
            )}
          </div>

          {/* Botões de ação — visíveis apenas com sorteio ativo */}
          {sorteioAtualAtivoParaInput && (
            <div className="space-y-2">
              <button
                onClick={() => confirmarDezena()}
                disabled={salvando || !dezenaInput}
                className="w-full py-4 rounded-2xl font-black text-white text-lg tracking-wide transition-all active:scale-95 disabled:opacity-40"
                style={{
                  background: 'linear-gradient(135deg, #2E7D32, #43A047)',
                  boxShadow: '0 4px 20px rgba(46,125,50,0.4)',
                }}
              >
                {salvando ? 'Confirmando...' : 'Confirmar ↵'}
              </button>

              <button
                onClick={desfazerUltima}
                disabled={!sorteioAtivo || sorteioAtivo.dezenas_sorteadas.length === 0}
                className="w-full py-2.5 rounded-xl font-medium text-sm text-gray-500 bg-white border border-gray-200 hover:border-gray-300 hover:text-gray-700 transition-colors disabled:opacity-30"
              >
                ↩ Desfazer última
              </button>

              {/* Encerrar sempre visível — admin decide quando parar */}
              {podeEncerrar && (
                <button
                  onClick={encerrarSorteio}
                  className="w-full py-2.5 rounded-xl font-bold text-white text-sm bg-red-600 hover:bg-red-700 transition-colors"
                >
                  Encerrar {sorteioAtivo?.numero_sorteio}º Sorteio
                </button>
              )}
            </div>
          )}

          {/* Status dos sorteios */}
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 px-1">Sorteios</p>
            {[1, 2, 3, 4].map(n => {
              const s          = sorteios.find(s => s.numero_sorteio === n)
              const count      = s?.dezenas_sorteadas.length ?? 0
              const isRealizado = s?.status === 'realizado'
              const isAtivo    = sorteioAtivo?.numero_sorteio === n

              return (
                <div
                  key={n}
                  className="flex items-center justify-between px-4 py-3 rounded-xl transition-colors"
                  style={
                    isAtivo
                      ? { background: 'rgba(46,125,50,0.08)', border: '1px solid rgba(46,125,50,0.3)' }
                      : { background: '#f9fafb', border: '1px solid #e5e7eb' }
                  }
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${isAtivo && !isRealizado ? 'animate-pulse' : ''}`}
                      style={{
                        background: isRealizado ? '#FFC107' : isAtivo ? '#2E7D32' : '#d1d5db',
                      }}
                    />
                    <span className="text-gray-800 text-sm font-medium">{n}º Sorteio</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isRealizado && (
                      <span className="text-xs font-bold" style={{ color: '#FFC107' }}>✓</span>
                    )}
                    <span className="text-gray-400 text-xs font-mono">{count} dez.</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Todos concluídos */}
          {todosCompletos && (
            <div className="rounded-2xl p-4 text-center bg-white border border-green-200">
              <p className="text-2xl mb-1">🏆</p>
              <p className="font-bold text-sm text-gray-800">Edição encerrada!</p>
              <p className="text-xs text-gray-400 mt-0.5">Todos os sorteios concluídos</p>
            </div>
          )}
        </div>

        {/* ═══ COL CENTRAL — Grade 2×2 ═══ */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(n => {
              const s          = sorteios.find(s => s.numero_sorteio === n)
              const dezenasS   = s?.dezenas_sorteadas ?? []
              const setD       = new Set(dezenasS)
              const isRealizado = s?.status === 'realizado'
              const isAtivo    = sorteioAtivo?.numero_sorteio === n

              return (
                <div
                  key={n}
                  className="rounded-2xl overflow-hidden bg-white"
                  style={{
                    border: isRealizado
                      ? '1px solid rgba(255,193,7,0.5)'
                      : isAtivo
                      ? '1px solid rgba(46,125,50,0.4)'
                      : '1px solid #e5e7eb',
                    boxShadow: isAtivo && !isRealizado
                      ? '0 0 0 2px rgba(46,125,50,0.1)'
                      : 'none',
                  }}
                >
                  {/* Header do card */}
                  <div
                    className="flex items-center justify-between px-4 py-2.5"
                    style={{ borderBottom: '1px solid #f3f4f6' }}
                  >
                    <div className="flex items-center gap-2">
                      {isAtivo && !isRealizado && (
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
                      )}
                      <span className="text-gray-800 text-xs font-bold">{n}º SORTEIO</span>
                      {s?.valor_premio ? (
                        <span className="text-gray-400 text-xs">— {brl(s.valor_premio)}</span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      {isRealizado && (
                        <span
                          className="text-xs font-black px-2 py-0.5 rounded-full"
                          style={{ background: '#FFC107', color: '#1B5E20' }}
                        >
                          ✓ ENCERRADO
                        </span>
                      )}
                      {s?.cartela_codigo && (
                        <span className="text-xs font-mono font-bold" style={{ color: '#2E7D32' }}>
                          #{s.cartela_codigo}
                        </span>
                      )}
                      <span className="text-gray-400 text-xs font-mono">{dezenasS.length} dezenas</span>
                    </div>
                  </div>

                  {/* Bolinhas 1-60 */}
                  <div className="p-3 grid grid-cols-10 gap-1">
                    {Array.from({ length: 60 }, (_, i) => i + 1).map(num => {
                      const sorteado = setD.has(num)
                      const isFlash  = flashDezena === num && isAtivo

                      return (
                        <div
                          key={num}
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300 ${sorteado ? 'scale-110' : ''}`}
                          style={{
                            background: isFlash
                              ? '#fff'
                              : sorteado
                              ? 'linear-gradient(135deg, #FFC107, #FF8F00)'
                              : '#f3f4f6',
                            color: sorteado ? '#1B5E20' : '#9ca3af',
                            boxShadow: isFlash
                              ? '0 0 16px rgba(255,193,7,0.9)'
                              : sorteado
                              ? '0 0 6px rgba(255,193,7,0.4)'
                              : 'none',
                          }}
                        >
                          {String(num).padStart(2, '0')}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ═══ COL DIREITA — Ranking (260px) ═══ */}
        <div
          className="w-[260px] flex-shrink-0 overflow-y-auto p-4 space-y-4"
          style={{ borderLeft: '1px solid #e5e7eb' }}
        >

          {/* Ranking */}
          <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Mais Próximas de Ganhar
              </p>
            </div>
            {ranking.length === 0 ? (
              <div className="p-6 text-center text-gray-300">
                <p className="text-2xl mb-1">🍀</p>
                <p className="text-xs text-gray-400">
                  {sorteioAtivo?.dezenas_sorteadas.length === 0
                    ? 'Aguardando início'
                    : 'Calculando...'}
                </p>
              </div>
            ) : (
              <div className="py-1">
                {ranking.slice(0, 10).map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-xl mx-1 transition-colors hover:bg-gray-50"
                  >
                    <span
                      className="w-6 text-center text-xs font-black flex-shrink-0"
                      style={{ color: i === 0 ? '#FFC107' : '#9ca3af' }}
                    >
                      #{i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-800 text-sm font-semibold truncate font-mono">
                        {item.cartela_numero}
                      </p>
                      <p className="text-gray-400 text-xs truncate">
                        {item.nome_comprador || 'Anônimo'}
                      </p>
                    </div>
                    <div
                      className="px-2 py-0.5 rounded-full text-xs font-black flex-shrink-0"
                      style={
                        item.faltando === 0
                          ? { background: '#FFC107', color: '#1B5E20' }
                          : item.faltando <= 2
                          ? { background: '#fee2e2', color: '#dc2626' }
                          : item.faltando <= 5
                          ? { background: '#ffedd5', color: '#ea580c' }
                          : { background: '#f0fdf4', color: '#16a34a' }
                      }
                    >
                      {item.faltando === 0 ? '🏆' : `-${item.faltando}`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ganhadores do sorteio atual */}
          {ganhadores.length > 0 && (
            <div className="bg-white rounded-2xl overflow-hidden border-2 shadow-sm" style={{ borderColor: '#FFC107' }}>
              <div className="px-4 py-3 border-b" style={{ background: 'rgba(255,193,7,0.08)', borderColor: '#fde68a' }}>
                <p className="text-xs font-black uppercase tracking-wider" style={{ color: '#92400e' }}>
                  🏆 Ganhadores!
                </p>
              </div>
              {ganhadores.map((g, i) => (
                <div key={i} className="px-4 py-3 border-b border-gray-50 last:border-0">
                  <p className="font-black font-mono text-lg" style={{ color: '#2E7D32' }}>{g.numero}</p>
                  <p className="text-gray-800 text-sm font-medium">{g.nome_comprador}</p>
                  <p className="text-gray-400 text-xs mt-0.5">
                    {g.sorteio_numero}º Sorteio · {brl(g.valor_premio)}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Cartelas vencedoras de sorteios já encerrados */}
          {sorteios.some(s => s.status === 'realizado' && s.cartela_codigo) && (
            <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Cartelas Vencedoras
                </p>
              </div>
              {sorteios.filter(s => s.status === 'realizado').map(s => (
                <div key={s.id} className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0">
                  <span className="text-xs text-gray-400">{s.numero_sorteio}º Sorteio</span>
                  <span className="font-mono font-bold text-sm" style={{ color: '#2E7D32' }}>
                    {s.cartela_codigo ?? '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
