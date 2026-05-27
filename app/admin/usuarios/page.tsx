'use client'

import { useState, useEffect } from 'react'

interface UsuarioRow {
  id: string
  user_id: string
  nome: string
  email: string
  role: string
  ativo: boolean
  ultimo_acesso: string | null
  created_at: string
}

const ROLES = [
  { value: 'operador_sorteio', label: 'Operador de Sorteio' },
  { value: 'financeiro',       label: 'Financeiro' },
  { value: 'suporte',          label: 'Suporte' },
  { value: 'distribuidor',     label: 'Distribuidor' },
  { value: 'pdv',              label: 'PDV' },
  { value: 'motoboy',          label: 'Motoboy' },
  { value: 'admin',            label: 'Administrador' },
]

const ROLE_CORES: Record<string, string> = {
  admin:            'bg-red-100 text-red-700',
  operador_sorteio: 'bg-green-100 text-green-700',
  financeiro:       'bg-yellow-100 text-yellow-700',
  suporte:          'bg-blue-100 text-blue-700',
  distribuidor:     'bg-purple-100 text-purple-700',
  pdv:              'bg-indigo-100 text-indigo-700',
  motoboy:          'bg-orange-100 text-orange-700',
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function gerarSenha() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#'
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export default function AdminUsuariosPage() {
  const [usuarios, setUsuarios] = useState<UsuarioRow[]>([])
  const [loading, setLoading]   = useState(true)
  const [erro, setErro]         = useState('')
  const [busca, setBusca]       = useState('')

  // Modal novo usuário
  const [modal, setModal]         = useState(false)
  const [novoNome, setNovoNome]   = useState('')
  const [novoEmail, setNovoEmail] = useState('')
  const [novoRole, setNovoRole]   = useState('operador_sorteio')
  const [novaSenha, setNovaSenha] = useState(gerarSenha())
  const [salvando, setSalvando]   = useState(false)
  const [msgModal, setMsgModal]   = useState('')

  // Modal reset senha
  const [resetModal, setResetModal]   = useState<UsuarioRow | null>(null)
  const [novaSenhaReset, setNovaSenhaReset] = useState(gerarSenha())
  const [salvandoReset, setSalvandoReset]   = useState(false)

  async function carregar() {
    setLoading(true)
    const res = await fetch('/api/admin/usuarios')
    if (res.ok) setUsuarios(await res.json())
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  async function criarUsuario(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true); setMsgModal('')
    const res = await fetch('/api/admin/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: novoNome, email: novoEmail, role: novoRole, senha: novaSenha }),
    })
    const data = await res.json()
    if (!res.ok) { setMsgModal(data.erro ?? 'Erro ao criar usuário'); setSalvando(false); return }
    setModal(false)
    setNovoNome(''); setNovoEmail(''); setNovaSenha(gerarSenha())
    await carregar()
    setSalvando(false)
  }

  async function toggleAtivo(u: UsuarioRow) {
    await fetch(`/api/admin/usuarios/${u.user_id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao: 'toggle_ativo', ativo: !u.ativo }),
    })
    await carregar()
  }

  async function resetarSenha(e: React.FormEvent) {
    e.preventDefault()
    if (!resetModal) return
    setSalvandoReset(true)
    await fetch(`/api/admin/usuarios/${resetModal.user_id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao: 'resetar_senha', nova_senha: novaSenhaReset }),
    })
    setResetModal(null); setSalvandoReset(false)
  }

  const filtrados = usuarios.filter(u =>
    u.nome.toLowerCase().includes(busca.toLowerCase()) ||
    u.email.toLowerCase().includes(busca.toLowerCase()) ||
    u.role.includes(busca.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Modal novo usuário */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setModal(false)}>
          <form
            onSubmit={criarUsuario}
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4 space-y-4"
          >
            <h2 className="text-lg font-bold text-gray-900">Novo Usuário</h2>
            {msgModal && <p className="text-red-500 text-sm">{msgModal}</p>}

            <div className="space-y-3">
              <input
                required value={novoNome} onChange={e => setNovoNome(e.target.value)}
                placeholder="Nome completo"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-400"
              />
              <input
                required type="email" value={novoEmail} onChange={e => setNovoEmail(e.target.value)}
                placeholder="Email"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-400"
              />
              <select
                value={novoRole} onChange={e => setNovoRole(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-green-400"
              >
                {ROLES.filter(r => r.value !== 'admin').map(r =>
                  <option key={r.value} value={r.value}>{r.label}</option>
                )}
              </select>
              <div className="flex gap-2">
                <input
                  required value={novaSenha} onChange={e => setNovaSenha(e.target.value)}
                  placeholder="Senha temporária"
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-green-400"
                />
                <button
                  type="button"
                  onClick={() => setNovaSenha(gerarSenha())}
                  className="px-3 py-2 text-xs rounded-xl border border-gray-200 text-gray-500 hover:border-gray-300"
                >
                  Gerar
                </button>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button" onClick={() => setModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit" disabled={salvando}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #2E7D32, #43A047)' }}
              >
                {salvando ? 'Criando...' : 'Criar Usuário'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal reset senha */}
      {resetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setResetModal(null)}>
          <form
            onSubmit={resetarSenha}
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 space-y-4"
          >
            <h2 className="text-lg font-bold text-gray-900">Resetar Senha</h2>
            <p className="text-sm text-gray-500">{resetModal.nome} · {resetModal.email}</p>
            <div className="flex gap-2">
              <input
                required value={novaSenhaReset} onChange={e => setNovaSenhaReset(e.target.value)}
                className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-green-400"
              />
              <button type="button" onClick={() => setNovaSenhaReset(gerarSenha())} className="px-3 py-2 text-xs rounded-xl border border-gray-200 text-gray-500">
                Gerar
              </button>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setResetModal(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600">
                Cancelar
              </button>
              <button type="submit" disabled={salvandoReset} className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold bg-orange-500 hover:bg-orange-600 disabled:opacity-40">
                {salvandoReset ? 'Salvando...' : 'Confirmar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuários do Sistema</h1>
          <p className="text-gray-500 text-sm mt-0.5">{usuarios.length} usuários cadastrados</p>
        </div>
        <button
          onClick={() => setModal(true)}
          className="px-5 py-2.5 rounded-xl text-white font-bold text-sm"
          style={{ background: 'linear-gradient(135deg, #2E7D32, #43A047)' }}
        >
          + Novo Usuário
        </button>
      </div>

      {/* Busca */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <input
          type="text" value={busca} onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por nome, email ou role..."
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-400"
        />
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#2E7D32', borderTopColor: 'transparent' }} />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100">
              <tr className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                <th className="px-4 py-3">Usuário</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Último acesso</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtrados.map(u => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-800">{u.nome}</p>
                    <p className="text-gray-400 text-xs">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ROLE_CORES[u.role] ?? 'bg-gray-100 text-gray-600'}`}>
                      {ROLES.find(r => r.value === u.role)?.label ?? u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${u.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {u.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{fmtDate(u.ultimo_acesso)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => toggleAtivo(u)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-gray-300 transition-colors"
                      >
                        {u.ativo ? 'Desativar' : 'Ativar'}
                      </button>
                      <button
                        onClick={() => { setResetModal(u); setNovaSenhaReset(gerarSenha()) }}
                        className="text-xs px-3 py-1.5 rounded-lg border border-orange-200 text-orange-600 hover:bg-orange-50 transition-colors"
                      >
                        Resetar senha
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">Nenhum usuário encontrado</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
      {erro && <p className="text-red-500 text-sm">{erro}</p>}
    </div>
  )
}
