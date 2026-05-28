'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Save, CheckCircle, AlertCircle, Clock, XCircle } from 'lucide-react'

export default function PerfilPage() {
  const supabase = createClient()
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando]     = useState(false)
  const [sucesso, setSucesso]       = useState('')
  const [erro, setErro]             = useState('')

  const [form, setForm] = useState({
    nome: '', cpf: '', telefone: '', chave_pix: '', status_pix: '',
  })
  const [dist, setDist] = useState<any>(null)

  useEffect(() => {
    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles').select('*').eq('id', user.id).single()

      const { data: d } = await supabase
        .from('distribuidores').select('*').eq('user_id', user.id).single()

      if (profile) {
        setForm({
          nome:       profile.nome       ?? '',
          cpf:        profile.cpf        ?? '',
          telefone:   profile.telefone   ?? '',
          chave_pix:  profile.chave_pix  ?? '',
          status_pix: profile.status_pix ?? 'pendente',
        })
      }
      setDist(d)
      setCarregando(false)
    }
    carregar()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro('')
    setSucesso('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('profiles')
      .update({
        nome:       form.nome,
        cpf:        form.cpf,
        telefone:   form.telefone,
        chave_pix:  form.chave_pix,
        status_pix: form.chave_pix ? 'aguardando_validacao' : 'pendente',
      })
      .eq('id', user.id)

    if (error) { setErro(error.message) }
    else { setSucesso('Perfil atualizado! Sua chave PIX será validada em breve.') }

    setSalvando(false)
  }

  const pixStatusInfo: Record<string, { label: string; bg: string; text: string; icon: React.ReactNode; desc: string }> = {
    pendente: {
      label: 'Não cadastrada',
      bg: '#F5F5F5', text: '#6B7280',
      icon: <Clock size={13} />,
      desc: 'Cadastre sua chave PIX para receber comissões.',
    },
    aguardando_validacao: {
      label: 'Aguardando validação',
      bg: '#FFF8E1', text: '#B45309',
      icon: <AlertCircle size={13} />,
      desc: 'O administrador irá validar sua chave em breve.',
    },
    validado: {
      label: 'Validada',
      bg: '#E8F5E9', text: '#2E7D32',
      icon: <CheckCircle size={13} />,
      desc: 'Sua chave PIX está validada e pronta para receber.',
    },
    rejeitado: {
      label: 'Rejeitada',
      bg: '#FEF2F2', text: '#DC2626',
      icon: <XCircle size={13} />,
      desc: 'Sua chave foi rejeitada. Cadastre uma nova chave válida.',
    },
  }
  const pixInfo = pixStatusInfo[form.status_pix] ?? pixStatusInfo.pendente
  const inicial = form.nome?.charAt(0).toUpperCase() || '?'

  if (carregando) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <p className="text-sm text-gray-400">Carregando...</p>
      </div>
    )
  }

  return (
    <div style={{ background: '#F5F7FA', minHeight: '100vh' }} className="p-1">

      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900">Meu perfil</h1>
        <p className="text-sm text-gray-500 mt-0.5">Dados pessoais e chave PIX para recebimento de comissões</p>
      </div>

      <div className="max-w-xl">

        {/* Avatar + nome */}
        <div className="flex items-center gap-4 mb-6">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-black flex-shrink-0"
            style={{ background: '#E8F5E9', color: '#2E7D32' }}
          >
            {inicial}
          </div>
          <div>
            <p className="text-xl font-black text-gray-900">{form.nome || 'Sem nome'}</p>
            <span
              className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full mt-1"
              style={{ background: '#E8F5E9', color: '#2E7D32' }}
            >
              Distribuidor{dist?.nivel ? ` nv.${dist.nivel}` : ''}
            </span>
          </div>
        </div>

        {/* Dados comerciais */}
        <div
          className="bg-white rounded-2xl border p-5 mb-5"
          style={{ borderColor: '#E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
        >
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Dados comerciais</p>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Nível</p>
              <p className="font-bold text-gray-900">nv.{dist?.nivel ?? 1}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Comissão</p>
              <p className="font-bold text-gray-900">{dist?.comissao_pct ?? 0}%</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Meta mensal</p>
              <p className="font-bold text-gray-900">
                {dist?.meta_mensal
                  ? dist.meta_mensal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                  : '—'}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSalvar} className="space-y-5">

          {/* Dados pessoais */}
          <div
            className="bg-white rounded-2xl border p-6"
            style={{ borderColor: '#E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
          >
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Dados pessoais</p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Nome completo</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 transition"
                  style={{ borderColor: '#E5E7EB' }}
                  onFocus={e => { e.target.style.borderColor = '#2E7D32'; e.target.style.boxShadow = '0 0 0 3px rgba(46,125,50,0.12)' }}
                  onBlur={e => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none' }}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">CPF</label>
                  <input
                    type="text"
                    value={form.cpf}
                    onChange={e => setForm(f => ({ ...f, cpf: e.target.value }))}
                    placeholder="000.000.000-00"
                    className="w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none transition"
                    style={{ borderColor: '#E5E7EB' }}
                    onFocus={e => { e.target.style.borderColor = '#2E7D32'; e.target.style.boxShadow = '0 0 0 3px rgba(46,125,50,0.12)' }}
                    onBlur={e => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none' }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Telefone</label>
                  <input
                    type="text"
                    value={form.telefone}
                    onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
                    placeholder="(81) 99999-9999"
                    className="w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none transition"
                    style={{ borderColor: '#E5E7EB' }}
                    onFocus={e => { e.target.style.borderColor = '#2E7D32'; e.target.style.boxShadow = '0 0 0 3px rgba(46,125,50,0.12)' }}
                    onBlur={e => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* PIX */}
          <div
            className="bg-white rounded-2xl border p-6"
            style={{ borderColor: '#E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Chave PIX</p>
              <span
                className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full"
                style={{ background: pixInfo.bg, color: pixInfo.text }}
              >
                {pixInfo.icon}
                {pixInfo.label}
              </span>
            </div>
            <p className="text-xs text-gray-400 mb-4">{pixInfo.desc}</p>
            <input
              type="text"
              value={form.chave_pix}
              onChange={e => setForm(f => ({ ...f, chave_pix: e.target.value }))}
              placeholder="CPF, telefone ou e-mail"
              className="w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none transition"
              style={{ borderColor: '#E5E7EB' }}
              onFocus={e => { e.target.style.borderColor = '#2E7D32'; e.target.style.boxShadow = '0 0 0 3px rgba(46,125,50,0.12)' }}
              onBlur={e => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none' }}
            />
          </div>

          {erro && (
            <div className="flex items-center gap-2 text-sm text-red-700 rounded-xl px-4 py-3" style={{ background: '#FEF2F2', border: '1px solid #FCA5A5' }}>
              <XCircle size={16} />
              {erro}
            </div>
          )}
          {sucesso && (
            <div className="flex items-center gap-2 text-sm rounded-xl px-4 py-3" style={{ background: '#E8F5E9', color: '#2E7D32', border: '1px solid #A7D7A9' }}>
              <CheckCircle size={16} />
              {sucesso}
            </div>
          )}

          <button
            type="submit"
            disabled={salvando}
            className="w-full flex items-center justify-center gap-2 py-3 text-white text-sm font-black rounded-xl transition hover:opacity-90 disabled:opacity-60"
            style={{ background: '#2E7D32' }}
          >
            <Save size={16} />
            {salvando ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </form>
      </div>
    </div>
  )
}
