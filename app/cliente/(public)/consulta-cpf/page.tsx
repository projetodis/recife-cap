'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Ticket, ArrowRight, Shield } from 'lucide-react'

function formatarCPF(valor: string): string {
  return valor
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    .slice(0, 14)
}

export default function ConsultaCPFPage() {
  const [cpf,     setCpf]     = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  function handleConsultar() {
    const cpfLimpo = cpf.replace(/\D/g, '')
    if (cpfLimpo.length !== 11) return
    setLoading(true)
    router.push(`/cliente/consulta/${cpfLimpo}`)
  }

  return (
    <div className="min-h-screen" style={{ background: '#F5F7FA' }}>

      {/* Hero */}
      <section
        className="relative overflow-hidden py-16 text-center"
        style={{
          background: 'radial-gradient(ellipse at 30% 50%, #2E7D32 0%, #1B5E20 40%, #0D3B16 100%)',
        }}
      >
        {/* Pontos dourados — superior direito */}
        <div
          className="absolute top-0 right-0 w-72 h-72 opacity-30 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, #FFC107 1px, transparent 1px)',
            backgroundSize:  '14px 14px',
          }}
        />
        {/* Pontos dourados — inferior esquerdo */}
        <div
          className="absolute bottom-0 left-0 w-48 h-48 opacity-20 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, #FFC107 1px, transparent 1px)',
            backgroundSize:  '14px 14px',
          }}
        />

        <div className="relative z-10 px-6">
          <h1
            className="font-black text-white leading-tight mb-3"
            style={{ fontSize: 'clamp(36px, 6vw, 64px)' }}
          >
            Bem-vindo ao{' '}
            <span style={{ color: '#FFC107' }}>Recife Cap</span>
          </h1>

          <div className="w-16 h-1 rounded-full mx-auto mb-4" style={{ background: '#FFC107' }} />

          <p className="text-green-200 text-lg">
            Compre seus títulos ou consulte suas compras anteriores
          </p>
        </div>
      </section>

      {/* Card principal */}
      <div className="max-w-3xl mx-auto px-4 py-12 pb-16">
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">

          <div className="grid grid-cols-1 md:grid-cols-2">

            {/* Coluna esquerda — Comprar */}
            <div className="p-8 border-b md:border-b-0 md:border-r" style={{ borderColor: '#E5E7EB' }}>
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: '#E8F5E9' }}
                >
                  <Ticket size={20} style={{ color: '#2E7D32' }} />
                </div>
                <div>
                  <p className="font-bold text-gray-800">Comprar títulos</p>
                  <p className="text-xs text-gray-400">Adquira novos títulos</p>
                </div>
              </div>

              <p className="text-sm text-gray-500 mt-4 mb-6">
                Participe do próximo sorteio e concorra a prêmios incríveis ajudando o Hospital Infantil Varela Santiago.
              </p>

              <a
                href="/cliente/compra"
                className="flex items-center justify-between w-full py-4 px-6 rounded-2xl font-black text-white text-base transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #1B5E20, #2E7D32)' }}
              >
                <span>Comprar</span>
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
                  <ArrowRight size={18} className="text-white" />
                </div>
              </a>
            </div>

            {/* Coluna direita — Consultar */}
            <div className="p-8">
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: '#E8F5E9' }}
                >
                  <Search size={20} style={{ color: '#2E7D32' }} />
                </div>
                <div>
                  <p className="font-bold text-gray-800">Consultar títulos</p>
                  <p className="text-xs text-gray-400">Pesquise suas últimas compras</p>
                </div>
              </div>

              <div className="mt-4 mb-4">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  CPF *
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={e => setCpf(formatarCPF(e.target.value))}
                  onKeyDown={e => e.key === 'Enter' && handleConsultar()}
                  className="w-full px-4 py-3 rounded-xl border text-gray-800 font-medium tracking-wider focus:outline-none focus:ring-2"
                  style={{
                    borderColor: '#E5E7EB',
                    fontSize:    '16px',
                    '--tw-ring-color': '#2E7D32',
                  } as React.CSSProperties}
                />
              </div>

              <button
                onClick={handleConsultar}
                disabled={cpf.replace(/\D/g, '').length !== 11 || loading}
                className="flex items-center justify-between w-full py-4 px-6 rounded-2xl font-black text-white text-base transition-all hover:opacity-90 disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #1B5E20, #2E7D32)' }}
              >
                <span>Consultar</span>
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ArrowRight size={18} className="text-white" />
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Footer do card */}
          <div
            className="flex items-center justify-center gap-2 px-8 py-4 border-t"
            style={{ borderColor: '#F5F5F5', background: '#FAFAFA' }}
          >
            <Shield size={14} style={{ color: '#2E7D32' }} />
            <span className="text-xs text-gray-400">
              Filantropia Premiável · Regulamentado SUSEP
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
