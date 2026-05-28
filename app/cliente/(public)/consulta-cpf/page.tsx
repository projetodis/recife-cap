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
    <div className="min-h-screen flex flex-col" style={{ background: '#F5F7FA' }}>

      {/* Header */}
      <div
        className="py-16 text-center"
        style={{ background: 'linear-gradient(135deg, #1B5E20, #2E7D32)' }}
      >
        <div
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5"
          style={{ background: 'rgba(255,255,255,0.15)' }}
        >
          <Ticket size={32} className="text-white" />
        </div>
        <h1 className="text-4xl font-black text-white mb-3">Meus Títulos</h1>
        <p className="text-green-200 text-lg">Consulte seus títulos pelo CPF</p>
      </div>

      {/* Card */}
      <div className="flex-1 flex items-start justify-center px-4 pt-12 pb-16">
        <div className="bg-white rounded-3xl shadow-lg p-8 w-full max-w-md">

          {/* Dois cards de ação */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <a
              href="/cliente/compra"
              className="p-4 rounded-2xl border-2 text-center transition-all hover:shadow-md"
              style={{ borderColor: 'rgba(46,125,50,0.2)' }}
            >
              <Ticket size={24} style={{ color: '#2E7D32' }} className="mx-auto mb-2" />
              <p className="font-bold text-gray-800 text-sm">Comprar títulos</p>
              <p className="text-xs text-gray-400 mt-1">Adquira novos títulos</p>
            </a>
            <div
              className="p-4 rounded-2xl border-2 text-center"
              style={{ borderColor: '#2E7D32', background: 'rgba(46,125,50,0.04)' }}
            >
              <Search size={24} style={{ color: '#2E7D32' }} className="mx-auto mb-2" />
              <p className="font-bold text-sm" style={{ color: '#2E7D32' }}>Consultar títulos</p>
              <p className="text-xs text-gray-400 mt-1">Pesquise suas compras</p>
            </div>
          </div>

          {/* Formulário */}
          <div className="space-y-4">
            <div>
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
                className="w-full px-4 py-3 rounded-xl border text-gray-800 font-medium text-lg tracking-wider focus:outline-none focus:ring-2"
                style={{
                  borderColor: '#E5E7EB',
                  '--tw-ring-color': '#2E7D32',
                } as React.CSSProperties}
              />
            </div>

            <button
              onClick={handleConsultar}
              disabled={cpf.replace(/\D/g, '').length !== 11 || loading}
              className="w-full py-4 rounded-xl font-black text-white text-lg flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #1B5E20, #2E7D32)' }}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Search size={20} />
                  Consultar
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>

          {/* Rodapé SUSEP */}
          <div className="flex items-center gap-2 mt-6 pt-6 border-t justify-center">
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
