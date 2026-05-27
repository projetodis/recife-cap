'use client'

import { TrendingUp, TrendingDown } from 'lucide-react'

interface MetricCardProps {
  icon: React.ReactNode
  label: string
  value: string
  change?: number       // variação percentual vs período anterior
  changeLabel?: string  // ex: "vs. mês anterior"
  color?: 'blue' | 'green' | 'amber' | 'violet' | 'rose'
  loading?: boolean
}

const iconColors = {
  blue:   'bg-blue-50 text-blue-600',
  green:  'bg-emerald-50 text-emerald-600',
  amber:  'bg-amber-50 text-amber-600',
  violet: 'bg-violet-50 text-violet-600',
  rose:   'bg-rose-50 text-rose-600',
}

export default function MetricCard({
  icon, label, value, change, changeLabel, color = 'blue', loading = false,
}: MetricCardProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
        <div className="w-9 h-9 rounded-lg bg-gray-200 mb-3" />
        <div className="h-7 bg-gray-200 rounded w-1/2 mb-2" />
        <div className="h-3 bg-gray-100 rounded w-3/4" />
      </div>
    )
  }

  const positivo = (change ?? 0) >= 0

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg ${iconColors[color]} flex items-center justify-center flex-shrink-0`}>
          {icon}
        </div>
        {change !== undefined && (
          <span className={`flex items-center gap-1 text-xs font-medium ${positivo ? 'text-emerald-600' : 'text-red-500'}`}>
            {positivo ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-semibold text-gray-900 leading-none">{value}</p>
      <p className="text-xs text-gray-500 mt-1.5">{label}</p>
      {changeLabel && <p className="text-xs text-gray-400 mt-0.5">{changeLabel}</p>}
    </div>
  )
}
