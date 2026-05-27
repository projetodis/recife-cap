'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Layout, Save, Plus, Trash2, Camera, Eye, EyeOff,
  Upload, ChevronUp, ChevronDown, Star,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

type Section =
  | 'hero'
  | 'sorteio'
  | 'como'
  | 'premios'
  | 'historico'
  | 'depoimentos'
  | 'rodape'

const SECTIONS: { id: Section; label: string; desc: string }[] = [
  { id: 'hero',        label: 'Hero',                desc: 'Título, subtítulo e botão principal' },
  { id: 'sorteio',     label: 'Sorteio da Semana',   desc: 'Data, hora e informações do próximo sorteio' },
  { id: 'como',        label: 'Como Participar',      desc: 'Passos explicativos para novos participantes' },
  { id: 'premios',     label: 'Prêmios da Edição',   desc: 'Gerenciado via Edições → Prêmios' },
  { id: 'historico',   label: 'Histórico de Sorteios', desc: 'Textos da seção de resultados anteriores' },
  { id: 'depoimentos', label: 'Depoimentos',          desc: 'Ganhadores que aparecem no carrossel' },
  { id: 'rodape',      label: 'Rodapé',               desc: 'Contato, redes sociais e endereço' },
]

// ─── Sub-components ──────────────────────────────────────────────────────────

function Field({
  label, value, onChange, multiline = false, placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  multiline?: boolean
  placeholder?: string
}) {
  const cls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400 bg-white'
  return (
    <div>
      <label className="text-xs font-medium text-gray-500 block mb-1">{label}</label>
      {multiline ? (
        <textarea
          rows={3}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={cls + ' resize-none'}
        />
      ) : (
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={cls}
        />
      )}
    </div>
  )
}

function SaveBtn({ saving, onClick }: { saving: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition"
    >
      <Save size={14} />
      {saving ? 'Salvando…' : 'Salvar alterações'}
    </button>
  )
}

// ─── Section: Hero ───────────────────────────────────────────────────────────

function SectionHero({ configs, onChange, onSave, saving }: {
  configs: Record<string, string>
  onChange: (chave: string, valor: string) => void
  onSave: () => void
  saving: boolean
}) {
  return (
    <div className="space-y-4">
      <Field label="Título principal" value={configs['hero_titulo'] ?? ''} onChange={v => onChange('hero_titulo', v)} placeholder="RECIFE CAP" />
      <Field label="Subtítulo / slogan" value={configs['hero_subtitulo'] ?? ''} onChange={v => onChange('hero_subtitulo', v)} placeholder="Seu sonho pode ser o próximo!" />
      <Field label="Texto do botão CTA" value={configs['hero_botao'] ?? ''} onChange={v => onChange('hero_botao', v)} placeholder="Comprar minha cartela" />
      <Field label="Texto de apoio abaixo do botão" value={configs['hero_apoio'] ?? ''} onChange={v => onChange('hero_apoio', v)} placeholder="Mais de 5.000 ganhadores" />
      <div className="pt-2 flex justify-end">
        <SaveBtn saving={saving} onClick={onSave} />
      </div>
    </div>
  )
}

// ─── Section: Sorteio da Semana ──────────────────────────────────────────────

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
      <p className="text-xs text-gray-400">
        A data, hora e valor do sorteio são puxados automaticamente da edição ativa em <strong>Edições</strong>.
      </p>
      <div className="pt-2 flex justify-end">
        <SaveBtn saving={saving} onClick={onSave} />
      </div>
    </div>
  )
}

// ─── Section: Como Participar ────────────────────────────────────────────────

