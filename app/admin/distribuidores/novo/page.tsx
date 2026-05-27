'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function NovoDistribuidorPage() {
  const router = useRouter()
  const supabase = createClient()

  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  const [form, setForm] = useState({
    nome: '',
    email: '',
    senha: '',
    cpf: '',
    telefone: '',
    chave_pix: '',
    nivel: '1',
    comissao_pct: '15',
    meta_mensal: '',
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function formatCPF(value: string) {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .slice(0, 14)
  }

  function formatTelefone(value: string) {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .slice(0, 15)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setSucesso('')
    setCarregando(true)

    try {
      // 1. Cria o usuário no Supabase Auth com role = distribuidor
      const { data: authData, error: authError } = await supabase.auth.admin
        ? // Admin API não disponível no client, usar signUp
          { data: null, error: new Error('use-server') }
        : { data: null, error: new Error('use-server') }

      // Usa a API do servidor via fetch
      const res = await fetch('/api/admin/criar-usuario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          senha: form.senha,
          role: 'distribuidor',
          nome: form.nome,
          cpf: form.cpf,
          telefone: form.telefone,
          chave_pix: form.chave_pix,
          nivel: parseInt(form.nivel),
          comissao_pct: parseFloat(form.comissao_pct),
          meta_mensal: form.meta_mensal ? parseFloat(form.meta_mensal) : null,
        }),
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error ?? 'Erro ao cadastrar distribuidor')
      }

      setSucesso('Distribuidor cadastrado com sucesso!')
      setTimeout(() => router.push('/admin/distribuidores'), 1500)

    } catch (err: any) {
      setErro(err.message ?? 'Erro inesperado')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Cadastrar distribuidor</h1>
        <p className="text-sm text-gray-500 mt-1">Preencha os dados do novo distribuidor</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Dados pessoais */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-medium text-gray-900 mb-4">Dados pessoais</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1.5">Nome completo *</label>
              <input
                type="text"
                value={form.nome}
                onChange={e => set('nome', e.target.value)}
                placeholder="Nome do distribuidor"
                required
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">CPF *</label>
              <input
                type="text"
                value={form.cpf}
                onChange={e => set('cpf', formatCPF(e.target.value))}
                placeholder="000.000.000-00"
                required
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Telefone *</label>
              <input
                type="text"
                value={form.telefone}
                onChange={e => set('telefone', formatTelefone(e.target.value))}
                placeholder="(84) 99999-9999"
                required
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1.5">Chave PIX</label>
              <input
                type="text"
                value={form.chave_pix}
                onChange={e => set('chave_pix', e.target.value)}
                placeholder="CPF, telefone ou e-mail"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Acesso ao sistema */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-medium text-gray-900 mb-4">Acesso ao sistema</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">E-mail de acesso *</label>
              <input
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="email@exemplo.com"
                required
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Senha inicial *</label>
              <input
                type="password"
                value={form.senha}
                onChange={e => set('senha', e.target.value)}
                placeholder="Mínimo 8 caracteres"
                minLength={8}
                required
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Configurações comerciais */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-medium text-gray-900 mb-4">Configurações comerciais</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Nível</label>
              <select
                value={form.nivel}
                onChange={e => set('nivel', e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {[1,2,3,4,5].map(n => (
                  <option key={n} value={n}>Nível {n}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Comissão (%)</label>
              <input
                type="number"
                value={form.comissao_pct}
                onChange={e => set('comissao_pct', e.target.value)}
                min="0"
                max="100"
                step="0.5"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Meta mensal (R$)</label>
              <input
                type="number"
                value={form.meta_mensal}
                onChange={e => set('meta_mensal', e.target.value)}
                placeholder="Opcional"
                min="0"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {erro && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
            {erro}
          </div>
        )}

        {sucesso && (
          <div className="text-sm text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-3">
            {sucesso}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={carregando}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-medium rounded-lg transition"
          >
            {carregando ? 'Cadastrando...' : 'Cadastrar distribuidor'}
          </button>
        </div>
      </form>
    </div>
  )
}
