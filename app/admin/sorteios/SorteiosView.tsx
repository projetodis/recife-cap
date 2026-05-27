'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Trophy, Calendar, Ticket, ChevronRight, X,
  Play, CheckCircle, Clock, AlertCircle, Loader2, Radio,
} from 'lucide-react'
import type { EdicaoComSorteios, SorteioRow } from './page'

interface Props {
  edicoes: EdicaoComSorteios[]
}

const STATUS_EDICAO: Record<string, { label: string; cls: string }> = {
  ativa:       { label: 'Ativa',       cls: 'border-emerald-300 text-emerald-700 bg-emerald-50' },
  em_sorteio:  { label: 'Em sorteio',  cls: 'border-blue-300 text-blue-700 bg-blue-50' },
  encerrada:   { label: 'Encerrada',   cls: 'border-gray-300 text-gray-500 bg-gray-50' },
}

const ORDINAL = ['', '1º', '2º', '3º', '4º', '5º', '6º', '7º', '8º', '9º', '10º']

function formatarData(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

function formatarMoeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/* ── Animação de contagem regressiva ──────────────────────────── */
function ContadorAnimado({ onFim }: { onFim: () => void }) {
  const [conta, setConta] = useState(3)

  useState(() => {
    const id = setInterval(() => {
      setConta(c => {
        if (c <= 1) { clearInterval(id); onFim(); return 0 }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(id)
  })

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="relative w-24 h-24 mb-6">
        <div className="absolute inset-0 rounded-full border-4 border-violet-200 animate-ping opacity-75" />
        <div className="relative w-24 h-24 rounded-full bg-violet-600 flex items-center justify-center">
          <span className="text-4xl font-bold text-white">{conta}</span>
        </div>
      </div>
      <p className="text-gray-600 font-medium">Sorteando...</p>
      <p className="text-gray-400 text-sm mt-1">Escolhendo a cartela vencedora</p>
    </div>
  )
}

/* ── Modal de Sorteio ─────────────────────────────────────────── */
interface ModalProps {
  edicao: EdicaoComSorteios
  onClose: () => void
  onSorteioRealizado: (sorteioId: string, resultado: ResultadoSorteio) => void
}

interface ResultadoSorteio {
  cartela_codigo: string
  pdv_nome: string | null
  distribuidor_nome: string | null
  dezenas: string[]
}

function ModalSorteio({ edicao, onClose, onSorteioRealizado }: ModalProps) {
  const [sorteandoId, setSorteandoId]     = useState<string | null>(null)
  const [contando, setContando]           = useState(false)
  const [resultado, setResultado]         = useState<ResultadoSorteio | null>(null)
  const [resultadoPara, setResultadoPara] = useState<string | null>(null)
  const [erro, setErro]                   = useState('')

  async function sortear(sorteio: SorteioRow) {
    setSorteandoId(sorteio.id)
    setContando(true)
    setErro('')
    setResultado(null)
  }

  async function executarSorteio() {
    if (!sorteandoId) return
    try {
      const res = await fetch('/api/admin/realizar-sorteio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          edicao_id:  edicao.id,
          sorteio_id: sorteandoId,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setErro(data.error ?? 'Erro ao realizar sorteio'); setSorteandoId(null); return }

      const res2: ResultadoSorteio = {
        cartela_codigo:   data.cartela_codigo,
        pdv_nome:         data.pdv_nome ?? null,
        distribuidor_nome: data.distribuidor_nome ?? null,
        dezenas:          data.dezenas ?? [],
      }
      setResultado(res2)
      setResultadoPara(sorteandoId)
      onSorteioRealizado(sorteandoId, res2)
    } catch {
      setErro('Erro de conexão. Tente novamente.')
      setSorteandoId(null)
    }
  }

  const isPrincipal = (s: SorteioRow) =>
    s.numero_sorteio === Math.max(...edicao.sorteios.map(x => x.numero_sorteio))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        {/* Header do modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900">
              Edição #{edicao.numero} — Sorteios
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">{formatarData(edicao.data_sorteio)} · {edicao.hora_sorteio}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition">
            <X size={16} />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div>
            <p className="text-xs text-gray-400">Cartelas participando</p>
            <p className="text-2xl font-bold text-gray-900">{edicao.cartelas_pagas.toLocaleString('pt-BR')}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Prêmio principal</p>
            <p className="text-2xl font-bold text-emerald-600">{formatarMoeda(edicao.premio_principal)}</p>
          </div>
        </div>

        {/* Animação / resultado */}
        {contando && !resultado && sorteandoId && (
          <div className="px-6 py-2 border-b border-gray-100">
            <ContadorAnimado onFim={executarSorteio} />
          </div>
        )}

        {resultado && resultadoPara && (
          <div className="px-6 py-5 border-b border-gray-100 bg-emerald-50">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0">
                <Trophy size={20} className="text-white" />
              </div>
              <div>
                <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Cartela vencedora</p>
                <p className="text-2xl font-bold text-gray-900 font-mono">{resultado.cartela_codigo}</p>
              </div>
            </div>
            {resultado.pdv_nome && (
              <p className="text-sm text-gray-600">
                <span className="text-gray-400">PDV:</span> {resultado.pdv_nome}
              </p>
            )}
            {resultado.distribuidor_nome && (
              <p className="text-sm text-gray-600">
                <span className="text-gray-400">Distribuidor:</span> {resultado.distribuidor_nome}
              </p>
            )}
            {resultado.dezenas.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {resultado.dezenas.map(d => (
                  <span key={d} className="w-8 h-8 flex items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-bold">
                    {d}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {erro && (
          <div className="mx-6 mt-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
            <AlertCircle size={15} />
            {erro}
          </div>
        )}

        {/* Lista de sorteios */}
        <div className="px-6 py-4 space-y-3">
          {edicao.sorteios.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">
              Nenhum sorteio configurado para esta edição.
            </p>
          ) : (
            edicao.sorteios.map(s => {
              const realizado   = s.status === 'realizado'
              const esteContando = sorteandoId === s.id && contando
              const esteResultado = resultadoPara === s.id ? resultado : null
              const principal   = isPrincipal(s)

              return (
                <div
                  key={s.id}
                  className={`rounded-xl border p-4 ${
                    realizado ? 'border-emerald-200 bg-emerald-50'
                    : principal ? 'border-violet-200 bg-violet-50'
                    : 'border-gray-100 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-800">
                          {ORDINAL[s.numero_sorteio] ?? `${s.numero_sorteio}º`} sorteio
                          {principal && <span className="ml-1 text-violet-600">(Principal)</span>}
                        </span>
                        {realizado && <CheckCircle size={14} className="text-emerald-500 flex-shrink-0" />}
                        {!realizado && <Clock size={14} className="text-gray-400 flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{formatarMoeda(s.valor_premio)}</p>
                      {realizado && (s.cartela_codigo ?? esteResultado?.cartela_codigo) && (
                        <p className="text-xs font-mono font-medium text-emerald-700 mt-1">
                          Vencedora: {s.cartela_codigo ?? esteResultado?.cartela_codigo}
                        </p>
                      )}
                    </div>

                    {!realizado && !esteContando && (
                      <button
                        onClick={() => sortear(s)}
                        disabled={!!sorteandoId}
                        className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white rounded-lg transition"
                      >
                        <Play size={13} />
                        Sortear
                      </button>
                    )}

                    {esteContando && (
                      <Loader2 size={20} className="text-violet-500 animate-spin flex-shrink-0" />
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="px-6 pb-5">
          <button
            onClick={onClose}
            className="w-full py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── View principal ───────────────────────────────────────────── */
export default function SorteiosView({ edicoes }: Props) {
  const [modalEdicao, setModalEdicao]   = useState<EdicaoComSorteios | null>(null)
  const [edicaoState, setEdicaoState]   = useState<EdicaoComSorteios[]>(edicoes)

  function abrirModal(e: EdicaoComSorteios) { setModalEdicao(e) }
  function fecharModal() { setModalEdicao(null) }

  function handleSorteioRealizado(edicaoId: string, sorteioId: string, res: ResultadoSorteio) {
    setEdicaoState(prev => prev.map(e => {
      if (e.id !== edicaoId) return e
      const sorteios = e.sorteios.map(s =>
        s.id === sorteioId
          ? { ...s, status: 'realizado', cartela_codigo: res.cartela_codigo, dezenas_sorteadas: res.dezenas }
          : s
      )
      const todasRealizadas = sorteios.every(s => s.status === 'realizado')
      return { ...e, sorteios, status: todasRealizadas ? 'encerrada' : 'em_sorteio' }
    }))
    // Atualiza o modal também
    setModalEdicao(prev => {
      if (!prev || prev.id !== edicaoId) return prev
      const sorteios = prev.sorteios.map(s =>
        s.id === sorteioId
          ? { ...s, status: 'realizado', cartela_codigo: res.cartela_codigo, dezenas_sorteadas: res.dezenas }
          : s
      )
      const todasRealizadas = sorteios.every(s => s.status === 'realizado')
      return { ...prev, sorteios, status: todasRealizadas ? 'encerrada' : 'em_sorteio' }
    })
  }

  function podeRealizar(e: EdicaoComSorteios) {
    if (e.status === 'encerrada') return false
    const dataHora = new Date(`${e.data_sorteio}T${e.hora_sorteio}`)
    return new Date() >= dataHora
  }

  return (
    <div>
      {/* HEADER */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center flex-shrink-0">
          <Trophy size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl lg:text-2xl font-semibold text-gray-900">Sorteios</h1>
          <p className="text-sm text-gray-500 mt-0.5">{edicaoState.length} edição{edicaoState.length !== 1 ? 'ões' : ''} encontrada{edicaoState.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* LISTA */}
      {edicaoState.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-16 text-center">
          <Trophy size={40} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium mb-1">Nenhuma edição ativa</p>
          <p className="text-gray-400 text-sm">Ative uma edição para que ela apareça aqui.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {edicaoState.map(e => {
            const cfg      = STATUS_EDICAO[e.status] ?? STATUS_EDICAO.encerrada
            const pode     = podeRealizar(e)
            const realizados = e.sorteios.filter(s => s.status === 'realizado').length
            const total    = e.sorteios.length

            return (
              <div key={e.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 transition">
                <div className="flex flex-wrap items-start justify-between gap-4">

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5 mb-1">
                      <h2 className="text-base font-semibold text-gray-900">
                        Edição #{e.numero}
                      </h2>
                      <span className={`text-xs font-medium px-2.5 py-0.5 border rounded-full ${cfg.cls}`}>
                        {cfg.label}
                      </span>
                    </div>
                    {e.descricao && (
                      <p className="text-sm text-gray-500 mb-2">{e.descricao}</p>
                    )}
                    <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-500">
                      <span className="flex items-center gap-1.5">
                        <Calendar size={13} className="text-gray-400" />
                        {formatarData(e.data_sorteio)} às {e.hora_sorteio}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Ticket size={13} className="text-gray-400" />
                        {e.cartelas_pagas.toLocaleString('pt-BR')} participando
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Trophy size={13} className="text-gray-400" />
                        {formatarMoeda(e.premio_principal)}
                      </span>
                    </div>

                    {total > 0 && (
                      <div className="mt-3 flex items-center gap-2">
                        <div className="flex-1 max-w-[160px] h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all"
                            style={{ width: `${total > 0 ? (realizados / total) * 100 : 0}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400">
                          {realizados}/{total} sorteio{total !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Botões */}
                  <div className="flex-shrink-0 flex flex-col gap-2">
                    {e.status === 'encerrada' ? (
                      <button
                        onClick={() => abrirModal(e)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg transition"
                      >
                        Ver resultados
                        <ChevronRight size={15} />
                      </button>
                    ) : e.status === 'em_sorteio' ? (
                      <Link
                        href={`/admin/sorteios/${e.id}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
                      >
                        <Radio size={14} />
                        Continuar ao vivo
                      </Link>
                    ) : pode ? (
                      <Link
                        href={`/admin/sorteios/${e.id}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition"
                      >
                        <Play size={14} />
                        Iniciar Sorteio
                      </Link>
                    ) : (
                      <div className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg">
                        <Clock size={14} />
                        Aguardando data
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* MODAL */}
      {modalEdicao && (
        <ModalSorteio
          edicao={modalEdicao}
          onClose={fecharModal}
          onSorteioRealizado={(sorteioId, res) =>
            handleSorteioRealizado(modalEdicao.id, sorteioId, res)
          }
        />
      )}
    </div>
  )
}
