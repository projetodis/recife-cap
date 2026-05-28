'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Settings, Image, Palette, Trophy, Layout,
  FileText, Phone, AlignJustify, Smartphone,
  LayoutDashboard, CheckCircle, RotateCcw,
} from 'lucide-react'

const MENU = [
  { grupo: 'IDENTIDADE', itens: [
    { id: 'geral',  label: 'Geral',        icon: <Settings size={16} /> },
    { id: 'marca',  label: 'Logo & Marca', icon: <Image    size={16} /> },
    { id: 'cores',  label: 'Cores',        icon: <Palette  size={16} /> },
  ]},
  { grupo: 'PAINÉIS', itens: [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
  ]},
  { grupo: 'CONTEÚDO', itens: [
    { id: 'premios',  label: 'Premios',      icon: <Trophy   size={16} /> },
    { id: 'banners',  label: 'Banners',      icon: <Layout   size={16} /> },
    { id: 'textos',   label: 'Textos',       icon: <FileText size={16} /> },
  ]},
  { grupo: 'CONTATO', itens: [
    { id: 'redes',   label: 'Redes Sociais', icon: <Phone         size={16} /> },
    { id: 'rodape',  label: 'Rodape',        icon: <AlignJustify  size={16} /> },
  ]},
  { grupo: 'APLICATIVO', itens: [
    { id: 'appstores', label: 'App Stores', icon: <Smartphone size={16} /> },
  ]},
]

const DESCRICOES: Record<string, string> = {
  logo_url:            'Logo principal',
  favicon_url:         'Favicon',
  fundo_hero_url:      'Fundo do hero',
  banner_home_url:     'Banner da Home',
  banner_compra_url:   'Banner de Compra',
  banner_sorteio_url:  'Banner do Sorteio',
  cartela_imagem_url:  'Cartela — Seção Quem Somos',
}

