'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function NovaEdicaoPage() {
  const router = useRouter()
  const supabase = createClient()
  const [carregando, setCarregando] = useState(false)
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [progresso, setProgresso] = useState('')

  const [form, setForm] = useState({
    numero: '',
    descricao: '',
    data_sorteio: '',
    hora_sorteio: '09:00',
    valor_unitario: '10.00',
    total_cartelas: '100000',
    premio_principal: '120000',
    premios_extras: [
      { descricao: '1º Sorteio', valor: '5000', quantidade: '1' },
      { descricao: '2º Sorteio', valor: '5000', quantidade: '1' },
      { descricao: '3º Sorteio', valor: '5000', quantidade: '1' },
      { descricao: '4º Sorteio', valor: '5000', quantidade: '1' },
      { descricao: 'Giro da Sorte (30 prêmios)', valor: '1000', quantidade: '30' },
      { descricao: 'Giro Extra', valor: '5000', quantidade: '1' },
    ],
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function setPremiExtra(idx: number, field: string, value: string) {
    setForm(f => {
      const extras = [...f.premios_extras]
      extras[idx] = { ...extras[idx], [field]: value }
      return { ...f, premios_extras: extras }
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setCarregando(true)

    try {
      // 1. Cria a edição
      const { data: edicao, error: edicaoError } = await supabase
        .from('edicoes')
        .insert({
          numero:          parseInt(form.numero),
          descricao:       form.descricao || `Recife Cap Ed. ${form.numero}`,
          data_sorteio:    form.data_sorteio,
          hora_sorteio:    form.hora_sorteio,
          valor_unitario:  parseFloat(form.valor_unitario),
          total_cartelas:  parseInt(form.total_cartelas),
          premio_principal: parseFloat(form.premio_principal),
          status:          'rascunho',
        })
        .select()
        .single()

      if (edicaoError) throw new Error(edicaoError.message)

      // 2. Cria os prêmios extras
      const premiosData = form.premios_extras
        .filter(p => p.descricao && p.valor)
        .map(p => ({
          edicao_id:   edicao.id,
          descricao:   p.descricao,
          valor:       parseFloat(p.valor),
          quantidade:  parseInt(p.quantidade),
          tipo:        'sorteio',
        }))

      if (premiosData.length > 0) {
        await supabase.from('premios_edicao').insert(premiosData)
      }

      setSucesso('Edição criada! Agora gere as cartelas.')
      setCarregando(false)

      // 3. Gera as cartelas automaticamente
      setGerando(true)
      setProgresso('Gerando cartelas... isso pode levar alguns segundos.')

      const res = await fetch('/api/admin/gerar-cartelas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          edicao_id: edicao.id,
          total: parseInt(form.total_cartelas),
          numero_edicao: parseInt(form.numero),
        }),
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error)

      setProgresso(`✅ ${result.total} cartelas geradas com sucesso!`)
      setTimeout(() => router.push('/admin/edicoes'), 2000)

    } catch (err: any) {
      setErro(err.message)
    } finally {
      setCarregando(false)
      setGerando(false)
    }
  }

  const totalPremios = form.premios_extras.reduce((acc, p) => {
    return acc + (parseFloat(p.valor || '0') * parseInt(p.quantidade || '1'))
  }, 0) + parseFloat(form.premio_principal || '0')

  const receitaBruta = parseFloat(form.valor_unitario || '0') * parseInt(form.total_cartelas || '0')

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Nova edição</h1>
        <p className="text-sm text-gray-500 mt-1">As cartelas serão geradas automaticamente após salvar</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Dados da edição */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-medium text-gray-900 mb-4">Dados da edição</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Número da edição *</label>
              <input type="number" value={form.numero} onChange={e => set('numero', e.target.value)}
                placeholder="Ex: 346" required min="1"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Descrição</label>
              <input type="text" value={form.descricao} onChange={e => set('descricao', e.target.value)}
                placeholder="Recife Cap Ed. 346"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Data do sorteio *</label>
              <input type="date" value={form.data_sorteio} onChange={e => set('data_sorteio', e.target.value)}
                required
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Hora do sorteio</label>
              <input type="time" value={form.hora_sorteio} onChange={e => set('hora_sorteio', e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          </div>
        </div>

        {/* Configuração do lote */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-medium text-gray-900 mb-4">Lote de cartelas</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Total de cartelas *</label>
              <input type="number" value={form.total_cartelas} onChange={e => set('total_cartelas', e.target.value)}
                required min="1" max="999999"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Valor unitário (R$) *</label>
              <input type="number" value={form.valor_unitario} onChange={e => set('valor_unitario', e.target.value)}
                required min="0.01" step="0.01"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          </div>
          {/* Resumo financeiro */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-600 flex justify-between">
            <span>Receita bruta estimada:</span>
            <span className="font-medium text-gray-900">
              {receitaBruta.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
        </div>

        {/* Premiação */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-medium text-gray-900 mb-4">Premiação</h2>
          <div className="mb-4">
            <label className="block text-xs text-gray-500 mb-1.5">Prêmio principal (R$)</label>
            <input type="number" value={form.premio_principal} onChange={e => set('premio_principal', e.target.value)}
              min="0"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <p className="text-xs text-gray-400 mb-3">Prêmios extras</p>
          <div className="space-y-2">
            {form.premios_extras.map((p, i) => (
              <div key={i} className="grid grid-cols-5 gap-2 items-center">
                <input type="text" value={p.descricao} onChange={e => setPremiExtra(i, 'descricao', e.target.value)}
                  placeholder="Nome do prêmio" className="col-span-2 px-2.5 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                <input type="number" value={p.valor} onChange={e => setPremiExtra(i, 'valor', e.target.value)}
                  placeholder="Valor R$" className="px-2.5 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                <input type="number" value={p.quantidade} onChange={e => setPremiExtra(i, 'quantidade', e.target.value)}
                  placeholder="Qtd" min="1" className="px-2.5 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                <span className="text-xs text-gray-500 text-right">
                  {(parseFloat(p.valor || '0') * parseInt(p.quantidade || '1')).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-sm">
            <span className="text-gray-500">Total em prêmios</span>
            <span className="font-semibold text-emerald-600">
              {totalPremios.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
        </div>

        {/* Progresso da geração */}
        {gerando && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
              <p className="text-sm text-blue-700">{progresso}</p>
            </div>
          </div>
        )}

        {sucesso && !gerando && (
          <div className="text-sm text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-3">
            {progresso || sucesso}
          </div>
        )}

        {erro && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{erro}</div>
        )}

        <div className="flex gap-3">
          <button type="button" onClick={() => router.back()}
            className="px-4 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
            Cancelar
          </button>
          <button type="submit" disabled={carregando || gerando}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-medium rounded-lg transition">
            {carregando ? 'Salvando...' : gerando ? 'Gerando cartelas...' : 'Criar edição e gerar cartelas'}
          </button>
        </div>
      </form>
    </div>
  )
}
