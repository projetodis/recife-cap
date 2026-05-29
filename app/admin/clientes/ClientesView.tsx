'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Globe, Plus, Edit2, Trash2, Copy, CheckCircle,
  AlertTriangle, Clock, XCircle, RefreshCw,
} from 'lucide-react'

interface Cliente {
  id: string
  nome: string
  dominio: string
  dominio_staging?: string
  supabase_url?: string
  supabase_project_id?: string
  vercel_project_id?: string
  plano: 'basico' | 'intermediario' | 'completo'
  status: 'trial' | 'ativo' | 'suspenso' | 'cancelado'
  admin_email?: string
  admin_nome?: string
  data_inicio?: string
  data_vencimento?: string
  valor_mensal?: number
  observacoes?: string
  cor_primaria?: string
  cor_secundaria?: string
  logo_url?: string
  created_at: string
}

interface Stats {
  total: number
  ativos: number
  trial: number
  mrr: number
}

const STATUS_CONFIG = {
  ativo:     { label: 'Ativo',     color: '#22c55e', bg: '#dcfce7', icon: <CheckCircle size={13} /> },
  trial:     { label: 'Trial',     color: '#f59e0b', bg: '#fef3c7', icon: <Clock size={13} /> },
  suspenso:  { label: 'Suspenso',  color: '#ef4444', bg: '#fee2e2', icon: <AlertTriangle size={13} /> },
  cancelado: { label: 'Cancelado', color: '#6b7280', bg: '#f3f4f6', icon: <XCircle size={13} /> },
}

const PLANO_CONFIG = {
  basico:       { label: 'Básico',       color: '#6b7280' },
  intermediario: { label: 'Intermediário', color: '#3b82f6' },
  completo:     { label: 'Completo',     color: '#8b5cf6' },
}

const EMPTY: Partial<Cliente> = {
  nome: '', dominio: '', dominio_staging: '', supabase_url: '',
  supabase_project_id: '', vercel_project_id: '', plano: 'basico',
  status: 'trial', admin_email: '', admin_nome: '', valor_mensal: 0,
  cor_primaria: '#2E7D32', cor_secundaria: '#FFC107', observacoes: '',
}

function diasAteVencer(data?: string): number | null {
  if (!data) return null
  const diff = new Date(data).getTime() - Date.now()
  return Math.ceil(diff / 86400000)
}

function copiar(texto: string, setCopied: (k: string) => void, key: string) {
  navigator.clipboard.writeText(texto)
  setCopied(key)
  setTimeout(() => setCopied(''), 1500)
}

