'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Layout, Save, Plus, Trash2, Camera, Eye, EyeOff,
  Upload, ChevronUp, ChevronDown, Star, Image as ImageIcon,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Depoimento {
  id: string
  nome: string
  cidade: string
  premio: string
  sorteio: string
  depoimento: string
  foto_url: string | null
  ativo: boolean
  ordem: number
}

type Section =
  | 'hero'
  | 'sorteio'
  | 'sobre'
  | 'como'
  | 'premios'
  | 'historico'
  | 'depoimentos'
  | 'rodape'

const SECTIONS: { id: Section; label: string; desc: string }[] = [
  { id: 'hero',        label: 'Hero',                 desc: 'Imagens, título e botões' },
  { id: 'sorteio',     label: 'Sorteio da Semana',    desc: 'Textos do sorteio' },
  { id: 'sobre',       label: 'Quem Somos',           desc: 'Texto e imagem da seção' },
  { id: 'como',        label: 'Como Participar',       desc: '4 passos explicativos' },
  { id: 'premios',     label: 'Prêmios da Edição',    desc: 'Via Edições → Prêmios' },
  { id: 'historico',   label: 'Histórico',             desc: 'Textos dos resultados' },
  { id: 'depoimentos', label: 'Depoimentos',           desc: 'Carrossel de ganhadores' },
  { id: 'rodape',      label: 'Rodapé',                desc: 'Contato e redes sociais' },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function Field({
  label, value, onChange, multiline = false, placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  multiline?: boolean
  placeholder?: string
}) {
  const cls = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-400 bg-white'
  return (
    <div>
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">{label}</label>
      {multiline ? (
        <textarea rows={3} value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} className={cls + ' resize-none'} />
      ) : (
        <input value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} className={cls} />
      )}
    </div>
  )
}

function SaveBtn({ saving, onClick }: { saving: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={saving}
      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition">
      <Save size={14} />
      {saving ? 'Salvando…' : 'Salvar alterações'}
    </button>
  )
}

// ─── Section: Hero ────────────────────────────────────────────────────────────

