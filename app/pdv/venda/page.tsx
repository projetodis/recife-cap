'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Etapa = 'busca' | 'confirmacao' | 'pix' | 'sucesso'
type FormaPagamento = 'pix' | 'dinheiro'

interface Cartela {
  id: string
  codigo: string
  status: string
  edicoes: {
    numero: number
    data_sorteio: string
    valor_unitario: number
  }
}

const ETAPA_INDEX: Record<Etapa, number> = {
  busca: 1,
  confirmacao: 2,
  pix: 3,
  sucesso: 4,
}

export default function VendaPage() {
  const supabase = createClient()

  const [etapa, setEtapa] = useState<Etapa>('busca')
  const [codigo, setCodigo] = useState('')
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('pix')
  const [cartela, setCartela] = useState<Cartela | null>(null)
  const [pdvId, setPdvId] = useState<string | null>(null)
  const [vendaId, setVendaId] = useState<string | null>(null)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [copiado, setCopiado] = useState(false)

  async function handleBuscar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setCarregando(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setErro('Sessão expirada. Faça login novamente.')
      setCarregando(false)
      return
    }

    const { data: pdv } = await supabase
      .from('pontos_de_venda')
      .select('id')
      .eq('responsavel_id', user.id)
      .single()

    if (!pdv) {
      setErro('Nenhum PDV associado ao seu usuário.')
      setCarregando(false)
      return
    }

    const { data, error } = await supabase
      .from('cartelas')
      .select('id, codigo, status, edicoes(numero, data_sorteio, valor_unitario)')
      .eq('codigo', codigo.trim().toUpperCase())
      .eq('pdv_id', pdv.id)
      .eq('status', 'em_estoque_pdv')
      .single()

    if (error || !data) {
      setErro('Cartela não encontrada, não pertence a este PDV ou já foi vendida.')
      setCarregando(false)
      return
    }

    setPdvId(pdv.id)
    setCartela(data as unknown as Cartela)
    setEtapa('confirmacao')
    setCarregando(false)
  }

  async function handleConfirmar() {
    if (!cartela || !pdvId) return
    setErro('')
    setCarregando(true)

    if (formaPagamento === 'dinheiro') {
      const { error } = await supabase.from('vendas').insert({
        cartela_id: cartela.id,
        pdv_id: pdvId,
        valor: cartela.edicoes.valor_unitario,
        forma_pagamento: 'dinheiro',
        status_pagamento: 'confirmado',
      })

      if (error) {
        setErro('Erro ao registrar venda. Tente novamente.')
        setCarregando(false)
        return
      }

      await supabase
        .from('cartelas')
        .update({ status: 'paga' })
        .eq('id', cartela.id)

      setEtapa('sucesso')
    } else {
      const { data: venda, error } = await supabase
        .from('vendas')
        .insert({
          cartela_id: cartela.id,
          pdv_id: pdvId,
          valor: cartela.edicoes.valor_unitario,
          forma_pagamento: 'pix',
          status_pagamento: 'aguardando_confirmacao',
        })
        .select('id')
        .single()

      if (error || !venda) {
        setErro('Erro ao registrar venda. Tente novamente.')
        setCarregando(false)
        return
      }

      await supabase
        .from('cartelas')
        .update({ status: 'vendida' })
        .eq('id', cartela.id)

      setVendaId(venda.id)
      setEtapa('pix')
    }

    setCarregando(false)
  }

  async function handleConfirmarPix() {
    if (!vendaId || !cartela) return
    setCarregando(true)

    await supabase
      .from('vendas')
      .update({ status_pagamento: 'confirmado', pago_em: new Date().toISOString() })
      .eq('id', vendaId)

    await supabase
      .from('cartelas')
      .update({ status: 'paga' })
      .eq('id', cartela.id)

    setEtapa('sucesso')
    setCarregando(false)
  }

  async function handleCopiar(texto: string) {
    await navigator.clipboard.writeText(texto)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  function novaVenda() {
    setEtapa('busca')
    setCodigo('')
    setFormaPagamento('pix')
    setCartela(null)
    setPdvId(null)
    setVendaId(null)
    setErro('')
    setCopiado(false)
  }

  const pixCode = cartela
    ? '00020126580014br.gov.bcb.pix0136' +
      cartela.id +
      '5204000053039865802BR5925NATALCAP6009SAO PAULO62070503***6304'
    : ''

  const etapaAtual = ETAPA_INDEX[etapa]

  return (
    <div className="max-w-md mx-auto py-8 px-4">

      {/* Indicador de progresso */}
      <div className="flex items-center justify-center mb-8">
        {[1, 2, 3, 4].map((n, i) => (
          <div key={n} className="flex items-center">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                n === etapaAtual
                  ? 'bg-emerald-600 text-white'
                  : n < etapaAtual
                  ? 'bg-emerald-200 text-emerald-700'
                  : 'bg-gray-200 text-gray-400'
              }`}
            >
              {n}
            </div>
            {i < 3 && (
              <div
                className={`w-12 h-0.5 ${
                  n < etapaAtual ? 'bg-emerald-200' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">

        {/* ETAPA 1 — Busca */}
        {etapa === 'busca' && (
          <form onSubmit={handleBuscar} className="space-y-4">
            <h2 className="text-base font-semibold text-gray-900">Buscar cartela</h2>

            <div>
              <label className="block text-sm text-gray-600 mb-1.5">Código da cartela</label>
              <input
                type="text"
                value={codigo}
                onChange={e => setCodigo(e.target.value.toUpperCase())}
                placeholder="ex: CAP-0001"
                required
                autoFocus
                className="w-full px-3 py-2.5 text-sm font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1.5">Forma de pagamento</label>
              <select
                value={formaPagamento}
                onChange={e => setFormaPagamento(e.target.value as FormaPagamento)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white transition"
              >
                <option value="pix">PIX</option>
                <option value="dinheiro">Dinheiro</option>
              </select>
            </div>

            {erro && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {erro}
              </p>
            )}

            <button
              type="submit"
              disabled={carregando || !codigo.trim()}
              className="w-full py-3 min-h-11 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-medium rounded-lg transition"
            >
              {carregando ? 'Buscando...' : 'Buscar'}
            </button>
          </form>
        )}

        {/* ETAPA 2 — Confirmação */}
        {etapa === 'confirmacao' && cartela && (
          <div className="space-y-5">
            <h2 className="text-base font-semibold text-gray-900">Confirmar venda</h2>

            <div className="space-y-3">
              <Card label="Cartela" valor={<span className="font-mono">{cartela.codigo}</span>} />
              <Card label="Edição" valor={`#${cartela.edicoes.numero}`} />
              <Card
                label="Data do sorteio"
                valor={new Date(cartela.edicoes.data_sorteio).toLocaleDateString('pt-BR')}
              />
              <Card label="Pagamento" valor={formaPagamento === 'pix' ? 'PIX' : 'Dinheiro'} />
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Valor</span>
                <span className="text-xl font-bold text-emerald-600">
                  {cartela.edicoes.valor_unitario.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </span>
              </div>
            </div>

            {erro && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {erro}
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setEtapa('busca')}
                className="flex-1 py-3 min-h-11 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
              >
                Voltar
              </button>
              <button
                onClick={handleConfirmar}
                disabled={carregando}
                className="flex-1 py-3 min-h-11 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-medium rounded-lg transition"
              >
                {carregando ? 'Registrando...' : 'Confirmar venda'}
              </button>
            </div>
          </div>
        )}

        {/* ETAPA 3 — PIX */}
        {etapa === 'pix' && cartela && (
          <div className="space-y-5">
            <h2 className="text-base font-semibold text-gray-900">Pagamento PIX</h2>

            <div className="flex justify-center">
              <div className="w-[200px] h-[200px] bg-gray-200 rounded-xl flex items-center justify-center">
                <span className="text-gray-500 text-sm font-medium">QR Code PIX</span>
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Código copia e cola</label>
              <input
                type="text"
                readOnly
                value={pixCode}
                className="w-full px-3 py-2.5 text-xs font-mono border border-gray-200 rounded-lg bg-gray-50 text-gray-700 cursor-text"
              />
            </div>

            <button
              onClick={() => handleCopiar(pixCode)}
              className="w-full py-3 min-h-11 border border-emerald-500 text-emerald-600 hover:bg-emerald-50 text-sm font-medium rounded-lg transition"
            >
              {copiado ? 'Código copiado!' : 'Copiar código'}
            </button>

            <button
              onClick={handleConfirmarPix}
              disabled={carregando}
              className="w-full py-3 min-h-11 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-medium rounded-lg transition"
            >
              {carregando ? 'Salvando...' : 'Confirmar pagamento PIX recebido'}
            </button>
          </div>
        )}

        {/* ETAPA 4 — Sucesso */}
        {etapa === 'sucesso' && cartela && (
          <div className="text-center space-y-5 py-2">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100">
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#059669"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>

            <div className="space-y-1">
              <p className="text-xl font-bold text-gray-900">
                Cartela {cartela.codigo} vendida!
              </p>
              <p className="text-sm text-gray-500">
                {formaPagamento === 'pix'
                  ? 'Pagamento PIX confirmado'
                  : 'Pagamento em dinheiro registrado'}
              </p>
            </div>

            <button
              onClick={novaVenda}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition"
            >
              Nova venda
            </button>
          </div>
        )}

      </div>
    </div>
  )
}

function Card({ label, valor }: { label: string; valor: React.ReactNode }) {
  return (
    <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 flex justify-between items-center">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{valor}</span>
    </div>
  )
}
