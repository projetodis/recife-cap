'use client'

import { useState } from 'react'
import { ShoppingBag, Package, Clock, TrendingUp, Wallet, ArrowRight, X, CheckCircle } from 'lucide-react'

interface PDV {
  id: string
  nome: string
  responsavel_nome: string
  comissao_pct: number
  chave_pix: string
}

interface Cards {
  totalHoje: number
  confirmadosHoje: number
  aguardandoHoje: number
  estoqueCount: number
  vendidasCount: number
  comissaoTotal: number
  saldoDisponivel: number
}

interface Venda {
  id: string
  valor: number
  status_pagamento: string
  forma_pagamento: string
  created_at: string
  cartelas: { codigo: string } | null
}

interface Saque {
  id: string
  valor: number
  chave_pix: string
  status: string
  created_at: string
}

interface Props {
  pdv: PDV
  cards: Cards
  ultimasVendas: Venda[]
  saques: Saque[]
  saquesPendentes: number
}

const statusColor: Record<string, string> = {
  confirmado:             'bg-emerald-50 text-emerald-700',
  aguardando_confirmacao: 'bg-amber-50 text-amber-700',
  expirado:               'bg-red-50 text-red-700',
  cancelado:              'bg-gray-100 text-gray-500',
  pendente:               'bg-gray-100 text-gray-500',
}
const statusLabel: Record<string, string> = {
  confirmado:             'Confirmado',
  aguardando_confirmacao: 'Aguardando',
  expirado:               'Expirado',
  cancelado:              'Cancelado',
  pendente:               'Pendente',
}
const saqueStatusColor: Record<string, string> = {
  pendente:  'bg-amber-50 text-amber-700',
  aprovado:  'bg-emerald-50 text-emerald-700',
  rejeitado: 'bg-red-50 text-red-700',
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function DashboardView({ pdv, cards, ultimasVendas, saques, saquesPendentes }: Props) {
  const [modalAberto, setModalAberto] = useState(false)
  const [valor, setValor] = useState('')
  const [chavePix, setChavePix] = useState(pdv.chave_pix)
  const [enviando, setEnviando] = useState(false)
  const [msgSaque, setMsgSaque] = useState('')

  async function solicitarSaque() {
    const v = parseFloat(valor.replace(',', '.'))
    if (!v || v <= 0) return setMsgSaque('Informe um valor válido')
    if (v > cards.saldoDisponivel) return setMsgSaque('Valor maior que o saldo disponível')
    if (!chavePix.trim()) return setMsgSaque('Informe a chave PIX')

    setEnviando(true)
    setMsgSaque('')
    try {
      const res = await fetch('/api/pdv/saque', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdv_id: pdv.id, valor: v, chave_pix: chavePix.trim() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erro')
      setMsgSaque('Solicitação enviada com sucesso!')
      setValor('')
      setTimeout(() => { setModalAberto(false); setMsgSaque('') }, 1500)
    } catch (e: any) {
      setMsgSaque(e.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{pdv.nome}</h1>
          <p className="text-sm text-gray-500 mt-1">Responsável: {pdv.responsavel_nome}</p>
        </div>
        <a
          href="/pdv/venda"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition shrink-0"
        >
          <ShoppingBag size={16} />
          Registrar venda
        </a>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 mb-2 flex items-center gap-1.5"><TrendingUp size={13} className="text-emerald-600" />Vendas hoje</p>
          <p className="text-2xl font-semibold text-gray-900">{cards.confirmadosHoje}</p>
          <p className="text-xs text-gray-400 mt-1">{fmt(cards.totalHoje)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 mb-2 flex items-center gap-1.5"><Package size={13} className="text-emerald-600" />Em estoque</p>
          <p className="text-2xl font-semibold text-gray-900">{cards.estoqueCount}</p>
          <p className="text-xs text-gray-400 mt-1">{cards.vendidasCount} vendidas no total</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 mb-2 flex items-center gap-1.5"><Clock size={13} className="text-amber-500" />Aguardando PIX</p>
          <p className="text-2xl font-semibold text-gray-900">{cards.aguardandoHoje}</p>
          <p className="text-xs text-gray-400 mt-1">pagamentos pendentes</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 mb-2 flex items-center gap-1.5"><Wallet size={13} className="text-emerald-600" />Saldo comissão</p>
          <p className="text-2xl font-semibold text-gray-900">{fmt(cards.saldoDisponivel)}</p>
          <p className="text-xs text-gray-400 mt-1">{pdv.comissao_pct}% sobre {fmt(cards.comissaoTotal)}</p>
        </div>
      </div>

      {/* Corpo principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Ação de saque */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-1">Solicitar saque</p>
            <p className="text-xs text-gray-400">Saldo disponível: {fmt(cards.saldoDisponivel)}</p>
            {saquesPendentes > 0 && (
              <p className="text-xs text-amber-600 mt-1">{saquesPendentes} solicitação(ões) pendente(s)</p>
            )}
          </div>
          <button
            onClick={() => setModalAberto(true)}
            disabled={cards.saldoDisponivel <= 0}
            className="flex items-center justify-between w-full px-4 py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition disabled:opacity-40"
          >
            <span>Solicitar saque</span>
            <ArrowRight size={16} />
          </button>
        </div>

        {/* Últimas vendas */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-medium text-gray-900">Últimas vendas</h2>
          </div>
          {ultimasVendas.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs text-gray-400 font-medium px-6 py-3">Cartela</th>
                  <th className="text-left text-xs text-gray-400 font-medium px-6 py-3">Valor</th>
                  <th className="text-left text-xs text-gray-400 font-medium px-6 py-3">Pagamento</th>
                  <th className="text-left text-xs text-gray-400 font-medium px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {ultimasVendas.map((v) => (
                  <tr key={v.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-6 py-3 font-medium text-gray-900">{v.cartelas?.codigo ?? '—'}</td>
                    <td className="px-6 py-3 text-gray-600">{fmt(Number(v.valor))}</td>
                    <td className="px-6 py-3 text-gray-600 capitalize">{v.forma_pagamento}</td>
                    <td className="px-6 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor[v.status_pagamento] ?? 'bg-gray-100 text-gray-500'}`}>
                        {statusLabel[v.status_pagamento] ?? v.status_pagamento}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="px-6 py-12 text-center">
              <p className="text-sm text-gray-400">Nenhuma venda registrada ainda.</p>
            </div>
          )}
        </div>
      </div>

      {/* Histórico de saques */}
      {saques.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-medium text-gray-900">Histórico de saques</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs text-gray-400 font-medium px-6 py-3">Data</th>
                <th className="text-left text-xs text-gray-400 font-medium px-6 py-3">Valor</th>
                <th className="text-left text-xs text-gray-400 font-medium px-6 py-3">Chave PIX</th>
                <th className="text-left text-xs text-gray-400 font-medium px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {saques.map((s) => (
                <tr key={s.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-6 py-3 text-gray-500 text-xs">
                    {new Date(s.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-3 font-medium text-gray-900">{fmt(Number(s.valor))}</td>
                  <td className="px-6 py-3 text-gray-500 text-xs truncate max-w-[160px]">{s.chave_pix}</td>
                  <td className="px-6 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${saqueStatusColor[s.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de saque */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-gray-900">Solicitar saque</h3>
              <button onClick={() => { setModalAberto(false); setMsgSaque('') }} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <p className="text-xs text-gray-400 mb-4">
              Saldo disponível: <span className="font-semibold text-gray-700">{fmt(cards.saldoDisponivel)}</span>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                  Valor (R$)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={valor}
                  onChange={e => setValor(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                  Chave PIX
                </label>
                <input
                  type="text"
                  placeholder="CPF, email ou chave aleatória"
                  value={chavePix}
                  onChange={e => setChavePix(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {msgSaque && (
              <p className={`text-xs mt-3 ${msgSaque.includes('sucesso') ? 'text-emerald-600 flex items-center gap-1' : 'text-red-500'}`}>
                {msgSaque.includes('sucesso') && <CheckCircle size={13} />}
                {msgSaque}
              </p>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setModalAberto(false); setMsgSaque('') }}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={solicitarSaque}
                disabled={enviando}
                className="flex-1 py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition disabled:opacity-50"
              >
                {enviando ? 'Enviando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
