'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  distribuidorId: string
  edicoesComEstoque: { edicaoId: string; numero: number; comDist: number }[]
}

export default function DevolverCartelas({ distribuidorId, edicoesComEstoque }: Props) {
  const router = useRouter()
  const [edicaoId, setEdicaoId] = useState('')
  const [codigoInicio, setCodigoInicio] = useState('')
  const [codigoFim, setCodigoFim] = useState('')
  const [motivo, setMotivo] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  async function handleDevolver(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setSucesso('')
    setCarregando(true)
    try {
      const res = await fetch('/api/distribuidor/devolver-cartelas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          distribuidor_id: distribuidorId,
          edicao_id: edicaoId,
          codigo_inicio: codigoInicio,
          codigo_fim: codigoFim,
          motivo,
        }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      setSucesso(`${result.quantidade} cartelas devolvidas com sucesso.`)
      setCodigoInicio('')
      setCodigoFim('')
      setMotivo('')
      router.refresh()
    } catch (err: any) {
      setErro(err.message)
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-orange-100 p-5">
      <h2 className="text-sm font-medium text-gray-900 mb-1">Devolver cartelas</h2>
      <p className="text-xs text-gray-400 mb-4">Devolve cartelas não vendidas ao administrador por intervalo de código</p>

      <form onSubmit={handleDevolver} className="space-y-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Edição</label>
          <select value={edicaoId} onChange={e => setEdicaoId(e.target.value)} required
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400">
            <option value="">Selecione...</option>
            {edicoesComEstoque.map(e => (
              <option key={e.edicaoId} value={e.edicaoId}>Ed. {e.numero} — {e.comDist} disponíveis</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Código inicial</label>
            <input type="text" value={codigoInicio} onChange={e => setCodigoInicio(e.target.value)}
              placeholder="Ex: 346000100" required
              className="w-full px-3 py-2.5 text-sm font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Código final</label>
            <input type="text" value={codigoFim} onChange={e => setCodigoFim(e.target.value)}
              placeholder="Ex: 346000200" required
              className="w-full px-3 py-2.5 text-sm font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Motivo</label>
          <input type="text" value={motivo} onChange={e => setMotivo(e.target.value)}
            placeholder="Ex: Não vendidas, PDV fechou..."
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400" />
        </div>

        {erro && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{erro}</p>}
        {sucesso && <p className="text-xs text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">{sucesso}</p>}

        <button type="submit" disabled={carregando}
          className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white text-sm font-medium rounded-lg transition">
          {carregando ? 'Devolvendo...' : '↩️ Devolver cartelas'}
        </button>
      </form>
    </div>
  )
}
