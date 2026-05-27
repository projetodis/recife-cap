'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Cartela {
  id: string
  codigo: string
  status: string
  edicoes: { numero: number; data_sorteio: string } | null
}

type Filtro = 'todos' | 'em_estoque_pdv' | 'vendida' | 'paga'

const BADGE: Record<string, string> = {
  em_estoque_pdv: 'bg-blue-50 text-blue-700',
  vendida:        'bg-amber-50 text-amber-700',
  paga:           'bg-emerald-50 text-emerald-700',
  cancelada:      'bg-red-50 text-red-700',
}

const BADGE_LABEL: Record<string, string> = {
  em_estoque_pdv: 'Em estoque',
  vendida:        'Aguard. PIX',
  paga:           'Paga',
  cancelada:      'Cancelada',
}

export default function CartelasView({ cartelas }: { cartelas: Cartela[] }) {
  const [filtro, setFiltro] = useState<Filtro>('todos')

  const emEstoque    = cartelas.filter(c => c.status === 'em_estoque_pdv').length
  const vendidas     = cartelas.filter(c => c.status === 'vendida').length
  const pagas        = cartelas.filter(c => c.status === 'paga').length
  const total        = cartelas.length

  const filtradas = filtro === 'todos'
    ? cartelas
    : cartelas.filter(c => c.status === filtro)

  const FILTROS: { label: string; value: Filtro; count: number }[] = [
    { label: 'Todos',          value: 'todos',         count: total },
    { label: 'Em estoque',     value: 'em_estoque_pdv', count: emEstoque },
    { label: 'Aguardando PIX', value: 'vendida',       count: vendidas },
    { label: 'Pagas',          value: 'paga',          count: pagas },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Minhas Cartelas</h1>
        <p className="text-sm text-gray-500 mt-1">Estoque e histórico do seu PDV</p>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard label="Em estoque"            value={emEstoque} cor="text-blue-600" />
        <MetricCard label="Aguardando PIX"         value={vendidas}  cor="text-amber-600" />
        <MetricCard label="Pagas / confirmadas"    value={pagas}     cor="text-emerald-600" />
        <MetricCard label="Total recebidas"        value={total}     cor="text-gray-900" />
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {FILTROS.map(f => (
          <button
            key={f.value}
            onClick={() => setFiltro(f.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              filtro === f.value
                ? 'bg-emerald-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            {f.label}
            <span className={`ml-1.5 text-xs ${filtro === f.value ? 'text-emerald-100' : 'text-gray-400'}`}>
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filtradas.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm text-gray-400">Nenhuma cartela encontrada.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">Código</th>
                <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">Edição</th>
                <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">Sorteio</th>
                <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">Status</th>
                <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">Ação</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map(c => (
                <tr key={c.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-mono font-medium text-gray-900">{c.codigo}</td>
                  <td className="px-5 py-3 text-gray-600">
                    {c.edicoes ? `#${c.edicoes.numero}` : '—'}
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {c.edicoes
                      ? new Date(c.edicoes.data_sorteio).toLocaleDateString('pt-BR')
                      : '—'}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${BADGE[c.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {BADGE_LABEL[c.status] ?? c.status}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {c.status === 'vendida' ? (
                      <Link
                        href="/pdv/venda"
                        className="text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
                      >
                        Confirmar PIX
                      </Link>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function MetricCard({ label, value, cor }: { label: string; value: number; cor: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs text-gray-500 mb-2">{label}</p>
      <p className={`text-3xl font-semibold ${cor}`}>{value}</p>
    </div>
  )
}
