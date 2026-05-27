'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { GripVertical, Trophy, Trash2, Plus, ArrowLeft, Save } from 'lucide-react'

interface Premio {
  id: string
  edicao_id: string
  ordem: number
  nome: string
  valor: string
  quantidade: number
  foto_url: string | null
  ativo: boolean
  destaque: boolean
}

export default function PremiosEdicaoPage() {
  const { id: edicaoId } = useParams<{ id: string }>()
  const router = useRouter()

  const [premios,    setPremios]    = useState<Premio[]>([])
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState<string | null>(null)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [edicaoNum,  setEdicaoNum]  = useState<number | null>(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    const res  = await fetch(`/api/admin/premios?edicao_id=${edicaoId}`)
    const data = await res.json()
    setPremios(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [edicaoId])

  useEffect(() => {
    carregar()
    // busca número da edição para exibir no título
    fetch(`/api/cliente/sorteio-ativo`)
      .then(r => r.json())
      .then(d => { if (d.edicao?.numero) setEdicaoNum(d.edicao.numero) })
      .catch(() => {})
  }, [carregar])

  function atualizar(id: string, changes: Partial<Premio>) {
    setPremios(prev => prev.map(p => p.id === id ? { ...p, ...changes } : p))
  }

  async function salvar(premio: Premio) {
    setSaving(premio.id)
    await fetch('/api/admin/premios', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id:         premio.id,
        nome:       premio.nome,
        valor:      premio.valor,
        quantidade: premio.quantidade,
        ativo:      premio.ativo,
        destaque:   premio.destaque,
        ordem:      premio.ordem,
      }),
    })
    setSaving(null)
  }

  async function adicionarPremio() {
    const res = await fetch('/api/admin/premios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        edicao_id:  edicaoId,
        nome:       'Novo prêmio',
        valor:      '0',
        quantidade: 1,
        ordem:      premios.length,
        ativo:      true,
        destaque:   false,
      }),
    })
    const novo = await res.json()
    if (novo?.id) setPremios(prev => [...prev, novo])
  }

  async function deletarPremio(id: string) {
    if (!confirm('Remover este prêmio?')) return
    setPremios(prev => prev.filter(p => p.id !== id))
    await fetch('/api/admin/premios', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
  }

  async function uploadFoto(premioId: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingId(premioId)

    const form = new FormData()
    form.append('file', file)
    form.append('chave', `premio-${premioId}`)

    const res  = await fetch('/api/admin/upload', { method: 'POST', body: form })
    const data = await res.json()

    if (data.url) {
      atualizar(premioId, { foto_url: data.url })
      await fetch('/api/admin/premios', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: premioId, foto_url: data.url }),
      })
    }
    setUploadingId(null)
    e.target.value = ''
  }

  async function moverOrdem(id: string, direcao: 'up' | 'down') {
    const idx = premios.findIndex(p => p.id === id)
    if (direcao === 'up'   && idx === 0) return
    if (direcao === 'down' && idx === premios.length - 1) return

    const novaLista = [...premios]
    const swap = direcao === 'up' ? idx - 1 : idx + 1
    ;[novaLista[idx], novaLista[swap]] = [novaLista[swap], novaLista[idx]]

    const comOrdem = novaLista.map((p, i) => ({ ...p, ordem: i }))
    setPremios(comOrdem)

    // persiste ordens
    await Promise.all(
      comOrdem.map(p =>
        fetch('/api/admin/premios', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: p.id, ordem: p.ordem }),
        }),
      ),
    )
  }

  return (
    <div className="max-w-4xl mx-auto">

      {/* Cabeçalho */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.push('/admin/edicoes')}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Prêmios {edicaoNum ? `— Edição ${edicaoNum}` : ''}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">Gerencie os prêmios exibidos na landing page e na tela de sorteio</p>
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 h-24 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {premios.map((premio, idx) => (
            <div key={premio.id}
              className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4 hover:border-gray-200 transition-colors">

              {/* Reordenar */}
              <div className="flex flex-col gap-1">
                <button onClick={() => moverOrdem(premio.id, 'up')}
                  disabled={idx === 0}
                  className="text-gray-300 hover:text-gray-500 disabled:opacity-20 transition-colors text-xs leading-none">
                  ▲
                </button>
                <GripVertical size={16} className="text-gray-200 mx-auto" />
                <button onClick={() => moverOrdem(premio.id, 'down')}
                  disabled={idx === premios.length - 1}
                  className="text-gray-300 hover:text-gray-500 disabled:opacity-20 transition-colors text-xs leading-none">
                  ▼
                </button>
              </div>

              {/* Preview foto */}
              <div className="w-20 h-16 rounded-xl overflow-hidden bg-gray-900 flex items-center justify-center flex-shrink-0">
                {premio.foto_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={premio.foto_url} alt={premio.nome} className="w-full h-full object-contain" />
                ) : (
                  <Trophy size={22} className="text-gray-500" />
                )}
              </div>

              {/* Upload foto */}
              <label className="cursor-pointer text-xs font-semibold flex-shrink-0 transition-colors"
                style={{ color: uploadingId === premio.id ? '#9CA3AF' : '#2E7D32' }}>
                {uploadingId === premio.id ? 'Enviando…' : 'Trocar foto'}
                <input type="file" accept="image/*" className="hidden"
                  disabled={uploadingId === premio.id}
                  onChange={e => uploadFoto(premio.id, e)} />
              </label>

              {/* Campos */}
              <div className="flex-1 grid grid-cols-2 gap-3 min-w-0">
                <div>
                  <label className="text-xs text-gray-400 font-medium block mb-1">Nome</label>
                  <input
                    value={premio.nome}
                    onChange={e => atualizar(premio.id, { nome: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 font-medium block mb-1">Valor (ex: 5.000)</label>
                  <input
                    value={premio.valor}
                    onChange={e => atualizar(premio.id, { valor: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 font-medium block mb-1">Quantidade</label>
                  <input
                    type="number" min={1}
                    value={premio.quantidade}
                    onChange={e => atualizar(premio.id, { quantidade: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <div className="flex items-center gap-4 pt-4">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={premio.destaque}
                      onChange={e => atualizar(premio.id, { destaque: e.target.checked })}
                      className="w-4 h-4 accent-[#FFC107] rounded" />
                    <span className="text-xs font-medium text-gray-600">Destaque</span>
                  </label>
                </div>
              </div>

              {/* Ativo toggle */}
              <button
                onClick={() => atualizar(premio.id, { ativo: !premio.ativo })}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex-shrink-0 ${
                  premio.ativo
                    ? 'bg-emerald-50 text-emerald-700 hover:bg-red-50 hover:text-red-600'
                    : 'bg-gray-100 text-gray-400 hover:bg-emerald-50 hover:text-emerald-600'
                }`}>
                {premio.ativo ? 'Ativo' : 'Inativo'}
              </button>

              {/* Salvar */}
              <button
                onClick={() => salvar(premio)}
                disabled={saving === premio.id}
                className="p-2 rounded-xl transition-colors flex-shrink-0 text-emerald-600 hover:bg-emerald-50 disabled:opacity-40"
                title="Salvar">
                <Save size={16} />
              </button>

              {/* Deletar */}
              <button
                onClick={() => deletarPremio(premio.id)}
                className="p-2 rounded-xl text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0"
                title="Remover">
                <Trash2 size={16} />
              </button>
            </div>
          ))}

          {/* Adicionar */}
          <button onClick={adicionarPremio}
            className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 hover:border-emerald-400 hover:text-emerald-600 transition-all flex items-center justify-center gap-2 font-medium text-sm">
            <Plus size={18} />
            Adicionar prêmio
          </button>
        </div>
      )}

      {premios.length > 0 && (
        <p className="text-xs text-gray-400 mt-4 text-center">
          Use os botões ▲▼ para reordenar · clique em <strong>Salvar</strong> para persistir alterações de texto
        </p>
      )}
    </div>
  )
}
