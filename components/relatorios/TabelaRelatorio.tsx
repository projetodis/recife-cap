'use client'

import { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown, Search } from 'lucide-react'

export interface ColumnDef {
  key: string
  label: string
  sortable?: boolean
  align?: 'left' | 'right' | 'center'
  width?: string
  render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode
}

interface Props {
  columns: ColumnDef[]
  data: Record<string, unknown>[]
  pageSize?: number
  searchable?: boolean
  searchPlaceholder?: string
  emptyMessage?: string
  loading?: boolean
}

const SKELETONS = 5

export default function TabelaRelatorio({
  columns,
  data,
  pageSize = 20,
  searchable = true,
  searchPlaceholder = 'Buscar...',
  emptyMessage = 'Nenhum dado encontrado',
  loading = false,
}: Props) {
  const [sortKey, setSortKey]     = useState<string | null>(null)
  const [sortDir, setSortDir]     = useState<'asc' | 'desc'>('asc')
  const [page, setPage]           = useState(1)
  const [search, setSearch]       = useState('')

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
    setPage(1)
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return data
    const q = search.toLowerCase()
    return data.filter(row =>
      Object.values(row).some(v => String(v ?? '').toLowerCase().includes(q)),
    )
  }, [data, search])

  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    return [...filtered].sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av ?? '').localeCompare(String(bv ?? ''), 'pt-BR')
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const pageData   = sorted.slice((page - 1) * pageSize, page * pageSize)

  function SortIcon({ col }: { col: ColumnDef }) {
    if (!col.sortable) return null
    if (sortKey !== col.key) return <ChevronsUpDown size={12} className="text-gray-300" />
    return sortDir === 'asc'
      ? <ChevronUp size={12} className="text-gray-600" />
      : <ChevronDown size={12} className="text-gray-600" />
  }

  const alignClass = { left: 'text-left', right: 'text-right', center: 'text-center' }

  return (
    <div className="space-y-3">
      {searchable && (
        <div className="relative max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder={searchPlaceholder}
            className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {columns.map(col => (
                  <th
                    key={col.key}
                    style={col.width ? { width: col.width } : undefined}
                    className={`px-4 py-3 text-xs font-medium text-gray-400 ${alignClass[col.align ?? 'left']} ${col.sortable ? 'cursor-pointer select-none hover:text-gray-600' : ''}`}
                    onClick={() => col.sortable && toggleSort(col.key)}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      <SortIcon col={col} />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: SKELETONS }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      {columns.map(col => (
                        <td key={col.key} className="px-4 py-3">
                          <div className="h-4 bg-gray-100 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                : pageData.length === 0
                ? (
                    <tr>
                      <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-gray-400">
                        {emptyMessage}
                      </td>
                    </tr>
                  )
                : pageData.map((row, i) => (
                    <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                      {columns.map(col => (
                        <td
                          key={col.key}
                          className={`px-4 py-3 text-gray-700 ${alignClass[col.align ?? 'left']}`}
                        >
                          {col.render
                            ? col.render(row[col.key], row)
                            : String(row[col.key] ?? '—')}
                        </td>
                      ))}
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
            <p className="text-xs text-gray-400">
              {sorted.length} resultado{sorted.length !== 1 ? 's' : ''}
              {search ? ` para "${search}"` : ''}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-2.5 py-1 text-xs rounded border border-gray-200 disabled:opacity-40 hover:bg-white transition"
              >
                ‹
              </button>
              <span className="px-2.5 py-1 text-xs text-gray-600">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-2.5 py-1 text-xs rounded border border-gray-200 disabled:opacity-40 hover:bg-white transition"
              >
                ›
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
