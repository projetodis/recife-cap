'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface LogRow {
  id: string
  tipo: string
  nivel: string
  acao: string
  descricao: string | null
  usuario_nome: string | null
  usuario_role: string | null
  ip: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

const TIPOS = ['auth', 'sorteio', 'pagamento', 'ganhador', 'cartela', 'usuario', 'sistema', 'erro']
const NIVEIS = ['info', 'aviso', 'erro', 'critico']

const TIPO_CORES: Record<string, string> = {
  auth:      'bg-blue-100 text-blue-700',
  sorteio:   'bg-green-100 text-green-700',
  pagamento: 'bg-yellow-100 text-yellow-700',
  ganhador:  'bg-amber-100 text-amber-700',
  cartela:   'bg-purple-100 text-purple-700',
  usuario:   'bg-indigo-100 text-indigo-700',
  sistema:   'bg-gray-100 text-gray-700',
  erro:      'bg-red-100 text-red-700',
}
const NIVEL_CORES: Record<string, string> = {
  info:    'bg-gray-100 text-gray-500',
  aviso:   'bg-yellow-100 text-yellow-700',
  erro:    'bg-red-100 text-red-600',
  critico: 'bg-red-200 text-red-800 font-bold',
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' })
}

export default function AdminLogsPage() {
  const supabase = useRef(createClient()).current

  const [logs, setLogs]         = useState<LogRow[]>([])
  const [loading, setLoading]   = useState(true)
  const [page, setPage]         = useState(0)
  const [total, setTotal]       = useState(0)
  const [toast, setToast]       = useState<string | null>(null)

  const [filtroTipo, setFiltroTipo]   = useState('')
  const [filtroNivel, setFiltroNivel] = useState('')
  const [filtroBusca, setFiltroBusca] = useState('')
  const [filtroDe, setFiltroDe]       = useState('')
  const [filtroAte, setFiltroAte]     = useState('')

  const PER_PAGE = 50

  const buscarLogs = useCallback(async (p = 0) => {
    setLoading(true)
    let query = supabase
      .from('logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(p * PER_PAGE, p * PER_PAGE + PER_PAGE - 1)

    if (filtroTipo)  query = (query as any).eq('tipo', filtroTipo)
    if (filtroNivel) query = (query as any).eq('nivel', filtroNivel)
    if (filtroBusca) query = (query as any).ilike('acao', `%${filtroBusca}%`)
    if (filtroDe)    query = (query as any).gte('created_at', new Date(filtroDe).toISOString())
    if (filtroAte)   query = (query as any).lte('created_at', new Date(filtroAte + 'T23:59:59').toISOString())

    const { data, count } = await query
    setLogs((data ?? []) as LogRow[])
    setTotal(count ?? 0)
    setLoading(false)
  }, [supabase, filtroTipo, filtroNivel, filtroBusca, filtroDe, filtroAte])

  // Carga inicial + auto-refresh 30s
  useEffect(() => {
    buscarLogs(page)
    const interval = setInterval(() => buscarLogs(page), 30_000)
    return () => clearInterval(interval)
  }, [buscarLogs, page])

  // Realtime: alerta para logs críticos
  useEffect(() => {
    const channel = supabase
      .channel('logs-criticos')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'logs' }, (payload) => {
        if (payload.new.nivel === 'critico') {
          setToast(`🚨 CRÍTICO: ${payload.new.acao}`)
          setTimeout(() => setToast(null), 6000)
          setLogs(prev => [payload.new as LogRow, ...prev].slice(0, PER_PAGE))
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase])

  function exportarCSV() {
    const headers = ['Data', 'Tipo', 'Nível', 'Ação', 'Descrição', 'Usuário', 'Role', 'IP']
    const rows = logs.map(l => [
      fmtDate(l.created_at), l.tipo, l.nivel, l.acao,
      l.descricao ?? '', l.usuario_nome ?? '', l.usuario_role ?? '', l.ip ?? '',
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `logs-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const totalPages = Math.ceil(total / PER_PAGE)

  return (
    <div className="space-y-6">
      {/* Toast crítico */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-red-600 text-white px-6 py-3 rounded-xl shadow-2xl font-bold animate-pulse">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Logs do Sistema</h1>
          <p className="text-gray-500 text-sm mt-0.5">{total.toLocaleString('pt-BR')} registros · auto-refresh 30s</p>
        </div>
        <button
          onClick={exportarCSV}
          className="px-4 py-2 rounded-xl text-sm font-medium text-white transition-colors"
          style={{ background: '#2E7D32' }}
        >
          Exportar CSV
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-wrap gap-3">
        <select
          value={filtroTipo}
          onChange={e => { setFiltroTipo(e.target.value); setPage(0) }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700"
        >
          <option value="">Todos os tipos</option>
          {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <select
          value={filtroNivel}
          onChange={e => { setFiltroNivel(e.target.value); setPage(0) }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700"
        >
          <option value="">Todos os níveis</option>
          {NIVEIS.map(n => <option key={n} value={n}>{n}</option>)}
        </select>

        <input
          type="text"
          placeholder="Buscar por ação..."
          value={filtroBusca}
          onChange={e => { setFiltroBusca(e.target.value); setPage(0) }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 w-48"
        />

        <input
          type="date"
          value={filtroDe}
          onChange={e => { setFiltroDe(e.target.value); setPage(0) }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700"
        />
        <input
          type="date"
          value={filtroAte}
          onChange={e => { setFiltroAte(e.target.value); setPage(0) }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700"
        />

        <button
          onClick={() => { setFiltroTipo(''); setFiltroNivel(''); setFiltroBusca(''); setFiltroDe(''); setFiltroAte(''); setPage(0) }}
          className="text-sm text-gray-400 hover:text-gray-700 px-3 py-2"
        >
          Limpar
        </button>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#2E7D32', borderTopColor: 'transparent' }} />
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-gray-400">Nenhum log encontrado</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100">
                <tr className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  <th className="px-4 py-3">Data/Hora</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Nível</th>
                  <th className="px-4 py-3">Ação</th>
                  <th className="px-4 py-3">Descrição</th>
                  <th className="px-4 py-3">Usuário</th>
                  <th className="px-4 py-3">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs whitespace-nowrap">
                      {fmtDate(log.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${TIPO_CORES[log.tipo] ?? 'bg-gray-100 text-gray-600'}`}>
                        {log.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${NIVEL_CORES[log.nivel] ?? ''}`}>
                        {log.nivel}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">{log.acao}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{log.descricao ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {log.usuario_nome
                        ? <span>{log.usuario_nome} <span className="text-gray-300">·</span> <span className="text-xs">{log.usuario_role}</span></span>
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">{log.ip ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-400">
            Página {page + 1} de {totalPages} · {total} registros
          </p>
          <div className="flex gap-2">
            <button
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
              className="px-4 py-2 text-sm rounded-lg border border-gray-200 disabled:opacity-40 hover:border-gray-300 transition-colors"
            >
              ← Anterior
            </button>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}
              className="px-4 py-2 text-sm rounded-lg border border-gray-200 disabled:opacity-40 hover:border-gray-300 transition-colors"
            >
              Próxima →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