function SectionHero({ localConfigs, onChange, uploadingKey, uploadMidia }: {
  localConfigs: Record<string, string>
  onChange: (chave: string, valor: string) => void
  uploadingKey: string | null
  uploadMidia: (chave: string, e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
}) {
  const mediaFields = [
    { chave: 'logo_url',                   label: 'Logo principal',               hint: 'PNG transparente, 400×400px' },
    { chave: 'fundo_hero_url',             label: 'Fundo hero — Desktop',         hint: 'JPG/PNG, 1920×1080px landscape' },
    { chave: 'fundo_hero_mobile_url',      label: 'Fundo hero — Mobile',          hint: 'JPG/PNG, 800×1600px portrait' },
    { chave: 'banner_sorteio_mobile_url',  label: 'Banner sorteio — Mobile',      hint: 'JPG/PNG, 800×400px' },
  ]
  const textFields = [
    { chave: 'nome_sistema',         label: 'Nome do sistema',        placeholder: 'RECIFE CAP' },
    { chave: 'hero_titulo',          label: 'Título do hero',         placeholder: 'RECIFE CAP' },
    { chave: 'hero_badge',           label: 'Texto do badge hero',    placeholder: 'FILANTROPIA PREMIÁVEL' },
    { chave: 'hero_subtitulo',       label: 'Subtítulo do hero',      placeholder: 'Participe e concorra a prêmios incríveis toda semana' },
    { chave: 'slogan',               label: 'Slogan (geral)',          placeholder: 'FILANTROPIA PREMIÁVEL' },
    { chave: 'texto_btn_principal',  label: 'Botão principal',        placeholder: 'Quero participar →' },
    { chave: 'texto_btn_secundario', label: 'Botão secundário',       placeholder: 'Ver sorteio' },
  ]

  return (
    <div className="space-y-5">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Imagens</p>
      {mediaFields.map(({ chave, label, hint }) => (
        <div key={chave} className="border-2 border-dashed border-gray-200 rounded-2xl p-5 hover:border-emerald-300 transition-colors">
          <div className="flex items-center gap-4">
            <div className="w-20 h-16 rounded-xl overflow-hidden bg-gray-900 flex items-center justify-center flex-shrink-0">
              {localConfigs[chave] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={localConfigs[chave]} alt={label} className="w-full h-full object-contain" />
              ) : (
                <ImageIcon size={20} className="text-gray-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800 text-sm">{label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{hint}</p>
              <label className="mt-2 inline-flex items-center gap-1.5 cursor-pointer bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-emerald-800 transition-colors">
                <Upload size={12} />
                {uploadingKey === chave ? 'Enviando…' : 'Alterar'}
                <input type="file" accept="image/*" className="hidden"
                  disabled={uploadingKey === chave}
                  onChange={e => uploadMidia(chave, e)} />
              </label>
            </div>
          </div>
        </div>
      ))}

      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-1">Textos</p>
      {textFields.map(({ chave, label, placeholder }) => (
        <Field key={chave} label={label}
          value={localConfigs[chave] ?? ''}
          onChange={v => onChange(chave, v)}
          placeholder={placeholder} />
      ))}
      <p className="text-xs text-gray-400">
        As alterações ficam visíveis no preview ao lado. Clique em <strong>Publicar</strong> para salvar.
      </p>
    </div>
  )
}

// ─── Section: Sorteio da Semana ───────────────────────────────────────────────

function SectionSorteio({ configs, onChange, onSave, saving }: {
  configs: Record<string, string>
  onChange: (chave: string, valor: string) => void
  onSave: () => void
  saving: boolean
}) {
  return (
    <div className="space-y-4">
      <Field label="Título da seção" value={configs['sorteio_titulo'] ?? ''} onChange={v => onChange('sorteio_titulo', v)} placeholder="Sorteio da Semana" />
      <Field label="Subtítulo / chamada" value={configs['sorteio_subtitulo'] ?? ''} onChange={v => onChange('sorteio_subtitulo', v)} placeholder="Prêmio acumulado desta edição" />
      <Field label="Texto de chamada para ação" value={configs['sorteio_cta'] ?? ''} onChange={v => onChange('sorteio_cta', v)} placeholder="Garanta já sua cartela!" />
      <div className="grid grid-cols-2 gap-4">
        <Field label="Dia da semana" value={configs['sorteio_dia_semana'] ?? ''} onChange={v => onChange('sorteio_dia_semana', v)} placeholder="Sábado" />
        <Field label="Horário" value={configs['sorteio_horario'] ?? ''} onChange={v => onChange('sorteio_horario', v)} placeholder="09h00" />
      </div>
      <p className="text-xs text-gray-400">
        O valor exato do prêmio é puxado automaticamente da edição ativa em <strong>Edições</strong>. O dia e horário aqui sobrescrevem o texto padrão exibido no site.
      </p>
      <div className="pt-2 flex justify-end">
        <SaveBtn saving={saving} onClick={onSave} />
      </div>
    </div>
  )
}

// ─── Section: Quem Somos ─────────────────────────────────────────────────────

function SectionSobre({ localConfigs, onChange, uploadingKey, uploadMidia }: {
  localConfigs: Record<string, string>
  onChange: (chave: string, valor: string) => void
  uploadingKey: string | null
  uploadMidia: (chave: string, e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
}) {
  return (
    <div className="space-y-5">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Imagem</p>
      <div className="border-2 border-dashed border-gray-200 rounded-2xl p-5 hover:border-emerald-300 transition-colors">
        <div className="flex items-center gap-4">
          <div className="w-20 h-16 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0">
            {localConfigs['cartela_imagem_url'] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={localConfigs['cartela_imagem_url']} alt="Cartela" className="w-full h-full object-contain" />
            ) : (
              <ImageIcon size={20} className="text-gray-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-800 text-sm">Imagem da cartela</p>
            <p className="text-xs text-gray-400 mt-0.5">PNG/JPG, ideal 900×500px</p>
            <label className="mt-2 inline-flex items-center gap-1.5 cursor-pointer bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-emerald-800 transition-colors">
              <Upload size={12} />
              {uploadingKey === 'cartela_imagem_url' ? 'Enviando…' : 'Alterar'}
              <input type="file" accept="image/*" className="hidden"
                disabled={uploadingKey === 'cartela_imagem_url'}
                onChange={e => uploadMidia('cartela_imagem_url', e)} />
            </label>
          </div>
        </div>
      </div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-1">Textos</p>
      <Field label="Título da seção"
        value={localConfigs['sobre_titulo'] ?? ''}
        onChange={v => onChange('sobre_titulo', v)}
        placeholder="Quem Somos" />
      <Field label="Texto principal"
        value={localConfigs['sobre_texto'] ?? ''}
        onChange={v => onChange('sobre_texto', v)}
        multiline placeholder="Somos uma organização filantrópica…" />
      <Field label="Hospital / instituição beneficiada"
        value={localConfigs['sobre_hospital'] ?? ''}
        onChange={v => onChange('sobre_hospital', v)}
        placeholder="Hospital da Criança de Recife" />
      <Field label="Títulos emitidos por edição"
        value={localConfigs['sobre_titulos_edicao'] ?? ''}
        onChange={v => onChange('sobre_titulos_edicao', v)}
        placeholder="10.000 títulos por edição" />
      <p className="text-xs text-gray-400">
        As alterações ficam visíveis no preview ao lado. Clique em <strong>Publicar</strong> para salvar.
      </p>
    </div>
  )
}

// ─── Section: Como Participar ─────────────────────────────────────────────────

function SectionComo({ configs, onChange, onSave, saving }: {
  configs: Record<string, string>
  onChange: (chave: string, valor: string) => void
  onSave: () => void
  saving: boolean
}) {
  return (
    <div className="space-y-5">
      <Field label="Título da seção" value={configs['como_titulo'] ?? ''} onChange={v => onChange('como_titulo', v)} placeholder="Como Participar" />
      {[1, 2, 3, 4].map(n => (
        <div key={n} className="border border-gray-100 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-emerald-700">Passo {n}</p>
          <Field label="Título" value={configs[`como_passo${n}_titulo`] ?? ''} onChange={v => onChange(`como_passo${n}_titulo`, v)} placeholder={`Passo ${n}`} />
          <Field label="Descrição" value={configs[`como_passo${n}_desc`] ?? ''} onChange={v => onChange(`como_passo${n}_desc`, v)} multiline placeholder="Descreva este passo…" />
        </div>
      ))}
      <div className="pt-2 flex justify-end">
        <SaveBtn saving={saving} onClick={onSave} />
      </div>
    </div>
  )
}

// ─── Section: Prêmios (informativo) ──────────────────────────────────────────

function SectionPremios() {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
      <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
        <Star size={22} className="text-amber-600" />
      </div>
      <h3 className="font-semibold text-amber-800 mb-1">Prêmios gerenciados por edição</h3>
      <p className="text-sm text-amber-700 max-w-md mx-auto">
        Acesse <strong>Edições → selecione a edição → Prêmios</strong> para adicionar, editar e reordenar prêmios.
      </p>
    </div>
  )
}

// ─── Section: Histórico ───────────────────────────────────────────────────────

function SectionHistorico({ configs, onChange, onSave, saving }: {
  configs: Record<string, string>
  onChange: (chave: string, valor: string) => void
  onSave: () => void
  saving: boolean
}) {
  return (
    <div className="space-y-4">
      <Field label="Título da seção" value={configs['historico_titulo'] ?? ''} onChange={v => onChange('historico_titulo', v)} placeholder="Histórico de Sorteios" />
      <Field label="Subtítulo" value={configs['historico_subtitulo'] ?? ''} onChange={v => onChange('historico_subtitulo', v)} placeholder="Confira os ganhadores das últimas edições" />
      <p className="text-xs text-gray-400">
        Os resultados são puxados automaticamente das edições com status <strong>Encerrada</strong>.
      </p>
      <div className="pt-2 flex justify-end">
        <SaveBtn saving={saving} onClick={onSave} />
      </div>
    </div>
  )
}

// ─── Section: Depoimentos ─────────────────────────────────────────────────────

function SectionDepoimentos() {
  const [depoimentos, setDepoimentos] = useState<Depoimento[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [uploading, setUploading] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/depoimentos')
    const data = await res.json()
    setDepoimentos(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  function atualizar(id: string, changes: Partial<Depoimento>) {
    setDepoimentos(prev => prev.map(d => d.id === id ? { ...d, ...changes } : d))
  }

  async function salvar(dep: Depoimento) {
    setSaving(dep.id)
    await fetch('/api/admin/depoimentos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: dep.id, nome: dep.nome, cidade: dep.cidade, premio: dep.premio,
        sorteio: dep.sorteio, depoimento: dep.depoimento, ativo: dep.ativo, ordem: dep.ordem,
      }),
    })
    setSaving(null)
  }

  async function adicionar() {
    const res = await fetch('/api/admin/depoimentos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: 'Novo ganhador', cidade: 'Recife, PE', premio: 'R$ 1.000',
        sorteio: 'Edição 1', depoimento: 'Depoimento aqui…',
        ativo: true, ordem: depoimentos.length,
      }),
    })
    const novo = await res.json()
    if (novo?.id) setDepoimentos(prev => [...prev, novo])
  }

  async function deletar(id: string) {
    if (!confirm('Remover este depoimento?')) return
    setDepoimentos(prev => prev.filter(d => d.id !== id))
    await fetch('/api/admin/depoimentos', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
  }

  async function uploadFoto(id: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(id)
    const form = new FormData()
    form.append('file', file)
    form.append('chave', `depoimento-${id}`)
    const res = await fetch('/api/admin/upload', { method: 'POST', body: form })
    const data = await res.json()
    if (data.url) {
      atualizar(id, { foto_url: data.url })
      await fetch('/api/admin/depoimentos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, foto_url: data.url }),
      })
    }
    setUploading(null)
    e.target.value = ''
  }

  async function mover(id: string, dir: 'up' | 'down') {
    const idx = depoimentos.findIndex(d => d.id === id)
    if (dir === 'up' && idx === 0) return
    if (dir === 'down' && idx === depoimentos.length - 1) return
    const lista = [...depoimentos]
    const swap = dir === 'up' ? idx - 1 : idx + 1
    ;[lista[idx], lista[swap]] = [lista[swap], lista[idx]]
    const comOrdem = lista.map((d, i) => ({ ...d, ordem: i }))
    setDepoimentos(comOrdem)
    await Promise.all(comOrdem.map(d =>
      fetch('/api/admin/depoimentos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: d.id, ordem: d.ordem }),
      })
    ))
  }

  if (loading) return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => <div key={i} className="bg-gray-100 rounded-2xl h-32 animate-pulse" />)}
    </div>
  )

  return (
    <div className="space-y-3">
      {depoimentos.map((dep, idx) => (
        <div key={dep.id} className="bg-white border border-gray-100 rounded-2xl p-4 hover:border-gray-200 transition-colors">
          <div className="flex items-start gap-4">
            <div className="flex flex-col gap-1 pt-1 flex-shrink-0">
              <button onClick={() => mover(dep.id, 'up')} disabled={idx === 0}
                className="text-gray-300 hover:text-gray-500 disabled:opacity-20 transition-colors">
                <ChevronUp size={14} />
              </button>
              <button onClick={() => mover(dep.id, 'down')} disabled={idx === depoimentos.length - 1}
                className="text-gray-300 hover:text-gray-500 disabled:opacity-20 transition-colors">
                <ChevronDown size={14} />
              </button>
            </div>
            <div className="relative flex-shrink-0">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200">
                {dep.foto_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={dep.foto_url} alt={dep.nome} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl font-bold bg-emerald-50 text-emerald-600">
                    {dep.nome.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <label className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-600 hover:bg-emerald-700 rounded-full flex items-center justify-center cursor-pointer transition-colors shadow">
                {uploading === dep.id
                  ? <span className="text-white text-xs">…</span>
                  : <Camera size={11} className="text-white" />
                }
                <input type="file" accept="image/*" className="hidden"
                  disabled={uploading === dep.id}
                  onChange={e => uploadFoto(dep.id, e)} />
              </label>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-3 min-w-0">
              <div>
                <label className="text-xs text-gray-400 font-medium block mb-1">Nome</label>
                <input value={dep.nome} onChange={e => atualizar(dep.id, { nome: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400" />
              </div>
              <div>
                <label className="text-xs text-gray-400 font-medium block mb-1">Cidade</label>
                <input value={dep.cidade} onChange={e => atualizar(dep.id, { cidade: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400" />
              </div>
              <div>
                <label className="text-xs text-gray-400 font-medium block mb-1">Prêmio ganho</label>
                <input value={dep.premio} onChange={e => atualizar(dep.id, { premio: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400" />
              </div>
              <div>
                <label className="text-xs text-gray-400 font-medium block mb-1">Edição</label>
                <input value={dep.sorteio} onChange={e => atualizar(dep.id, { sorteio: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-400 font-medium block mb-1">Depoimento</label>
                <textarea rows={2} value={dep.depoimento} onChange={e => atualizar(dep.id, { depoimento: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400 resize-none" />
              </div>
            </div>
            <div className="flex flex-col gap-2 flex-shrink-0">
              <button onClick={() => atualizar(dep.id, { ativo: !dep.ativo })} title={dep.ativo ? 'Ocultar' : 'Exibir'}
                className={`p-2 rounded-lg transition-colors ${dep.ativo ? 'text-emerald-600 hover:bg-emerald-50' : 'text-gray-400 hover:bg-gray-100'}`}>
                {dep.ativo ? <Eye size={15} /> : <EyeOff size={15} />}
              </button>
              <button onClick={() => salvar(dep)} disabled={saving === dep.id} title="Salvar"
                className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 disabled:opacity-40 transition-colors">
                <Save size={15} />
              </button>
              <button onClick={() => deletar(dep.id)} title="Remover"
                className="p-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        </div>
      ))}
      <button onClick={adicionar}
        className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 hover:border-emerald-400 hover:text-emerald-600 transition-all flex items-center justify-center gap-2 font-medium text-sm">
        <Plus size={18} />
        Adicionar depoimento
      </button>
    </div>
  )
}

// ─── Section: Rodapé ──────────────────────────────────────────────────────────

function SectionRodape({ configs, onChange, onSave, saving }: {
  configs: Record<string, string>
  onChange: (chave: string, valor: string) => void
  onSave: () => void
  saving: boolean
}) {
  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contato</p>
      <Field label="WhatsApp" value={configs['rodape_whatsapp'] ?? ''} onChange={v => onChange('rodape_whatsapp', v)} placeholder="+55 (81) 99999-9999" />
      <Field label="Telefone" value={configs['rodape_telefone'] ?? ''} onChange={v => onChange('rodape_telefone', v)} placeholder="+55 (81) 3333-3333" />
      <Field label="E-mail" value={configs['rodape_email'] ?? ''} onChange={v => onChange('rodape_email', v)} placeholder="contato@recifecap.com.br" />
      <Field label="Endereço" value={configs['rodape_endereco'] ?? ''} onChange={v => onChange('rodape_endereco', v)} placeholder="Recife, Pernambuco" />
      <Field label="CNPJ" value={configs['rodape_cnpj'] ?? ''} onChange={v => onChange('rodape_cnpj', v)} placeholder="00.000.000/0001-00" />
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-2">Redes sociais</p>
      <Field label="Instagram (URL)" value={configs['rodape_instagram'] ?? ''} onChange={v => onChange('rodape_instagram', v)} placeholder="https://instagram.com/recifecap" />
      <Field label="Facebook (URL)" value={configs['rodape_facebook'] ?? ''} onChange={v => onChange('rodape_facebook', v)} placeholder="https://facebook.com/recifecap" />
      <Field label="YouTube (URL)" value={configs['rodape_youtube'] ?? ''} onChange={v => onChange('rodape_youtube', v)} placeholder="https://youtube.com/@recifecap" />
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-2">Textos legais</p>
      <Field label="Texto de copyright" value={configs['rodape_copyright'] ?? ''} onChange={v => onChange('rodape_copyright', v)} placeholder="© 2025 Recife Cap. Todos os direitos reservados." />
      <Field label="Número SUSEP" value={configs['rodape_susep'] ?? ''} onChange={v => onChange('rodape_susep', v)} placeholder="SUSEP Proc. nº 15414.000000/0000-00" />
      <Field label="Regulamento" value={configs['rodape_regulamento'] ?? ''} onChange={v => onChange('rodape_regulamento', v)} multiline placeholder="Participação sujeita a regulamento…" />
      <Field label="URL Política de Privacidade" value={configs['politica_privacidade_url'] ?? ''} onChange={v => onChange('politica_privacidade_url', v)} placeholder="https://recifecap.com.br/privacidade" />
      <Field label="URL Termos de Uso" value={configs['termos_uso_url'] ?? ''} onChange={v => onChange('termos_uso_url', v)} placeholder="https://recifecap.com.br/termos" />
      <div className="pt-2 flex justify-end">
        <SaveBtn saving={saving} onClick={onSave} />
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminLandingPage() {
  const [activeSection, setActiveSection] = useState<Section>('hero')
  const [localConfigs, setLocalConfigs]   = useState<Record<string, string>>({})
  const [loadingConfigs, setLoadingConfigs] = useState(true)
  const [salvando, setSalvando]           = useState(false)
  const [previewMode, setPreviewMode]     = useState<'mobile' | 'desktop'>('mobile')
  const [uploadingKey, setUploadingKey]   = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then((data: Record<string, string>) => {
        setLocalConfigs(data)
        setLoadingConfigs(false)
      })
      .catch(() => setLoadingConfigs(false))
  }, [])

  function onChange(chave: string, valor: string) {
    setLocalConfigs(prev => ({ ...prev, [chave]: valor }))
  }

  async function uploadMidia(chave: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingKey(chave)
    const form = new FormData()
    form.append('file', file)
    form.append('chave', chave)
    const res = await fetch('/api/admin/upload', { method: 'POST', body: form })
    const data = await res.json()
    if (data.url) {
      onChange(chave, data.url)
      await fetch('/api/admin/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{ chave, valor: data.url }]),
      })
    }
    setUploadingKey(null)
    e.target.value = ''
  }

  async function publicarAlteracoes() {
    setSalvando(true)
    const updates = Object.entries(localConfigs).map(([chave, valor]) => ({ chave, valor }))
    await fetch('/api/admin/config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    setSalvando(false)
  }

  const sharedProps = {
    configs: localConfigs,
    onChange,
    onSave: publicarAlteracoes,
    saving: salvando,
  }

  const activeLabel = SECTIONS.find(s => s.id === activeSection)

  return (
    // Quebra o padding do layout admin para preencher a tela inteira
    <div className="-mx-4 -mt-16 lg:-mx-8 lg:-mt-8 -mb-4 lg:-mb-8 flex overflow-hidden"
      style={{ height: '100svh' }}>

      {/* ── Menu lateral ── */}
      <div className="w-48 flex-shrink-0 border-r border-gray-100 bg-gray-50 overflow-y-auto">
        <div className="px-4 py-4 border-b border-gray-100 flex items-center gap-2">
          <Layout size={16} className="text-emerald-600 flex-shrink-0" />
          <span className="text-sm font-bold text-gray-800">Landing Page</span>
        </div>
        <nav className="p-2 space-y-0.5">
          {SECTIONS.map(s => (
            <button key={s.id} onClick={() => setActiveSection(s.id)}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition-colors ${
                activeSection === s.id
                  ? 'bg-emerald-50 text-emerald-700 font-semibold border border-emerald-100'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}>
              <p className="font-medium leading-snug">{s.label}</p>
              <p className="text-gray-400 mt-0.5 leading-tight">{s.desc}</p>
            </button>
          ))}
        </nav>
      </div>

      {/* ── Formulário ── */}
      <div className="flex-1 overflow-y-auto p-6 bg-white">
        {loadingConfigs ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="bg-gray-100 rounded-lg h-10 animate-pulse" />)}
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-base font-semibold text-gray-900">{activeLabel?.label}</h2>
              <p className="text-xs text-gray-400 mt-0.5">{activeLabel?.desc}</p>
            </div>

            {activeSection === 'hero' && (
              <SectionHero
                localConfigs={localConfigs}
                onChange={onChange}
                uploadingKey={uploadingKey}
                uploadMidia={uploadMidia}
              />
            )}
            {activeSection === 'sorteio'     && <SectionSorteio     {...sharedProps} />}
            {activeSection === 'sobre' && (
              <SectionSobre
                localConfigs={localConfigs}
                onChange={onChange}
                uploadingKey={uploadingKey}
                uploadMidia={uploadMidia}
              />
            )}
            {activeSection === 'como'        && <SectionComo        {...sharedProps} />}
            {activeSection === 'premios'     && <SectionPremios />}
            {activeSection === 'historico'   && <SectionHistorico   {...sharedProps} />}
            {activeSection === 'depoimentos' && <SectionDepoimentos />}
            {activeSection === 'rodape'      && <SectionRodape      {...sharedProps} />}
          </>
        )}
      </div>

      {/* ── Preview ao vivo ── */}
      <div className="w-96 flex-shrink-0 border-l border-gray-100 bg-gray-100 flex flex-col">

        {/* Cabeçalho do preview */}
        <div className="px-4 py-3 border-b border-gray-200 bg-white flex items-center justify-between flex-shrink-0">
          <span className="text-sm font-bold text-gray-700">Preview</span>
          <div className="flex gap-1.5">
            <button onClick={() => setPreviewMode('mobile')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                previewMode === 'mobile' ? 'bg-emerald-700 text-white' : 'text-gray-500 hover:bg-gray-100'
              }`}>
              Mobile
            </button>
            <button onClick={() => setPreviewMode('desktop')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                previewMode === 'desktop' ? 'bg-emerald-700 text-white' : 'text-gray-500 hover:bg-gray-100'
              }`}>
              Desktop
            </button>
          </div>
        </div>

        {/* Frame do preview */}
        <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
          {previewMode === 'mobile' ? (
            <div className="relative flex-shrink-0" style={{ width: '280px', height: '560px' }}>
              {/* Moldura do celular */}
              <div className="absolute inset-0 rounded-[40px] border-[6px] border-gray-800 bg-gray-800 shadow-2xl overflow-hidden">
                {/* Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-gray-800 rounded-b-2xl z-10" />
                {/* Conteúdo */}
                <div className="w-full h-full overflow-hidden rounded-[34px]"
                  style={{
                    backgroundImage: `url('${localConfigs.fundo_hero_mobile_url || localConfigs.fundo_hero_url || '/fundo-mobile.png'}')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center top',
                  }}>
                  <div className="w-full h-full flex flex-col items-center justify-center px-5 text-center"
                    style={{ background: 'rgba(0,0,0,0.1)' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={localConfigs.logo_url || '/logo.png'} alt=""
                      className="w-14 h-14 object-contain mb-2"
                      onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                    <h1 className="text-white font-black text-2xl leading-tight"
                      style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                      {localConfigs.hero_titulo || localConfigs.nome_sistema || 'RECIFE CAP'}
                    </h1>
                    <p className="font-bold text-xs tracking-widest mt-1" style={{ color: localConfigs.cor_secundaria || '#FFC107' }}>
                      {(localConfigs.hero_badge || localConfigs.slogan || 'FILANTROPIA PREMIÁVEL').toUpperCase()}
                    </p>
                    {localConfigs.hero_subtitulo && (
                      <p className="text-white/80 text-xs mt-1 max-w-[180px] leading-tight">
                        {localConfigs.hero_subtitulo}
                      </p>
                    )}
                    <div className="border border-white/30 rounded-full px-3 py-1.5 mt-3 mb-4"
                      style={{ background: 'rgba(0,0,0,0.2)' }}>
                      <span className="text-white font-bold" style={{ fontSize: '9px' }}>
                        PRÓXIMO SORTEIO: {localConfigs.sorteio_dia_semana?.toUpperCase() || 'SÁBADO'} ÀS {localConfigs.sorteio_horario?.toUpperCase() || '09H00'}
                      </span>
                    </div>
                    <div className="w-full space-y-2">
                      <div className="w-full py-2.5 rounded-full text-xs font-black text-center"
                        style={{ background: localConfigs.cor_secundaria || '#FFC107', color: localConfigs.cor_primaria || '#1B5E20' }}>
                        {localConfigs.texto_btn_principal || 'Quero participar →'}
                      </div>
                      <div className="w-full py-2.5 rounded-full text-xs font-bold text-white text-center border border-white/40">
                        {localConfigs.texto_btn_secundario || 'Ver sorteio'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full rounded-2xl overflow-hidden relative shadow-lg"
              style={{
                height: '200px',
                backgroundImage: `url('${localConfigs.fundo_hero_url || '/fundo.png'}')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4"
                style={{ background: 'rgba(0,0,0,0.2)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={localConfigs.logo_url || '/logo.png'} alt=""
                  className="w-10 h-10 object-contain mb-1"
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                <h1 className="text-white font-black text-xl" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                  {localConfigs.hero_titulo || localConfigs.nome_sistema || 'RECIFE CAP'}
                </h1>
                <p className="font-bold text-xs tracking-widest mt-0.5" style={{ color: localConfigs.cor_secundaria || '#FFC107' }}>
                  {(localConfigs.hero_badge || localConfigs.slogan || 'FILANTROPIA PREMIÁVEL').toUpperCase()}
                </p>
                <div className="flex gap-2 mt-3">
                  <span className="px-4 py-1.5 rounded-full text-xs font-black"
                    style={{ background: localConfigs.cor_secundaria || '#FFC107', color: localConfigs.cor_primaria || '#1B5E20' }}>
                    {localConfigs.texto_btn_principal || 'Quero participar →'}
                  </span>
                  <span className="px-4 py-1.5 rounded-full text-xs font-bold text-white border border-white/50">
                    {localConfigs.texto_btn_secundario || 'Ver sorteio'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Botão publicar */}
        <div className="p-4 border-t border-gray-200 bg-white flex-shrink-0">
          <button onClick={publicarAlteracoes} disabled={salvando}
            className="w-full py-3 rounded-xl font-black text-white text-sm transition-all hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #2E7D32, #43A047)' }}>
            <Save size={15} className="flex-shrink-0" />
            {salvando ? 'Publicando…' : 'Publicar alterações'}
          </button>
          <p className="text-xs text-gray-400 text-center mt-2">
            As alterações ficam visíveis imediatamente
          </p>
        </div>
      </div>
    </div>
  )
}
