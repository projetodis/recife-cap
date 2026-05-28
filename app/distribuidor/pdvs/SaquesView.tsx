'use client'

import { useState } from 'react'
import { CheckCircle, XCircle } from 'lucide-react'
import type { SaqueRow } from './page'

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const statusColor: Record<string, string> = {
  pendente:  'bg-amber-50 text-amber-700',
  aprovado:  'bg-emerald-50 text-emerald-700',
  rejeitado: 'bg-red-50 text-red-700',
}

export default function SaquesView({ saques: inicial }: { saques: SaqueRow[] }) {
  const [saques, setSaques] = useState(inicial)
  const [atualizando, setAtualizando] = useState<string | null>(null)
  const [erro, setErro] = useState('')

  const pendentes  = saques.filter(s => s.status === 'pendente')
  const historico  = saques.filter(s => s.status !== 'pendente')

  async function acao(id: string, novoStatus: 'aprovado' | 'rejeitado') {
    setAtualizando(id)
    setErro('')
    try {
      const res = await fetch('/api/distribuidor/saque-pdv', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: novoStatus }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erro')
      setSaques(prev => prev.map(s => s.id === id ? { ...s, status: novoStatus } : s))
    } catch (e: any) {
      setErro(e.message)
    } finally {
      setAtualizando(null)
    }
  }

  return (
    <div className="mt-8">
      {pendentes.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Saques pendentes</h2>
            <span className="text-xs bg-amber-100 text-amber-700 font-medium px-2 py-0.5 rounded-full">
              {pendentes.length} pendente{pendentes.length > 1 ? 's' : ''}
            </span>
          </div>
          {erro && <p className="text-xs text-red-500 px-6 pt-3">{erro}</p>}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs text-gray-400 font-medium px-6 py-3">PDV</th>
                <th className="text-left text-xs text-gray-400 font-medium px-6 py-3">Responsável</th>
                <th className="text-left text-xs text-gray-400 font-medium px-6 py-3">Valor</th>
                <th className="text-left text-xs text-gray-400 font-medium px-6 py-3">Chave PIX</th>
                <th className="text-left text-xs text-gray-400 font-medium px-6 py-3">Data</th>
                <th className="text-left text-xs text-gray-400 font-medium px-6 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {pendentes.map(s => (
                <tr key={s.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-6 py-3 font-medium text-gray-900">{s.pdv_nome}</td>
                  <td className="px-6 py-3 text-gray-600">{s.responsavel_nome}</td>
                  <td className="px-6 py-3 font-semibold text-gray-900">{fmt(s.valor)}</td>
                  <td className="px-6 py-3 text-gray-500 text-xs">{s.chave_pix}</td>
                  <td className="px-6 py-3 text-gray-400 text-xs">
                    {new Date(s.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => acao(s.id, 'aprovado')}
                        disabled={atualizando === s.id}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium hover:bg-emerald-100 transition disabled:opacity-40"
                      >
                        <CheckCircle size={13} />
                        Aprovar
                      </button>
                      <button
                        onClick={() => acao(s.id, 'rejeitado')}
                        disabled={atualizando === s.id}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 transition disabled:opacity-40"
                      >
                        <XCircle size={13} />
                        Rejeitar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {historico.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Histórico de saques</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs text-gray-400 font-medium px-6 py-3">PDV</th>
                <th className="text-left text-xs text-gray-400 font-medium px-6 py-3">Valor</th>
                <th className="text-left text-xs text-gray-400 font-medium px-6 py-3">Chave PIX</th>
                <th className="text-left text-xs text-gray-400 font-medium px-6 py-3">Data</th>
                <th className="text-left text-xs text-gray-400 font-medium px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {historico.map(s => (
                <tr key={s.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-6 py-3 font-medium text-gray-900">{s.pdv_nome}</td>
                  <td className="px-6 py-3 text-gray-900">{fmt(s.valor)}</td>
                  <td className="px-6 py-3 text-gray-500 text-xs">{s.chave_pix}</td>
                  <td className="px-6 py-3 text-gray-400 text-xs">
                    {new Date(s.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor[s.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
