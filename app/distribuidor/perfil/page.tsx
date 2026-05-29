'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Save, CheckCircle, XCircle, User, DollarSign } from 'lucide-react'

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

  async function handleSalvar() {
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

  if (carregando) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <p className="text-sm text-gray-400">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="max-w-lg space-y-6">

      <div>
        <h1 className="text-2xl font-black text-gray-900">Meu Perfil</h1>
        <p className="text-sm text-gray-500 mt-1">Gerencie seus dados e chave PIX</p>
      </div>

      {/* Avatar + resumo */}
      <div className="bg-white rounded-2xl border p-6 shadow-sm flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #1B5E20, #2E7D32)' }}>
          {form.nome?.charAt(0)?.toUpperCase() || 'D'}
        </div>
        <div>
          <p className="font-black text-gray-900 text-lg">{form.nome || 'Distribuidor'}</p>
          <p className="text-sm text-gray-500">Distribuidor nv.{dist?.nivel || 1}</p>
          <span
            className="inline-flex items-center gap-1 mt-1 text-xs px-2 py-0.5 rounded-full font-bold"
            style={{
              background: form.status_pix === 'validado'             ? '#E8F5E9'
                        : form.status_pix === 'aguardando_validacao'  ? '#E3F2FD'
                        : '#FFF8E1',
              color:      form.status_pix === 'validado'             ? '#2E7D32'
                        : form.status_pix === 'aguardando_validacao'  ? '#1565C0'
                        : '#B45309',
            }}
          >
            {form.status_pix === 'validado'             ? 'PIX validado'
             : form.status_pix === 'aguardando_validacao' ? 'PIX em análise'
             : 'PIX pendente'}
          </span>
        </div>
      </div>

      {/* Dados pessoais */}
      <div className="bg-white rounded-2xl border p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <User size={16} style={{ color: '#2E7D32' }} />
          Dados pessoais
        </h3>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Nome completo</label>
          <input
            type="text"
            value={form.nome}
            onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
            className="w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition"
            style={{ borderColor: '#E5E7EB' }}
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
              className="w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition"
              style={{ borderColor: '#E5E7EB' }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Telefone</label>
            <input
              type="text"
              value={form.telefone}
              onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
              placeholder="(81) 99999-9999"
              className="w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition"
              style={{ borderColor: '#E5E7EB' }}
            />
          </div>
        </div>
      </div>

      {/* Chave PIX */}
      <div className="bg-white rounded-2xl border p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <DollarSign size={16} style={{ color: '#2E7D32' }} />
          Chave PIX para receber comissões
        </h3>
        <input
          type="text"
          value={form.chave_pix}
          onChange={e => setForm(f => ({ ...f, chave_pix: e.target.value }))}
          placeholder="CPF, telefone ou e-mail"
          className="w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition"
          style={{ borderColor: '#E5E7EB' }}
        />
      </div>

      {/* Feedback */}
      {erro && (
        <div className="flex items-center gap-2 text-sm text-red-700 rounded-xl px-4 py-3"
          style={{ background: '#FEF2F2', border: '1px solid #FCA5A5' }}>
          <XCircle size={16} />
          {erro}
        </div>
      )}
      {sucesso && (
        <div className="flex items-center gap-2 text-sm rounded-xl px-4 py-3"
          style={{ background: '#E8F5E9', color: '#2E7D32', border: '1px solid #A7D7A9' }}>
          <CheckCircle size={16} />
          {sucesso}
        </div>
      )}

      <button
        onClick={handleSalvar}
        disabled={salvando}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg, #1B5E20, #2E7D32)' }}
      >
        <Save size={18} />
        {salvando ? 'Salvando...' : 'Salvar alterações'}
      </button>

    </div>
  )
}
