'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NovoMotoboyPage() {
  const router = useRouter()
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  const [form, setForm] = useState({
    nome: '', email: '', senha: '',
    telefone: '', veiculo: 'moto', placa: '',
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setCarregando(true)

    try {
      const res = await fetch('/api/distribuidor/criar-motoboy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      setSucesso('Motoboy cadastrado com sucesso!')
      setTimeout(() => router.push('/distribuidor/motoboys'), 1200)
    } catch (err: any) {
      setErro(err.message)
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="max-w-xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Cadastrar motoboy</h1>
        <p className="text-sm text-gray-500 mt-1">O motoboy terá acesso apenas às rotas de entrega</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-medium text-gray-900 mb-4">Dados pessoais</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1.5">Nome completo *</label>
              <input type="text" value={form.nome} onChange={e => set('nome', e.target.value)} required placeholder="Nome do entregador"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Telefone</label>
              <input type="text" value={form.telefone} onChange={e => set('telefone', e.target.value)} placeholder="(84) 99999-9999"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Veículo</label>
              <select value={form.veiculo} onChange={e => set('veiculo', e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="moto">🏍️ Moto</option>
                <option value="bicicleta">🚲 Bicicleta</option>
                <option value="carro">🚗 Carro</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1.5">Placa (opcional)</label>
              <input type="text" value={form.placa} onChange={e => set('placa', e.target.value.toUpperCase())} placeholder="ABC-1234"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-medium text-gray-900 mb-1">Acesso ao app</h2>
          <p className="text-xs text-gray-400 mb-4">O motoboy terá acesso <strong>somente às rotas</strong> — sem dados financeiros</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">E-mail *</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} required placeholder="email@exemplo.com"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Senha *</label>
              <input type="password" value={form.senha} onChange={e => set('senha', e.target.value)} required minLength={8} placeholder="Mínimo 8 caracteres"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-700">
          🛵 O motoboy verá apenas: rotas do dia, endereços dos PDVs, quantidade de cartelas a entregar e navegação. <strong>Sem acesso a valores, comissões ou dados financeiros.</strong>
        </div>

        {erro && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{erro}</div>}
        {sucesso && <div className="text-sm text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-3">{sucesso}</div>}

        <div className="flex gap-3">
          <button type="button" onClick={() => router.back()}
            className="px-4 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
            Cancelar
          </button>
          <button type="submit" disabled={carregando}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-medium rounded-lg transition">
            {carregando ? 'Cadastrando...' : 'Cadastrar motoboy'}
          </button>
        </div>
      </form>
    </div>
  )
}
