'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft } from 'lucide-react'

interface UsuarioRow {
  id: string; user_id: string; nome: string; email: string
  role: string; ativo: boolean; ultimo_acesso: string | null; created_at: string
}
interface LogRow {
  id: string; tipo: string; nivel: string; acao: string
  descricao: string | null; created_at: string
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador', operador_sorteio: 'Operador de Sorteio',
  financeiro: 'Financeiro', suporte: 'Suporte',
  distribuidor: 'Distribuidor', pdv: 'PDV', motoboy: 'Motoboy',
}
const TIPO_CORES: Record<string, string> = {
  auth: 'bg-blue-100 text-blue-700', sorteio: 'bg-green-100 text-green-700',
  pagamento: 'bg-yellow-100 text-yellow-700', erro: 'bg-red-100 text-red-700',
  usuario: 'bg-indigo-100 text-indigo-700', sistema: 'bg-gray-100 text-gray-600',
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

export default function UsuarioPerfilPage() {
  const { id } = useParams<{ id: string }>()
  const router  = useRouter()
  const supabase = createClient()

  const [usuario, setUsuario]   = useState<UsuarioRow | null>(null)
  const [logs, setLogs]         = useState<LogRow[]>([])
  const [loading, setLoading]   = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg]           = useState('')

  const carregar = useCallback(async () => {
    setLoading(true)
    const { data: u } = await supabase
      .from('usuarios_sistema').select('*').eq('user_id', id).single()
    setUsuario(u)

    const { data: l } = await supabase
      .from('logs').select('id, tipo, nivel, acao, descricao, created_at')
      .eq('usuario_id', id)
      .order('created_at', { ascending: false })
      .limit(50)
    setLogs((l ?? []) as LogRow[])
    setLoading(false)
  }, [supabase, id])

  useEffect(() => { carregar() }, [carregar])

  async function toggleAtivo() {
    if (!usuario) return
    setSalvando(true)
    await fetch(`/api/admin/usuarios/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao: 'toggle_ativo', ativo: !usuario.ativo }),
    })
    await carregar(); setSalvando(false)
    setMsg(usuario.ativo ? 'Usuário desativado.' : 'Usuário ativado.')
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#2E7D32', borderTopColor: 'transparent' }} />
    </div>
  )
  if (!usuario) return (
    <div className="text-center py-16 text-gray-400">Usuário não encontrado</div>
  )

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-700">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Perfil do Usuário</h1>
      </div>

      {msg && <p className="text-green-600 text-sm font-medium">{msg}</p>}

      {/* Card dados */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Nome</p>
            <p className="font-semibold text-gray-800">{usuario.nome}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Email</p>
            <p className="text-gray-700">{usuario.email}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Role</p>
            <p className="text-gray-700">{ROLE_LABELS[usuario.role] ?? usuario.role}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Status</p>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${usuario.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {usuario.ativo ? 'Ativo' : 'Inativo'}
            </span>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Último acesso</p>
            <p className="text-gray-600 text-sm">{fmtDate(usuario.ultimo_acesso)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Cadastrado em</p>
            <p className="text-gray-600 text-sm">{fmtDate(usuario.created_at)}</p>
          </div>
        </div>

        <div className="pt-2 flex gap-3">
          <button
            onClick={toggleAtivo} disabled={salvando}
            className={`px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-40 transition-colors ${usuario.ativo ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
          >
            {usuario.ativo ? 'Desativar usuário' : 'Ativar usuário'}
          </button>
        </div>
      </div>

      {/* Histórico de logs */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <p className="font-semibold text-gray-800 text-sm">Histórico de Atividades ({logs.length})</p>
        </div>
        {logs.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">Nenhuma atividade registrada</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {logs.map(log => (
              <div key={log.id} className="flex items-center gap-4 px-6 py-3">
                <span className="text-gray-400 font-mono text-xs w-32 flex-shrink-0">{fmtDate(log.created_at)}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${TIPO_CORES[log.tipo] ?? 'bg-gray-100 text-gray-600'}`}>
                  {log.tipo}
                </span>
                <span className="text-gray-700 text-sm">{log.acao}</span>
                {log.descricao && <span className="text-gray-400 text-xs truncate">{log.descricao}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
