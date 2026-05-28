'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Wallet, TrendingUp, ArrowDownCircle,
  CheckCircle, Clock, XCircle, DollarSign,
} from 'lucide-react'

export default function SaquesView({
  pdv, lucroTotal, totalSacado, disponivelSaque,
  totalVendidas, comissaoPct, valorTitulo, saques, userId,
}: any) {
  const supabase = createClient()
  const [modalAberto, setModalAberto] = useState(false)
  const [chavePix, setChavePix]       = useState('')
  const [loading, setLoading]         = useState(false)
  const [mensagem, setMensagem]       = useState('')

  async function solicitarSaque() {
    if (!chavePix.trim()) return
    setLoading(true)
    const { error } = await supabase.from('saques_pdv').insert({
      pdv_id:         pdv.id,
      responsavel_id: userId,
      valor:          disponivelSaque,
      chave_pix:      chavePix,
      status:         'pendente',
    })
    setLoading(false)
    if (error) {
      setMensagem('Erro ao solicitar saque: ' + error.message)
    } else {
      setMensagem('Solicitação enviada com sucesso!')
      setModalAberto(false)
      setTimeout(() => window.location.reload(), 1500)
    }
  }

  function badgeStatus(status: string) {
    const map: Record<string, { bg: string; color: string; label: string; icon: React.ReactNode }> = {
      pendente:  { bg: '#FFF8E1', color: '#F59E0B', label: 'Pendente',  icon: <Clock size={12} /> },
      aprovado:  { bg: '#E3F2FD', color: '#1565C0', label: 'Aprovado',  icon: <CheckCircle size={12} /> },
      pago:      { bg: '#E8F5E9', color: '#2E7D32', label: 'Pago',      icon: <CheckCircle size={12} /> },
      rejeitado: { bg: '#FFEBEE', color: '#C62828', label: 'Rejeitado', icon: <XCircle size={12} /> },
    }
    const s = map[status] ?? map.pendente
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold"
        style={{ background: s.bg, color: s.color }}
      >
        {s.icon} {s.label}
      </span>
    )
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-900">Saques</h1>
        <p className="text-sm text-gray-500 mt-1">
          Comissão de {comissaoPct}% sobre cada título vendido
        </p>
      </div>

      {mensagem && (
        <div className="p-4 rounded-xl text-sm font-medium" style={{ background: '#E8F5E9', color: '#2E7D32' }}>
          {mensagem}
        </div>
      )}

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: 'Lucro total',
            valor: `R$ ${lucroTotal.toFixed(2).replace('.', ',')}`,
            sub:   `${totalVendidas} vendas × ${comissaoPct}%`,
            icon:  TrendingUp,
            cor:   '#2E7D32', bg: '#E8F5E9',
          },
          {
            label: 'Total sacado',
            valor: `R$ ${totalSacado.toFixed(2).replace('.', ',')}`,
            sub:   'Saques pagos',
            icon:  ArrowDownCircle,
            cor:   '#1565C0', bg: '#E3F2FD',
          },
          {
            label: 'Disponível',
            valor: `R$ ${disponivelSaque.toFixed(2).replace('.', ',')}`,
            sub:   'Disponível para saque',
            icon:  Wallet,
            cor:   '#E65100', bg: '#FFF3E0',
          },
        ].map(({ label, valor, sub, icon: Icon, cor, bg }) => (
          <div key={label} className="bg-white rounded-2xl border p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: bg }}>
                <Icon size={20} style={{ color: cor }} />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
                <p className="font-black text-xl text-gray-900">{valor}</p>
              </div>
            </div>
            <p className="text-xs text-gray-400">{sub}</p>
          </div>
        ))}
      </div>

      {/* Botão solicitar saque */}
      {disponivelSaque > 0 && (
        <button
          onClick={() => setModalAberto(true)}
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #1B5E20, #2E7D32)' }}
        >
          <DollarSign size={18} />
          Solicitar saque de R$ {disponivelSaque.toFixed(2).replace('.', ',')}
        </button>
      )}

      {/* Histórico de saques */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div
          className="px-5 py-4 border-b flex items-center gap-2"
          style={{ background: 'rgba(46,125,50,0.04)' }}
        >
          <Wallet size={16} style={{ color: '#2E7D32' }} />
          <h2 className="font-bold text-gray-700 text-sm uppercase tracking-wider">
            Histórico de Saques
          </h2>
        </div>

        {saques.length === 0 ? (
          <div className="p-12 text-center">
            <Wallet size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">Nenhum saque realizado ainda</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {saques.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="font-bold text-gray-800">
                    R$ {Number(s.valor).toFixed(2).replace('.', ',')}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Chave PIX: {s.chave_pix} · {new Date(s.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                {badgeStatus(s.status)}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal saque */}
      {modalAberto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}
        >
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="font-black text-gray-900 text-lg mb-1">Solicitar Saque</h3>
            <p className="text-sm text-gray-500 mb-4">
              Valor disponível: <strong>R$ {disponivelSaque.toFixed(2).replace('.', ',')}</strong>
            </p>

            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Chave PIX
            </label>
            <input
              type="text"
              placeholder="CPF, email, telefone ou chave aleatória"
              value={chavePix}
              onChange={e => setChavePix(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border text-gray-800 focus:outline-none focus:ring-2 mb-4"
              style={{ borderColor: '#E5E7EB' }}
            />

            <div className="flex gap-3">
              <button
                onClick={() => setModalAberto(false)}
                className="flex-1 py-3 rounded-xl border font-bold text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={solicitarSaque}
                disabled={loading || !chavePix.trim()}
                className="flex-1 py-3 rounded-xl font-bold text-white disabled:opacity-40"
                style={{ background: '#2E7D32' }}
              >
                {loading ? 'Enviando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
