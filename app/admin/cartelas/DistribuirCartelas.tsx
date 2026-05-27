'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  edicaoId: string
  distribuidores: any[]
  disponiveis: number
}

export default function DistribuirCartelas({ edicaoId, distribuidores, disponiveis }: Props) {
  const router = useRouter()
  const [distribuidorId, setDistribuidorId] = useState('')
  const [quantidade, setQuantidade] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  async function handleDistribuir(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setSucesso('')

    const qtd = parseInt(quantidade)
    if (qtd > disponiveis) {
      setErro(`Disponível: ${disponiveis.toLocaleString('pt-BR')} cartelas`)
      return
    }

    setCarregando(true)
    try {
      const res = await fetch('/api/admin/distribuir-cartelas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ edicao_id: edicaoId, distribuidor_id: distribuidorId, quantidade: qtd }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      setSucesso(`${qtd.toLocaleString('pt-BR')} cartelas enviadas!`)
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
      <h2 className="text-sm font-medium text-gray-900 mb-4">Distribuir cartelas</h2>
      <p className="text-xs text-gray-400 mb-4">
        {disponiveis.toLocaleString('pt-BR')} cartelas disponíveis no estoque
      </p>

      <form onSubmit={handleDistribuir} className="space-y-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Distribuidor</label>
          <select value={distribuidorId} onChange={e => setDistribuidorId(e.target.value)} required
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500">
            <option value="">Selecione...</option>
            {distribuidores.map((d: any) => (
              <option key={d.id} value={d.id}>{d.profiles?.nome} (nv:{d.nivel})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Quantidade de cartelas</label>
          <input type="number" value={quantidade} onChange={e => setQuantidade(e.target.value)}
            placeholder="Ex: 5000" required min="1" max={disponiveis}
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>

        {quantidade && (
          <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
            <div className="flex justify-between">
              <span>Valor total lote:</span>
              <span className="font-medium">a calcular</span>
            </div>
          </div>
        )}

        {erro && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{erro}</p>}
        {sucesso && <p className="text-xs text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">{sucesso}</p>}

        <button type="submit" disabled={carregando || disponiveis === 0}
          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg transition">
          {carregando ? 'Distribuindo...' : 'Enviar cartelas'}
        </button>
      </form>
    </div>
  )
}
