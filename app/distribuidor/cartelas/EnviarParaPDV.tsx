'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  pdvs: { id: string; nome: string; responsavel_nome: string }[]
  edicoesComEstoque: { edicaoId: string; numero: number; comDist: number }[]
  distribuidorId: string
}

export default function EnviarParaPDV({ pdvs, edicoesComEstoque, distribuidorId }: Props) {
  const router = useRouter()
  const [pdvId, setPdvId] = useState('')
  const [edicaoId, setEdicaoId] = useState('')
  const [quantidade, setQuantidade] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  const edicaoSelecionada = edicoesComEstoque.find(e => e.edicaoId === edicaoId)
  const disponiveis = edicaoSelecionada?.comDist ?? 0

  async function handleEnviar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setSucesso('')
    const qtd = parseInt(quantidade)
    if (qtd > disponiveis) {
      setErro(`Você tem apenas ${disponiveis} cartelas desta edição`)
      return
    }
    setCarregando(true)
    try {
      const res = await fetch('/api/distribuidor/enviar-para-pdv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdv_id: pdvId, edicao_id: edicaoId, quantidade: qtd, distribuidor_id: distribuidorId }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      setSucesso(`${qtd} cartelas enviadas para o PDV! Intervalo: ${result.codigo_inicial} → ${result.codigo_final}`)
      setQuantidade('')
      router.refresh()
    } catch (err: any) {
      setErro(err.message)
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-sm font-medium text-gray-900 mb-1">Enviar para PDV</h2>
      <p className="text-xs text-gray-400 mb-4">Transfere cartelas do seu estoque para um ponto de venda</p>

      <form onSubmit={handleEnviar} className="space-y-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Edição</label>
          <select value={edicaoId} onChange={e => setEdicaoId(e.target.value)} required
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500">
            <option value="">Selecione...</option>
            {edicoesComEstoque.map(e => (
              <option key={e.edicaoId} value={e.edicaoId}>
                Ed. {e.numero} — {e.comDist} disponíveis
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">PDV de destino</label>
          <select value={pdvId} onChange={e => setPdvId(e.target.value)} required
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500">
            <option value="">Selecione...</option>
            {pdvs.map(p => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">
            Quantidade {disponiveis > 0 && <span className="text-emerald-600">(max: {disponiveis})</span>}
          </label>
          <input type="number" value={quantidade} onChange={e => setQuantidade(e.target.value)}
            placeholder="Ex: 200" required min="1" max={disponiveis}
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>

        {erro && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{erro}</p>}
        {sucesso && <p className="text-xs text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">{sucesso}</p>}

        <button type="submit" disabled={carregando}
          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-medium rounded-lg transition">
          {carregando ? 'Enviando...' : '📦 Enviar cartelas'}
        </button>
      </form>
    </div>
  )
}
