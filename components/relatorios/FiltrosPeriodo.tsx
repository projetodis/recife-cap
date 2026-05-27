'use client'

import { FileText, FileSpreadsheet, Loader2 } from 'lucide-react'

interface Props {
  periodo: string            // 'YYYY-MM' ou '' para todos
  onPeriodoChange: (p: string) => void
  onExportarPDF?: () => void
  onExportarExcel?: () => void
  loadingPDF?: boolean
  loadingExcel?: boolean
}

function gerarOpcoesMes(): { value: string; label: string }[] {
  const hoje = new Date()
  const opts: { value: string; label: string }[] = [{ value: '', label: 'Todos os períodos' }]
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  for (let i = 0; i < 12; i++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = `${meses[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`
    opts.push({ value, label })
  }
  return opts
}

const OPCOES = gerarOpcoesMes()

export default function FiltrosPeriodo({
  periodo,
  onPeriodoChange,
  onExportarPDF,
  onExportarExcel,
  loadingPDF = false,
  loadingExcel = false,
}: Props) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <select
        value={periodo}
        onChange={e => onPeriodoChange(e.target.value)}
        className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
      >
        {OPCOES.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      {onExportarExcel && (
        <button
          onClick={onExportarExcel}
          disabled={loadingExcel}
          className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
        >
          {loadingExcel
            ? <Loader2 size={14} className="animate-spin" />
            : <FileSpreadsheet size={14} />}
          Excel
        </button>
      )}

      {onExportarPDF && (
        <button
          onClick={onExportarPDF}
          disabled={loadingPDF}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
        >
          {loadingPDF
            ? <Loader2 size={14} className="animate-spin" />
            : <FileText size={14} />}
          PDF
        </button>
      )}
    </div>
  )
}