function SectionComo({ configs, onChange, onSave, saving }: {
  configs: Record<string, string>
  onChange: (chave: string, valor: string) => void
  onSave: () => void
  saving: boolean
}) {
  const steps = [1, 2, 3, 4]
  return (
    <div className="space-y-5">
      <Field label="Título da seção" value={configs['como_titulo'] ?? ''} onChange={v => onChange('como_titulo', v)} placeholder="Como Participar" />
      {steps.map(n => (
        <div key={n} className="border border-gray-100 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-emerald-700">Passo {n}</p>
          <Field label="Título do passo" value={configs[`como_passo${n}_titulo`] ?? ''} onChange={v => onChange(`como_passo${n}_titulo`, v)} placeholder={`Passo ${n}`} />
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
        Os prêmios são configurados individualmente em cada edição.
        Acesse <strong>Edições → selecione a edição → Prêmios</strong> para adicionar, editar e reordenar prêmios.
      </p>
    </div>
  )
}

// ─── Section: Histórico ──────────────────────────────────────────────────────

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

// ─── Section: Depoimentos ────────────────────────────────────────────────────

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
            {/* Reordenar */}
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

            {/* Foto */}
            <div className="relative flex-shrink-0">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200">
                {dep.foto_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={dep.foto_url} alt={dep.nome} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-xl font-bold bg-emerald-50 text-emerald-600">
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

            {/* Campos */}
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

            {/* Ações */}
            <div className="flex flex-col gap-2 flex-shrink-0">
              <button
                onClick={() => atualizar(dep.id, { ativo: !dep.ativo })}
                title={dep.ativo ? 'Ocultar' : 'Exibir'}
                className={`p-2 rounded-lg transition-colors ${dep.ativo ? 'text-emerald-600 hover:bg-emerald-50' : 'text-gray-400 hover:bg-gray-100'}`}>
                {dep.ativo ? <Eye size={15} /> : <EyeOff size={15} />}
              </button>
              <button onClick={() => salvar(dep)} disabled={saving === dep.id}
                title="Salvar"
                className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 disabled:opacity-40 transition-colors">
                <Save size={15} />
              </button>
              <button onClick={() => deletar(dep.id)}
                title="Remover"
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

      {depoimentos.length > 0 && (
        <p className="text-xs text-gray-400 text-center">
          Use ▲▼ para reordenar · <Eye size={10} className="inline" /> para ocultar · clique em Salvar para persistir
        </p>
      )}
    </div>
  )
}

// ─── Section: Rodapé ─────────────────────────────────────────────────────────

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
      <Field label="E-mail" value={configs['rodape_email'] ?? ''} onChange={v => onChange('rodape_email', v)} placeholder="contato@recifecap.com.br" />
      <Field label="Endereço" value={configs['rodape_endereco'] ?? ''} onChange={v => onChange('rodape_endereco', v)} placeholder="Recife, Pernambuco" />

      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-2">Redes sociais</p>
      <Field label="Instagram (URL)" value={configs['rodape_instagram'] ?? ''} onChange={v => onChange('rodape_instagram', v)} placeholder="https://instagram.com/recifecap" />
      <Field label="Facebook (URL)" value={configs['rodape_facebook'] ?? ''} onChange={v => onChange('rodape_facebook', v)} placeholder="https://facebook.com/recifecap" />
      <Field label="YouTube (URL)" value={configs['rodape_youtube'] ?? ''} onChange={v => onChange('rodape_youtube', v)} placeholder="https://youtube.com/@recifecap" />

      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-2">Textos legais</p>
      <Field label="Texto de copyright" value={configs['rodape_copyright'] ?? ''} onChange={v => onChange('rodape_copyright', v)} placeholder="© 2025 Recife Cap. Todos os direitos reservados." />
      <Field label="Texto regulamento" value={configs['rodape_regulamento'] ?? ''} onChange={v => onChange('rodape_regulamento', v)} multiline placeholder="Participação sujeita a regulamento…" />

      <div className="pt-2 flex justify-end">
        <SaveBtn saving={saving} onClick={onSave} />
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminLandingPage() {
  const [activeSection, setActiveSection] = useState<Section>('hero')
  const [configs, setConfigs] = useState<Record<string, string>>({})
  const [loadingConfigs, setLoadingConfigs] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then((data: Record<string, string>) => {
        setConfigs(data)
        setLoadingConfigs(false)
      })
      .catch(() => setLoadingConfigs(false))
  }, [])

  function onChange(chave: string, valor: string) {
    setConfigs(prev => ({ ...prev, [chave]: valor }))
  }

  async function onSave() {
    setSaving(true)
    const updates = Object.entries(configs).map(([chave, valor]) => ({ chave, valor }))
    await fetch('/api/admin/config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    setSaving(false)
  }

  const sharedProps = { configs, onChange, onSave, saving }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
          <Layout size={20} className="text-emerald-600" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Editor da Landing Page</h1>
          <p className="text-sm text-gray-400 mt-0.5">Edite os textos e conteúdos do site sem precisar de programador</p>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Menu lateral de seções */}
        <aside className="w-52 flex-shrink-0">
          <nav className="space-y-1">
            {SECTIONS.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors ${
                  activeSection === s.id
                    ? 'bg-emerald-50 text-emerald-700 font-medium border border-emerald-100'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <p className="font-medium leading-snug">{s.label}</p>
                <p className="text-xs text-gray-400 mt-0.5 leading-tight">{s.desc}</p>
              </button>
            ))}
          </nav>
        </aside>

        {/* Conteúdo da seção ativa */}
        <main className="flex-1 bg-white rounded-2xl border border-gray-100 p-6 min-h-[500px]">
          {loadingConfigs ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <div key={i} className="bg-gray-100 rounded-lg h-10 animate-pulse" />)}
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-base font-semibold text-gray-900">
                  {SECTIONS.find(s => s.id === activeSection)?.label}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {SECTIONS.find(s => s.id === activeSection)?.desc}
                </p>
              </div>

              {activeSection === 'hero'        && <SectionHero {...sharedProps} />}
              {activeSection === 'sorteio'     && <SectionSorteio {...sharedProps} />}
              {activeSection === 'como'        && <SectionComo {...sharedProps} />}
              {activeSection === 'premios'     && <SectionPremios />}
              {activeSection === 'historico'   && <SectionHistorico {...sharedProps} />}
              {activeSection === 'depoimentos' && <SectionDepoimentos />}
              {activeSection === 'rodape'      && <SectionRodape {...sharedProps} />}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