export default function ClientesView({ clientes: inicial, stats }: { clientes: Cliente[], stats: Stats }) {
  const supabase = createClient()
  const [clientes, setClientes] = useState<Cliente[]>(inicial)
  const [modal, setModal] = useState<'novo' | 'editar' | null>(null)
  const [form, setForm] = useState<Partial<Cliente>>(EMPTY)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [copied, setCopied] = useState('')
  const [deletando, setDeletando] = useState<string | null>(null)

  function abrirNovo() {
    setForm(EMPTY)
    setErro('')
    setModal('novo')
  }

  function abrirEditar(c: Cliente) {
    setForm({ ...c })
    setErro('')
    setModal('editar')
  }

  async function salvar() {
    if (!form.nome || !form.dominio) { setErro('Nome e domínio são obrigatórios'); return }
    setSalvando(true)
    setErro('')

    const payload = {
      nome: form.nome,
      dominio: form.dominio,
      dominio_staging: form.dominio_staging || null,
      supabase_url: form.supabase_url || null,
      supabase_project_id: form.supabase_project_id || null,
      vercel_project_id: form.vercel_project_id || null,
      plano: form.plano || 'basico',
      status: form.status || 'trial',
      admin_email: form.admin_email || null,
      admin_nome: form.admin_nome || null,
      data_vencimento: form.data_vencimento || null,
      valor_mensal: Number(form.valor_mensal || 0),
      cor_primaria: form.cor_primaria || '#2E7D32',
      cor_secundaria: form.cor_secundaria || '#FFC107',
      observacoes: form.observacoes || null,
    }

    if (modal === 'novo') {
      const { data, error } = await supabase
        .from('clientes_whitelabel')
        .insert(payload)
        .select()
        .single()
      if (error) { setErro(error.message); setSalvando(false); return }
      setClientes(prev => [data, ...prev])
    } else {
      const { data, error } = await supabase
        .from('clientes_whitelabel')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', form.id!)
        .select()
        .single()
      if (error) { setErro(error.message); setSalvando(false); return }
      setClientes(prev => prev.map(c => c.id === data.id ? data : c))
    }

    setSalvando(false)
    setModal(null)
  }

  async function alterarStatus(id: string, status: Cliente['status']) {
    await supabase.from('clientes_whitelabel').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    setClientes(prev => prev.map(c => c.id === id ? { ...c, status } : c))
  }

  async function deletar(id: string) {
    if (!confirm('Excluir este cliente? Esta ação não pode ser desfeita.')) return
    setDeletando(id)
    await supabase.from('clientes_whitelabel').delete().eq('id', id)
    setClientes(prev => prev.filter(c => c.id !== id))
    setDeletando(null)
  }

  const statsAtual = {
    total: clientes.length,
    ativos: clientes.filter(c => c.status === 'ativo').length,
    trial: clientes.filter(c => c.status === 'trial').length,
    mrr: clientes.filter(c => c.status === 'ativo').reduce((a, c) => a + Number(c.valor_mensal || 0), 0),
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Globe size={24} className="text-green-700" />
          <div>
            <h1 className="text-xl font-black text-gray-900">Clientes White Label</h1>
            <p className="text-xs text-gray-500 mt-0.5">Gerenciar instâncias do sistema</p>
          </div>
        </div>
        <button
          onClick={abrirNovo}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold shadow"
          style={{ background: '#2E7D32' }}
        >
          <Plus size={15} />
          Novo cliente
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total',  value: statsAtual.total,  color: '#6b7280' },
          { label: 'Ativos', value: statsAtual.ativos, color: '#22c55e' },
          { label: 'Trial',  value: statsAtual.trial,  color: '#f59e0b' },
          { label: 'MRR',    value: `R$ ${statsAtual.mrr.toFixed(2).replace('.', ',')}`, color: '#3b82f6' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <p className="text-xs text-gray-500 font-medium">{s.label}</p>
            <p className="text-2xl font-black mt-1" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {clientes.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <Globe size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum cliente cadastrado ainda</p>
            <button onClick={abrirNovo} className="mt-3 text-green-700 text-sm font-semibold hover:underline">
              Adicionar primeiro cliente
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Cliente</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Domínio</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Plano</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Vencimento</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">MRR</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {clientes.map(c => {
                  const st = STATUS_CONFIG[c.status]
                  const pl = PLANO_CONFIG[c.plano]
                  const dias = diasAteVencer(c.data_vencimento)
                  return (
                    <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                            style={{ background: c.cor_primaria || '#2E7D32' }}
                          >
                            {c.nome.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{c.nome}</p>
                            {c.admin_email && (
                              <p className="text-xs text-gray-400">{c.admin_email}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <a
                            href={`https://${c.dominio}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-xs"
                          >
                            {c.dominio}
                          </a>
                          <button
                            onClick={() => copiar(c.dominio, setCopied, `dom-${c.id}`)}
                            className="text-gray-300 hover:text-gray-600 transition-colors"
                          >
                            {copied === `dom-${c.id}` ? <CheckCircle size={12} className="text-green-500" /> : <Copy size={12} />}
                          </button>
                        </div>
                        {c.supabase_project_id && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <p className="text-xs text-gray-400">{c.supabase_project_id}</p>
                            <button
                              onClick={() => copiar(c.supabase_project_id!, setCopied, `sup-${c.id}`)}
                              className="text-gray-300 hover:text-gray-600 transition-colors"
                            >
                              {copied === `sup-${c.id}` ? <CheckCircle size={12} className="text-green-500" /> : <Copy size={12} />}
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold" style={{ color: pl.color }}>{pl.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{ color: st.color, background: st.bg }}
                        >
                          {st.icon}
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {c.data_vencimento ? (
                          <div>
                            <p className="text-xs text-gray-700">
                              {new Date(c.data_vencimento).toLocaleDateString('pt-BR')}
                            </p>
                            {dias !== null && (
                              <p className={`text-xs font-semibold ${dias <= 7 ? 'text-red-500' : dias <= 30 ? 'text-amber-500' : 'text-gray-400'}`}>
                                {dias > 0 ? `${dias}d restantes` : dias === 0 ? 'Vence hoje' : `Vencido há ${Math.abs(dias)}d`}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-semibold text-gray-700">
                          {c.valor_mensal ? `R$ ${Number(c.valor_mensal).toFixed(2).replace('.', ',')}` : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          {/* Status rápido */}
                          {c.status !== 'ativo' && (
                            <button
                              onClick={() => alterarStatus(c.id, 'ativo')}
                              title="Marcar como ativo"
                              className="p-1.5 rounded hover:bg-green-50 text-green-600 transition-colors"
                            >
                              <CheckCircle size={14} />
                            </button>
                          )}
                          {c.status === 'ativo' && (
                            <button
                              onClick={() => alterarStatus(c.id, 'suspenso')}
                              title="Suspender"
                              className="p-1.5 rounded hover:bg-red-50 text-red-400 transition-colors"
                            >
                              <AlertTriangle size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => abrirEditar(c)}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-400 transition-colors"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => deletar(c.id)}
                            disabled={deletando === c.id}
                            className="p-1.5 rounded hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors"
                          >
                            {deletando === c.id ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-black text-gray-900">
                {modal === 'novo' ? 'Novo cliente' : `Editar — ${form.nome}`}
              </h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600">
                <XCircle size={20} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Identificação */}
              <section>
                <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Identificação</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Nome *</label>
                    <input
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      value={form.nome || ''}
                      onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                      placeholder="Ex: Recife Cap"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Admin e-mail</label>
                    <input
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      value={form.admin_email || ''}
                      onChange={e => setForm(f => ({ ...f, admin_email: e.target.value }))}
                      placeholder="admin@cliente.com"
                    />
                  </div>
                </div>
              </section>

              {/* Domínios */}
              <section>
                <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Domínios</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Domínio produção *</label>
                    <input
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      value={form.dominio || ''}
                      onChange={e => setForm(f => ({ ...f, dominio: e.target.value }))}
                      placeholder="cliente.com.br"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Domínio staging</label>
                    <input
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      value={form.dominio_staging || ''}
                      onChange={e => setForm(f => ({ ...f, dominio_staging: e.target.value }))}
                      placeholder="staging.cliente.com.br"
                    />
                  </div>
                </div>
              </section>

              {/* Infra */}
              <section>
                <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Infraestrutura</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Supabase Project ID</label>
                    <input
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500"
                      value={form.supabase_project_id || ''}
                      onChange={e => setForm(f => ({ ...f, supabase_project_id: e.target.value }))}
                      placeholder="xxxxxxxxxxxxxxxxxxx"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Vercel Project ID</label>
                    <input
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500"
                      value={form.vercel_project_id || ''}
                      onChange={e => setForm(f => ({ ...f, vercel_project_id: e.target.value }))}
                      placeholder="prj_xxxxxxxxxxxx"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Supabase URL</label>
                    <input
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500"
                      value={form.supabase_url || ''}
                      onChange={e => setForm(f => ({ ...f, supabase_url: e.target.value }))}
                      placeholder="https://xxxxxxxxxxx.supabase.co"
                    />
                  </div>
                </div>
              </section>

              {/* Plano e status */}
              <section>
                <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Plano e status</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Plano</label>
                    <select
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      value={form.plano || 'basico'}
                      onChange={e => setForm(f => ({ ...f, plano: e.target.value as Cliente['plano'] }))}
                    >
                      <option value="basico">Básico</option>
                      <option value="intermediario">Intermediário</option>
                      <option value="completo">Completo</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Status</label>
                    <select
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      value={form.status || 'trial'}
                      onChange={e => setForm(f => ({ ...f, status: e.target.value as Cliente['status'] }))}
                    >
                      <option value="trial">Trial</option>
                      <option value="ativo">Ativo</option>
                      <option value="suspenso">Suspenso</option>
                      <option value="cancelado">Cancelado</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Valor mensal (R$)</label>
                    <input
                      type="number"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      value={form.valor_mensal || ''}
                      onChange={e => setForm(f => ({ ...f, valor_mensal: Number(e.target.value) }))}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Data de vencimento</label>
                    <input
                      type="date"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      value={form.data_vencimento || ''}
                      onChange={e => setForm(f => ({ ...f, data_vencimento: e.target.value }))}
                    />
                  </div>
                </div>
              </section>

              {/* Cores */}
              <section>
                <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Identidade visual</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Cor primária</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        className="w-9 h-9 rounded cursor-pointer border border-gray-200"
                        value={form.cor_primaria || '#2E7D32'}
                        onChange={e => setForm(f => ({ ...f, cor_primaria: e.target.value }))}
                      />
                      <input
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500"
                        value={form.cor_primaria || '#2E7D32'}
                        onChange={e => setForm(f => ({ ...f, cor_primaria: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Cor secundária</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        className="w-9 h-9 rounded cursor-pointer border border-gray-200"
                        value={form.cor_secundaria || '#FFC107'}
                        onChange={e => setForm(f => ({ ...f, cor_secundaria: e.target.value }))}
                      />
                      <input
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500"
                        value={form.cor_secundaria || '#FFC107'}
                        onChange={e => setForm(f => ({ ...f, cor_secundaria: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* Observações */}
              <section>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Observações</label>
                <textarea
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  rows={3}
                  value={form.observacoes || ''}
                  onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                  placeholder="Notas internas sobre este cliente..."
                />
              </section>

              {erro && (
                <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{erro}</p>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setModal(null)}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={salvar}
                disabled={salvando}
                className="px-5 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-60 flex items-center gap-2"
                style={{ background: '#2E7D32' }}
              >
                {salvando && <RefreshCw size={14} className="animate-spin" />}
                {modal === 'novo' ? 'Criar cliente' : 'Salvar alterações'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