export default function AdminConfiguracoesPage() {
  const router = useRouter()
  const [secao, setSecao]           = useState('geral')
  const [configs, setConfigs]       = useState<Record<string, string>>({})
  const [pendentes, setPendentes]   = useState<Record<string, string>>({})
  const [loading, setLoading]       = useState(true)
  const [salvando, setSalvando]     = useState(false)
  const [msg, setMsg]               = useState('')
  const [uploading, setUploading]   = useState<string | null>(null)
  const [sucesso, setSucesso]       = useState('')

  useEffect(() => {
    fetch('/api/admin/config/setup', { method: 'POST' }).catch(() => {})
  }, [])

  useEffect(() => {
    async function carregar() {
      setLoading(true)
      const supabase = createClient()
      const { data } = await supabase.from('configuracoes').select('chave, valor')
      const map: Record<string, string> = {}
      for (const row of data ?? []) map[row.chave] = row.valor ?? ''
      setConfigs(map)
      setPendentes({})
      setLoading(false)
    }
    carregar()
  }, [])

  function set(chave: string, valor: string) {
    setPendentes(p => ({ ...p, [chave]: valor }))
  }

  function val(chave: string) {
    return chave in pendentes ? pendentes[chave] : (configs[chave] ?? '')
  }

  async function salvarConfig(chave: string, valor: string) {
    const res = await fetch('/api/admin/config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{ chave, valor }]),
    })
    if (res.ok) {
      setConfigs(c => ({ ...c, [chave]: valor }))
      router.refresh()
    } else {
      const data = await res.json()
      setMsg(data.erros?.join(', ') ?? 'Erro ao salvar')
    }
  }

  async function salvarTudo() {
    const items = Object.entries(pendentes)
    if (items.length === 0) return
    setSalvando(true); setMsg('')
    const res = await fetch('/api/admin/config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(items.map(([chave, valor]) => ({ chave, valor }))),
    })
    if (res.ok) {
      setConfigs(c => ({ ...c, ...pendentes }))
      if (pendentes.cor_primaria || pendentes.cor_secundaria) {
        const root = document.documentElement
        if (pendentes.cor_primaria)   root.style.setProperty('--color-primary',  pendentes.cor_primaria)
        if (pendentes.cor_secundaria) root.style.setProperty('--color-secondary', pendentes.cor_secundaria)
      }
      setPendentes({})
      setMsg('Configurações salvas com sucesso!')
      router.refresh()
    } else {
      const data = await res.json()
      setMsg(data.erros?.join(', ') ?? 'Erro ao salvar')
    }
    setSalvando(false)
    setTimeout(() => setMsg(''), 3000)
  }

  async function uploadImagem(chave: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(chave); setMsg(''); setSucesso('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('chave', chave)
      const res  = await fetch('/api/admin/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) { setMsg(`Erro no upload: ${data.error}`); return }
      await salvarConfig(chave, data.url)
      setSucesso(`${DESCRICOES[chave] ?? chave} atualizado!`)
      setTimeout(() => setSucesso(''), 3000)
    } catch (err) {
      setMsg(`Erro inesperado: ${String(err)}`)
    } finally {
      setUploading(null)
      e.target.value = ''
    }
  }

  const hasPendentes = Object.keys(pendentes).length > 0

  const DEFAULTS: Record<string, string> = {
    cor_primaria: '#2E7D32', cor_secundaria: '#FFC107',
    cor_sidebar: '#1B5E20', cor_header: '#2E7D32',
    cor_hero_bg: '#1B5E20', cor_hero_text: '#FFFFFF', cor_site_bg: '#F5F7FA',
  }

  function resetarCores() {
    if (!confirm('Resetar todas as cores para os padrões Recife Cap?')) return
    const updates = Object.entries(DEFAULTS).map(([chave, valor]) => ({ chave, valor }))
    fetch('/api/admin/config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }).then(r => r.ok && (setConfigs(c => ({ ...c, ...DEFAULTS })), setSucesso('Cores resetadas para o padrão!')))
  }

  // ── Componentes inline ────────────────────────────────────────────────────
  function Field({ chave, label, tipo = 'text', placeholder }: {
    chave: string; label: string; tipo?: string; placeholder?: string
  }) {
    return (
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">{label}</label>
        <input
          type={tipo}
          value={val(chave)}
          placeholder={placeholder}
          onChange={e => set(chave, e.target.value)}
          className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-400 ${
            chave in pendentes ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'
          }`}
        />
      </div>
    )
  }

  function UploadCard({ chave, label, dimensao }: { chave: string; label: string; dimensao?: string }) {
    return (
      <div className="border-2 border-dashed border-gray-200 rounded-2xl p-5 text-center">
        {val(chave) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={val(chave)} alt={label} className="h-28 object-contain mx-auto mb-3 rounded-lg" />
        ) : (
          <div className="h-28 flex items-center justify-center mb-3 text-gray-200">
            <Image size={48} />
          </div>
        )}
        <p className="text-sm font-semibold text-gray-700 mb-0.5">{label}</p>
        {dimensao && <p className="text-xs text-gray-400 mb-3">{dimensao}</p>}
        <label className={`cursor-pointer inline-block px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
          uploading === chave ? 'bg-gray-200 text-gray-400 cursor-wait' : 'text-white hover:opacity-90'
        }`} style={uploading === chave ? {} : { background: 'var(--color-primary)' }}>
          {uploading === chave ? 'Enviando...' : 'Alterar imagem'}
          <input
            type="file" accept="image/*" className="hidden"
            disabled={uploading !== null}
            onChange={e => uploadImagem(chave, e)}
          />
        </label>
      </div>
    )
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
          <p className="text-gray-500 text-sm mt-0.5">White label e personalização do sistema</p>
        </div>
        <div className="flex items-center gap-2">
          {secao === 'cores' || secao === 'dashboard' ? (
            <button
              onClick={resetarCores}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-gray-600 font-medium text-sm border border-gray-200 hover:bg-gray-50 transition-all"
            >
              <RotateCcw size={14} />
              Resetar padrões
            </button>
          ) : null}
          <button
            onClick={salvarTudo}
            disabled={!hasPendentes || salvando}
            className="px-5 py-2.5 rounded-xl text-white font-bold text-sm disabled:opacity-40 transition-all"
            style={{ background: hasPendentes ? 'var(--color-primary)' : '#9ca3af' }}
          >
            {salvando ? 'Salvando...' : `Salvar tudo${hasPendentes ? ` (${Object.keys(pendentes).length})` : ''}`}
          </button>
        </div>
      </div>

      {msg && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium ${
          msg.toLowerCase().includes('erro') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
        }`}>
          {msg}
        </div>
      )}
      {sucesso && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">
          <CheckCircle size={15} className="flex-shrink-0" />
          {sucesso}
        </div>
      )}

      {/* Layout: menu lateral + conteúdo */}
      <div className="flex gap-6 min-h-[600px]">

        {/* Menu lateral */}
        <aside className="w-52 flex-shrink-0">
          <div className="bg-white rounded-2xl border border-gray-100 p-3 space-y-4 sticky top-4">
            {MENU.map(grupo => (
              <div key={grupo.grupo}>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 mb-1">
                  {grupo.grupo}
                </p>
                {grupo.itens.map(item => (
                  <button
                    key={item.id}
                    onClick={() => setSecao(item.id)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors text-left"
                    style={secao === item.id
                      ? { background: 'var(--color-primary)', color: '#fff' }
                      : { color: '#374151' }
                    }
                    onMouseEnter={e => { if (secao !== item.id) (e.currentTarget as HTMLElement).style.background = '#f3f4f6' }}
                    onMouseLeave={e => { if (secao !== item.id) (e.currentTarget as HTMLElement).style.background = '' }}
                  >
                    <span>{item.icon}</span>
                    <span className="font-medium">{item.label}</span>
                    {secao === item.id && hasPendentes && (
                      <span className="ml-auto w-2 h-2 rounded-full bg-yellow-400 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </aside>

        {/* Conteúdo da seção */}
        <div className="flex-1 min-w-0">

          {/* ── GERAL ────────────────────────────────────────────────── */}
          {secao === 'geral' && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
              <h2 className="font-bold text-gray-800 text-lg mb-2">Geral</h2>
              <Field chave="nome_sistema"  label="Nome do sistema" />
              <Field chave="slogan"        label="Slogan" />
              <Field chave="canal_sorteio" label="Canal de transmissão" placeholder="youtube.com/watch?v=..." />
              <Field chave="valor_titulo"  label="Valor do título (R$)" tipo="number" />
            </div>
          )}

          {/* ── LOGO & MARCA ─────────────────────────────────────────── */}
          {secao === 'marca' && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6">
              <h2 className="font-bold text-gray-800 text-lg">Logo & Marca</h2>

              <div className="grid grid-cols-2 gap-5">
                <UploadCard chave="logo_url"       label="Logo principal" dimensao="Recomendado: 512×512px" />
                <UploadCard chave="favicon_url"    label="Favicon"        dimensao="Recomendado: 32×32px" />
                <UploadCard chave="fundo_hero_url" label="Fundo do hero"  dimensao="Recomendado: 1440×500px" />
              </div>

              {(val('fundo_hero_url') || val('logo_url')) && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Preview ao vivo</p>
                  <div
                    className="relative h-36 rounded-2xl overflow-hidden flex items-center justify-center"
                    style={{
                      backgroundImage: val('fundo_hero_url') ? `url('${val('fundo_hero_url')}')` : undefined,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      backgroundColor: val('fundo_hero_url') ? undefined : 'var(--color-primary-dark, #1B5E20)',
                    }}
                  >
                    <div className="absolute inset-0 bg-black/30" />
                    <div className="relative z-10 flex flex-col items-center">
                      {val('logo_url') && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={val('logo_url')} alt="logo" className="w-14 h-14 object-contain mb-1" />
                      )}
                      <p className="text-white font-black text-base tracking-widest drop-shadow">
                        {(val('nome_sistema') || 'Recife Cap').toUpperCase()}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── CORES ────────────────────────────────────────────────── */}
          {secao === 'cores' && (
            <div className="space-y-5">
              <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
                <h2 className="font-bold text-gray-800 text-lg">Cores principais</h2>
                {[
                  { chave: 'cor_primaria',   label: 'Cor principal',  exemplo: 'Botões, links, ativo na sidebar' },
                  { chave: 'cor_secundaria', label: 'Cor secundária', exemplo: 'Badges dourados, prêmios, destaques' },
                ].map(({ chave, label, exemplo }) => (
                  <div key={chave} className="flex items-center gap-4 p-4 border border-gray-100 rounded-2xl">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-700">{label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{exemplo}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <input type="color" value={val(chave) || '#000000'} onChange={e => set(chave, e.target.value)}
                        className="w-12 h-12 rounded-xl cursor-pointer border-0 p-0.5 bg-transparent" />
                      <input type="text" value={val(chave)} onChange={e => set(chave, e.target.value)}
                        className={`border rounded-xl px-3 py-2 text-sm font-mono w-28 focus:outline-none focus:border-green-400 ${chave in pendentes ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'}`} />
                      <div className="w-10 h-10 rounded-xl border border-gray-200 shadow-sm" style={{ background: val(chave) }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
                <h2 className="font-bold text-gray-800 text-lg">Cores do site público</h2>
                {[
                  { chave: 'cor_hero_bg',   label: 'Fundo do hero',    exemplo: 'Cor quando não há imagem de fundo' },
                  { chave: 'cor_hero_text', label: 'Texto no hero',     exemplo: 'Cor do título e textos sobre o hero' },
                  { chave: 'cor_site_bg',   label: 'Fundo do site',     exemplo: 'Cor de fundo geral das páginas públicas' },
                ].map(({ chave, label, exemplo }) => (
                  <div key={chave} className="flex items-center gap-4 p-4 border border-gray-100 rounded-2xl">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-700">{label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{exemplo}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <input type="color" value={val(chave) || '#000000'} onChange={e => set(chave, e.target.value)}
                        className="w-12 h-12 rounded-xl cursor-pointer border-0 p-0.5 bg-transparent" />
                      <input type="text" value={val(chave)} onChange={e => set(chave, e.target.value)}
                        className={`border rounded-xl px-3 py-2 text-sm font-mono w-28 focus:outline-none focus:border-green-400 ${chave in pendentes ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'}`} />
                      <div className="w-10 h-10 rounded-xl border border-gray-200 shadow-sm" style={{ background: val(chave) }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-5 bg-gray-50 rounded-2xl space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Preview ao vivo</p>
                <div className="flex gap-3 flex-wrap items-center">
                  <button className="px-5 py-2.5 rounded-xl text-white text-sm font-bold shadow"
                    style={{ background: val('cor_primaria') || 'var(--color-primary)' }}>
                    Botão principal
                  </button>
                  <button className="px-5 py-2.5 rounded-xl text-sm font-bold border-2"
                    style={{ borderColor: val('cor_primaria') || 'var(--color-primary)', color: val('cor_primaria') || 'var(--color-primary)' }}>
                    Botão outline
                  </button>
                  <span className="px-3 py-1.5 rounded-full text-sm font-bold"
                    style={{ background: val('cor_secundaria') || 'var(--color-secondary)', color: '#1B5E20' }}>
                    Badge prêmio
                  </span>
                </div>
                <div className="flex gap-3 items-start mt-2">
                  <div className="w-28 rounded-xl p-2 text-xs text-white space-y-1"
                    style={{ background: val('cor_primaria') || 'var(--color-primary)' }}>
                    <div className="bg-white/10 rounded px-2 py-1">Dashboard</div>
                    <div className="bg-white/20 rounded px-2 py-1 border-l-2"
                      style={{ borderColor: val('cor_secundaria') || 'var(--color-secondary)' }}>
                      Sorteios
                    </div>
                    <div className="bg-white/10 rounded px-2 py-1">Relatórios</div>
                  </div>
                  <div className="flex-1 rounded-xl overflow-hidden h-16"
                    style={{ background: val('cor_hero_bg') || '#1B5E20' }}>
                    <div className="h-full flex items-center justify-center">
                      <span className="text-sm font-bold" style={{ color: val('cor_hero_text') || '#FFFFFF' }}>
                        Hero preview
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── DASHBOARD INTERNO ────────────────────────────────── */}
          {secao === 'dashboard' && (
            <div className="space-y-5">
              <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
                <div>
                  <h2 className="font-bold text-gray-800 text-lg">Dashboard Interno</h2>
                  <p className="text-sm text-gray-400 mt-0.5">Cores da sidebar e cabeçalho dos painéis admin, distribuidor e PDV.</p>
                </div>
                {[
                  { chave: 'cor_sidebar', label: 'Cor da sidebar',   exemplo: 'Fundo do menu lateral em todos os painéis' },
                  { chave: 'cor_header',  label: 'Cor do cabeçalho', exemplo: 'Cabeçalho dos painéis internos' },
                ].map(({ chave, label, exemplo }) => (
                  <div key={chave} className="flex items-center gap-4 p-4 border border-gray-100 rounded-2xl">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-700">{label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{exemplo}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <input type="color" value={val(chave) || '#000000'} onChange={e => set(chave, e.target.value)}
                        className="w-12 h-12 rounded-xl cursor-pointer border-0 p-0.5 bg-transparent" />
                      <input type="text" value={val(chave)} onChange={e => set(chave, e.target.value)}
                        className={`border rounded-xl px-3 py-2 text-sm font-mono w-28 focus:outline-none focus:border-green-400 ${chave in pendentes ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'}`} />
                      <div className="w-10 h-10 rounded-xl border border-gray-200 shadow-sm" style={{ background: val(chave) }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Preview sidebar */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Preview da sidebar</p>
                <div className="flex gap-4 items-start">
                  <div className="w-40 rounded-2xl overflow-hidden shadow-md flex-shrink-0"
                    style={{ background: val('cor_sidebar') || '#1B5E20' }}>
                    <div className="px-3 py-3 border-b border-white/10">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-white/20" />
                        <div>
                          <div className="h-2.5 w-16 rounded bg-white/80 mb-1" />
                          <div className="h-2 w-12 rounded bg-white/40" />
                        </div>
                      </div>
                    </div>
                    <div className="px-2 py-2 space-y-0.5">
                      <div className="px-2 py-1.5 rounded-lg text-xs text-white/40">Dashboard</div>
                      <div className="px-2 py-1.5 rounded-lg text-xs text-white font-medium border-l-2 flex items-center gap-1"
                        style={{ background: val('cor_header') || '#2E7D32', borderColor: val('cor_secundaria') || '#FFC107' }}>
                        <div className="w-3 h-3 rounded-sm bg-white/30" />
                        Sorteios
                      </div>
                      <div className="px-2 py-1.5 rounded-lg text-xs text-white/40">Relatórios</div>
                      <div className="px-2 py-1.5 rounded-lg text-xs text-white/40">Configurações</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 space-y-2 pt-2">
                    <p><span className="font-medium text-gray-600">Sidebar:</span> {val('cor_sidebar') || '#1B5E20'}</p>
                    <p><span className="font-medium text-gray-600">Item ativo:</span> {val('cor_header') || '#2E7D32'}</p>
                    <p><span className="font-medium text-gray-600">Borda ativa:</span> {val('cor_secundaria') || '#FFC107'}</p>
                    <p className="text-[11px] text-gray-300 mt-3 max-w-[180px]">
                      Alterações entram em vigor após recarregar a página do painel.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── PRÊMIOS ──────────────────────────────────────────────── */}
          {secao === 'premios' && (
            <div className="space-y-5">
              <h2 className="font-bold text-gray-800 text-lg">Prêmios</h2>
              {([1, 2, 3, 4, 'principal'] as const).map(n => (
                <div key={n} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-gray-800">
                      {n === 'principal' ? 'Prêmio Principal' : `${n}º Prêmio`}
                    </h3>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                      Sorteio {n === 'principal' ? 'Final' : n}
                    </span>
                  </div>

                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center">
                    {val(`premio_${n}_foto_url`) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={val(`premio_${n}_foto_url`)} alt={`${n}º prêmio`}
                        className="h-32 object-contain mx-auto mb-2 rounded-lg" />
                    ) : (
                      <div className="h-32 flex items-center justify-center text-gray-200">
                        <Trophy size={56} />
                      </div>
                    )}
                    <label className="cursor-pointer text-sm font-medium hover:underline"
                      style={{ color: 'var(--color-primary)' }}>
                      {uploading === `premio_${n}_foto_url` ? 'Enviando...' : 'Alterar foto'}
                      <input
                        type="file" accept="image/*" className="hidden"
                        disabled={uploading !== null}
                        onChange={e => uploadImagem(`premio_${n}_foto_url`, e)}
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Nome</label>
                      <input
                        value={val(`premio_${n}_nome`)}
                        onChange={e => set(`premio_${n}_nome`, e.target.value)}
                        className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400 ${
                          `premio_${n}_nome` in pendentes ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Valor (R$)</label>
                      <input
                        type="number"
                        value={val(`premio_${n}_valor`)}
                        onChange={e => set(`premio_${n}_valor`, e.target.value)}
                        className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400 ${
                          `premio_${n}_valor` in pendentes ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── BANNERS ──────────────────────────────────────────────── */}
          {secao === 'banners' && (
            <div className="space-y-5">
              <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
                <h2 className="font-bold text-gray-800 text-lg">Hero</h2>
                <div className="grid grid-cols-2 gap-5">
                  <UploadCard chave="fundo_hero_url"        label="Fundo hero — Desktop"   dimensao="JPG/PNG, 1920×1080px" />
                  <UploadCard chave="fundo_hero_mobile_url" label="Fundo hero — Mobile"    dimensao="JPG/PNG, 800×1600px portrait" />
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
                <h2 className="font-bold text-gray-800 text-lg">Banners internos</h2>
                <div className="grid grid-cols-2 gap-5">
                  <UploadCard chave="banner_home_url"           label="Banner da Home"              dimensao="Recomendado: 1200×400px" />
                  <UploadCard chave="banner_compra_url"         label="Banner de Compra"            dimensao="Recomendado: 600×800px" />
                  <UploadCard chave="banner_sorteio_url"        label="Banner do Sorteio — Desktop" dimensao="Recomendado: 1200×400px" />
                  <UploadCard chave="banner_sorteio_mobile_url" label="Banner do Sorteio — Mobile"  dimensao="Recomendado: 800×400px" />
                  <UploadCard chave="cartela_imagem_url"        label="Cartela — Quem Somos"        dimensao="PNG/JPG, ideal 900×500px" />
                </div>
              </div>
            </div>
          )}

          {/* ── TEXTOS ───────────────────────────────────────────────── */}
          {secao === 'textos' && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
              <h2 className="font-bold text-gray-800 text-lg">Textos</h2>
              <p className="text-sm text-gray-500">Textos visíveis no site público.</p>
              <Field chave="nome_sistema"  label="Nome do sistema" />
              <Field chave="slogan"        label="Slogan" />
              <Field chave="canal_sorteio" label="Link do canal de transmissão" placeholder="https://..." />
            </div>
          )}

          {/* ── REDES SOCIAIS ────────────────────────────────────────── */}
          {secao === 'redes' && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
              <h2 className="font-bold text-gray-800 text-lg">Redes Sociais & Contato</h2>
              <Field chave="whatsapp_suporte" label="WhatsApp de suporte" placeholder="5581999999999" />
              <Field chave="email_suporte"    label="Email de suporte"    placeholder="suporte@exemplo.com" />
              <Field chave="instagram_url"    label="Instagram"           placeholder="https://instagram.com/..." />
              <Field chave="facebook_url"     label="Facebook"            placeholder="https://facebook.com/..." />
              <Field chave="youtube_url"      label="YouTube"             placeholder="https://youtube.com/..." />
            </div>
          )}

          {/* ── RODAPÉ ───────────────────────────────────────────────── */}
          {secao === 'rodape' && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
              <h2 className="font-bold text-gray-800 text-lg">Rodapé</h2>
              {[
                { chave: 'rodape_texto',    label: 'Texto SUSEP',      rows: 3 },
                { chave: 'rodape_direitos', label: 'Direitos autorais', rows: 1 },
              ].map(({ chave, label, rows }) => (
                <div key={chave}>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">{label}</label>
                  <textarea
                    rows={rows}
                    value={val(chave)}
                    onChange={e => set(chave, e.target.value)}
                    className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-400 resize-none ${
                      chave in pendentes ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'
                    }`}
                  />
                </div>
              ))}
            </div>
          )}

          {/* ── APP STORES ───────────────────────────────────────────── */}
          {secao === 'appstores' && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6">
              <h2 className="font-bold text-gray-800 text-lg">App Stores</h2>
              <Field chave="google_play_url" label="URL Google Play" tipo="url" placeholder="https://play.google.com/..." />
              <Field chave="app_store_url"   label="URL App Store"   tipo="url" placeholder="https://apps.apple.com/..." />

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Preview dos badges</p>
                <div className="flex gap-3 flex-wrap">
                  <a href={val('google_play_url') || '#'}
                    className="flex items-center gap-2 bg-gray-900 text-white text-xs font-medium px-5 py-2.5 rounded-xl hover:bg-gray-800 transition-colors">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                      <path d="M3 20.5v-17c0-.83 1-.83 1.5 0L21 12l-16.5 8.5c-.5.83-1.5.83-1.5 0z"/>
                    </svg>
                    Google Play
                  </a>
                  <a href={val('app_store_url') || '#'}
                    className="flex items-center gap-2 bg-gray-900 text-white text-xs font-medium px-5 py-2.5 rounded-xl hover:bg-gray-800 transition-colors">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                    </svg>
                    App Store
                  </a>
                </div>
                {!val('google_play_url') && !val('app_store_url') && (
                  <p className="text-xs text-gray-400 mt-2">Preencha as URLs acima para ativar os links</p>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
