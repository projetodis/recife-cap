'use client'

import { useState } from 'react'
import { CheckCircle, Copy, Download, Database, Globe, FileText, Key, Rocket, XCircle } from 'lucide-react'

export default function OnboardingView({ cliente }: { cliente: any }) {
  const [loading, setLoading] = useState(false)
  const [pacote, setPacote] = useState<any>(null)
  const [abaAtiva, setAbaAtiva] = useState('checklist')
  const [copiado, setCopiado] = useState<string | null>(null)
  const [adminEmail, setAdminEmail] = useState(cliente.admin_email || '')
  const [adminSenha, setAdminSenha] = useState('')

  async function gerarPacote() {
    setLoading(true)
    const res = await fetch('/api/admin/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome_sistema: cliente.nome,
        slogan: 'Filantropia Premiável',
        dominio: cliente.dominio,
        cor_primaria: cliente.cor_primaria || '#2E7D32',
        cor_secundaria: cliente.cor_secundaria || '#FFC107',
        email_suporte: cliente.admin_email || '',
        admin_email: adminEmail,
        admin_senha: adminSenha,
      }),
    })
    const data = await res.json()
    setPacote(data.pacote)
    setLoading(false)
  }

  function copiar(texto: string, chave: string) {
    navigator.clipboard.writeText(texto)
    setCopiado(chave)
    setTimeout(() => setCopiado(null), 2000)
  }

  function baixar(conteudo: string, nome: string) {
    const blob = new Blob([conteudo], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = nome
    a.click()
  }

  const abas = [
    { id: 'checklist', label: 'Checklist', icon: CheckCircle },
    { id: 'schema',    label: 'Schema SQL', icon: Database },
    { id: 'seed',      label: 'Seed SQL',   icon: FileText },
    { id: 'env',       label: 'Env Vars',   icon: Key },
  ]

  return (
    <div className="max-w-4xl space-y-6">
      {/* Breadcrumb + título */}
      <div className="flex items-center gap-4">
        <a href="/admin/clientes" className="text-sm text-gray-500 hover:text-gray-700">← Clientes</a>
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Rocket size={24} style={{ color: '#2E7D32' }} />
            Onboarding — {cliente.nome}
          </h1>
          <p className="text-sm text-gray-500">{cliente.dominio}</p>
        </div>
      </div>

      {/* Info card */}
      <div className="bg-white rounded-2xl border p-5 shadow-sm">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Domínio</p>
            <p className="font-medium text-blue-600">{cliente.dominio}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Plano</p>
            <p className="font-bold text-gray-800 capitalize">{cliente.plano}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Cor primária</p>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-lg border" style={{ background: cliente.cor_primaria }} />
              <span className="font-mono text-xs">{cliente.cor_primaria}</span>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Admin</p>
            <p className="text-xs text-gray-700">{cliente.admin_email || '—'}</p>
          </div>
        </div>
      </div>

      {!pacote ? (
        <div className="bg-white rounded-2xl border p-8 shadow-sm text-center">
          <Rocket size={48} className="mx-auto mb-4 text-gray-200" />
          <h2 className="text-xl font-black text-gray-800 mb-2">Gerar pacote de onboarding</h2>
          <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
            Gera o SQL completo do banco, variáveis de ambiente e checklist para configurar o cliente.
          </p>
          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-6 text-left">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Email admin
              </label>
              <input
                type="email"
                value={adminEmail}
                onChange={e => setAdminEmail(e.target.value)}
                placeholder={`admin@${cliente.dominio}`}
                className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                style={{ borderColor: '#E5E7EB' }}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Senha inicial
              </label>
              <input
                type="password"
                value={adminSenha}
                onChange={e => setAdminSenha(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                style={{ borderColor: '#E5E7EB' }}
              />
            </div>
          </div>
          <button
            onClick={gerarPacote}
            disabled={loading}
            className="flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-white mx-auto transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #1B5E20, #2E7D32)' }}
          >
            <Rocket size={18} />
            {loading ? 'Gerando...' : 'Gerar pacote completo'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Abas */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {abas.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setAbaAtiva(id)}
                className={`flex items-center gap-2 flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                  abaAtiva === id ? 'bg-white shadow text-gray-800' : 'text-gray-500'
                }`}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>

          {(['checklist', 'schema', 'seed', 'env'] as const).map(aba => {
            if (abaAtiva !== aba) return null

            const conteudo =
              aba === 'checklist' ? pacote.checklist
              : aba === 'schema'  ? pacote.schema_sql
              : aba === 'seed'    ? pacote.seed_sql
              : pacote.env_vars

            const titulo =
              aba === 'checklist' ? 'Checklist de Deploy'
              : aba === 'schema'  ? 'Schema SQL — Execute no Supabase'
              : aba === 'seed'    ? 'Seed SQL — Dados iniciais'
              : 'Env Vars — Cole no Vercel'

            const arquivo =
              aba === 'checklist' ? `checklist-${cliente.dominio}.md`
              : aba === 'schema'  ? `schema-${cliente.dominio}.sql`
              : aba === 'seed'    ? `seed-${cliente.dominio}.sql`
              : `env-${cliente.dominio}.txt`

            const icones = { checklist: CheckCircle, schema: Database, seed: FileText, env: Key }
            const Icone = icones[aba]

            return (
              <div key={aba} className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                <div
                  className="px-5 py-4 border-b flex items-center justify-between"
                  style={{ background: 'rgba(46,125,50,0.04)' }}
                >
                  <h3 className="font-bold text-gray-700 flex items-center gap-2">
                    <Icone size={16} style={{ color: '#2E7D32' }} /> {titulo}
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => copiar(conteudo, aba)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border"
                      style={{ borderColor: '#2E7D32', color: '#2E7D32' }}
                    >
                      <Copy size={12} />
                      {copiado === aba ? 'Copiado!' : 'Copiar'}
                    </button>
                    <button
                      onClick={() => baixar(conteudo, arquivo)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                      style={{ background: '#2E7D32' }}
                    >
                      <Download size={12} /> Baixar
                    </button>
                  </div>
                </div>
                <pre
                  className="p-5 text-xs whitespace-pre-wrap font-mono overflow-auto"
                  style={{
                    maxHeight: 500,
                    background: aba === 'checklist' ? 'white' : '#1e1e1e',
                    color: aba === 'checklist' ? '#374151' : '#d4d4d4',
                  }}
                >
                  {conteudo}
                </pre>
                {aba === 'env' && (
                  <div
                    className="px-5 py-3 border-t text-xs text-yellow-800 font-medium"
                    style={{ background: '#FFF8E1' }}
                  >
                    ⚠️ Substitua SEU_PROJECT_ID, SUA_ANON_KEY e SUA_SERVICE_ROLE_KEY pelos valores reais do Supabase.
                  </div>
                )}
              </div>
            )
          })}

          <button
            onClick={() => setPacote(null)}
            className="text-sm text-gray-400 hover:text-gray-600 mx-auto block"
          >
            ← Gerar novamente
          </button>
        </div>
      )}
    </div>
  )
}
