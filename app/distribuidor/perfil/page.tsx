'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function PerfilPage() {
  const supabase = createClient()
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso] = useState('')
  const [erro, setErro] = useState('')

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
          nome:       profile.nome ?? '',
          cpf:        profile.cpf ?? '',
          telefone:   profile.telefone ?? '',
          chave_pix:  profile.chave_pix ?? '',
          status_pix: profile.status_pix ?? 'pendente',
        })
      }
      setDist(d)
      setCarregando(false)
    }
    carregar()
  }, [])

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
        nome:      form.nome,
        cpf:       form.cpf,
        telefone:  form.telefone,
        chave_pix: form.chave_pix,
        // Ao atualizar chave PIX, volta para aguardando validação
        status_pix: form.chave_pix ? 'aguardando_validacao' : 'pendente',
      })
      .eq('id', user.id)

    if (error) { setErro(error.message) }
    else { setSucesso('Perfil atualizado! Sua chave PIX será validada em breve.') }

    setSalvando(false)
  }

  const pixStatusInfo: Record<string, { label: string; color: string; desc: string }> = {
    pendente:             { label: 'Não cadastrada', color: 'text-gray-500', desc: 'Cadastre sua chave PIX para receber comissões.' },
    aguardando_validacao: { label: 'Aguardando validação', color: 'text-amber-600', desc: 'O administrador irá validar sua chave em breve.' },
    validado:             { label: 'Validada ✅', color: 'text-emerald-600', desc: 'Sua chave PIX está validada e pronta para receber.' },
    rejeitado:            { label: 'Rejeitada ❌', color: 'text-red-600', desc: 'Sua chave foi rejeitada. Cadastre uma nova chave válida.' },
  }
  const pixInfo = pixStatusInfo[form.status_pix] ?? pixStatusInfo.pendente

  if (carregando) return <div className="text-sm text-gray-400">Carregando...</div>

  return (
    <div className="max-w-xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Meu perfil</h1>
        <p className="text-sm text-gray-500 mt-1">Dados pessoais e chave PIX para recebimento de comissões</p>
      </div>

      {/* Info comercial (somente leitura) */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
        <h2 className="text-sm font-medium text-gray-900 mb-3">Dados comerciais</h2>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Nível</p>
            <p className="font-medium text-gray-900">nv:{dist?.nivel ?? 1}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Comissão</p>
            <p className="font-medium text-gray-900">{dist?.comissao_pct ?? 0}%</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Meta mensal</p>
            <p className="font-medium text-gray-900">
              {dist?.meta_mensal
                ? dist.meta_mensal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                : '—'}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSalvar} className="space-y-5">
        {/* Dados pessoais */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-medium text-gray-900 mb-4">Dados pessoais</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Nome completo</label>
              <input type="text" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">CPF</label>
                <input type="text" value={form.cpf} onChange={e => setForm(f => ({ ...f, cpf: e.target.value }))}
                  placeholder="000.000.000-00"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Telefone</label>
                <input type="text" value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
                  placeholder="(84) 99999-9999"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
            </div>
          </div>
        </div>

        {/* PIX */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-medium text-gray-900">Chave PIX</h2>
            <span className={`text-xs font-medium ${pixInfo.color}`}>{pixInfo.label}</span>
          </div>
          <p className="text-xs text-gray-400 mb-4">{pixInfo.desc}</p>
          <input type="text" value={form.chave_pix}
            onChange={e => setForm(f => ({ ...f, chave_pix: e.target.value }))}
            placeholder="CPF, telefone ou e-mail"
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>

        {erro && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{erro}</div>}
        {sucesso && <div className="text-sm text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-3">{sucesso}</div>}

        <button type="submit" disabled={salvando}
          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-medium rounded-lg transition">
          {salvando ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </form>
    </div>
  )
}
