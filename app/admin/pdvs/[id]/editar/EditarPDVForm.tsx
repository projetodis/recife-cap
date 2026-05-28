'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Save } from 'lucide-react'

export default function EditarPDVForm({ pdv }: { pdv: any }) {
  const supabase = createClient()
  const router   = useRouter()

  const [form, setForm] = useState({
    nome:             pdv.nome             || '',
    responsavel_nome: pdv.responsavel_nome || '',
    telefone:         pdv.telefone         || '',
    endereco:         pdv.endereco         || '',
    numero:           pdv.numero           || '',
    bairro:           pdv.bairro           || '',
    cidade:           pdv.cidade           || '',
    uf:               pdv.uf               || '',
    regiao:           pdv.regiao           || '',
    comissao_pct:     String(pdv.comissao_pct || 5),
    status:           pdv.status           || 'ativo',
  })
  const [loading, setLoading] = useState(false)
  const [erro,    setErro]    = useState('')
  const [sucesso, setSucesso] = useState('')

  function set(field: keyof typeof form, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErro('')

    const { error } = await supabase
      .from('pontos_de_venda')
      .update({
        nome:             form.nome,
        responsavel_nome: form.responsavel_nome,
        telefone:         form.telefone,
        endereco:         form.endereco,
        numero:           form.numero,
        bairro:           form.bairro,
        cidade:           form.cidade,
        uf:               form.uf,
        regiao:           form.regiao || null,
        comissao_pct:     parseFloat(form.comissao_pct),
        status:           form.status,
      })
      .eq('id', pdv.id)

    setLoading(false)
    if (error) {
      setErro(error.message)
    } else {
      setSucesso('PDV atualizado com sucesso!')
      setTimeout(() => router.push('/admin/pdvs'), 1200)
    }
  }

  function Campo({
    label, field, type = 'text', full = false,
  }: {
    label: string; field: keyof typeof form; type?: string; full?: boolean
  }) {
    return (
      <div className={full ? 'col-span-2' : ''}>
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
          {label}
        </label>
        <input
          type={type}
          value={form[field]}
          onChange={e => set(field, e.target.value)}
          className="w-full px-4 py-3 rounded-xl border text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          style={{ borderColor: '#E5E7EB' }}
        />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="bg-white rounded-2xl border p-6 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-4">Dados do PDV</h3>
        <div className="grid grid-cols-2 gap-4">
          <Campo label="Nome do estabelecimento" field="nome"             full />
          <Campo label="Responsável"             field="responsavel_nome" />
          <Campo label="Telefone"                field="telefone"         />
          <Campo label="Endereço"                field="endereco"         full />
          <Campo label="Número"                  field="numero"           />
          <Campo label="Bairro"                  field="bairro"           />
          <Campo label="Cidade"                  field="cidade"           />
          <Campo label="UF"                      field="uf"               />
          <Campo label="Região / Zona"           field="regiao"           />
          <Campo label="Comissão (%)"            field="comissao_pct"     type="number" />
        </div>

        <div className="mt-4">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
            Status
          </label>
          <select
            value={form.status}
            onChange={e => set('status', e.target.value)}
            className="w-full px-4 py-3 rounded-xl border text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            style={{ borderColor: '#E5E7EB' }}
          >
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
          </select>
        </div>
      </div>

      {erro && (
        <div className="p-4 rounded-xl text-sm text-red-600 bg-red-50 border border-red-100">
          {erro}
        </div>
      )}
      {sucesso && (
        <div className="p-4 rounded-xl text-sm font-medium" style={{ background: '#E8F5E9', color: '#2E7D32' }}>
          {sucesso}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-5 py-3 rounded-xl border font-bold text-gray-600 hover:bg-gray-50 text-sm"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white text-sm disabled:opacity-50"
          style={{ background: '#2E7D32' }}
        >
          <Save size={16} />
          {loading ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </div>
    </form>
  )
}
