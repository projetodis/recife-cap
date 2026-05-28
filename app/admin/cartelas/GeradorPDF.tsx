'use client'

import { useState } from 'react'
import { FileText, X, Loader2, CheckCircle, AlertCircle, Image } from 'lucide-react'

interface EdicaoProps {
  id: string
  numero: number
  data_sorteio: string
  hora_sorteio: string
  valor_unitario: number
  premio_principal: number
  template_cartela_url?: string | null
}

interface CartelaProps {
  id: string
  codigo: string
  dv: string
  dezenas_sorteio_1: string[]
  dezenas_sorteio_2: string[]
}

interface Props {
  edicao: EdicaoProps
  cartelas: CartelaProps[]
  onClose: () => void
}

type Estado = 'idle' | 'gerando' | 'concluido' | 'erro'

function formatarDataBR(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
  })
}

export default function GeradorPDF({ edicao, cartelas, onClose }: Props) {
  const [quantidade,    setQuantidade]    = useState(Math.min(10, cartelas.length))
  const [estado,        setEstado]        = useState<Estado>('idle')
  const [progresso,     setProgresso]     = useState('')
  const [erroMsg,       setErroMsg]       = useState('')
  const [usarTemplate,  setUsarTemplate]  = useState(!!edicao.template_cartela_url)

  const total         = Math.min(quantidade, cartelas.length)
  const temTemplate   = !!edicao.template_cartela_url
  const endpointAtivo = usarTemplate && temTemplate
    ? '/api/cartelas/pdf-template'
    : '/api/cartelas/pdf-puppeteer'

  async function gerarPDF() {
    if (total === 0) return
    setEstado('gerando')
    setProgresso('Preparando dados...')
    setErroMsg('')

    try {
      const lote          = cartelas.slice(0, total)
      const dataFormatada = formatarDataBR(edicao.data_sorteio)

      const payload = {
        cartelas: lote.map(c => ({
          numero:       `${c.codigo}-${c.dv}`,
          edicao:       edicao.numero,
          data_sorteio: dataFormatada,
          dezenas:      [
            ...c.dezenas_sorteio_1.map(Number),
            ...c.dezenas_sorteio_2.map(Number),
          ],
          qr_code_pix: `NATALCAP:${c.id}:${c.codigo}`,
        })),
        ...(usarTemplate && temTemplate
          ? { template_url: edicao.template_cartela_url }
          : {}),
      }

      setProgresso(`Gerando ${total} cartela${total !== 1 ? 's' : ''} no servidor...`)

      const res = await fetch(endpointAtivo, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }

      setProgresso('Baixando PDF...')

      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `recife-cap-edicao-${edicao.numero}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)

      setEstado('concluido')
    } catch (e: unknown) {
      setErroMsg(e instanceof Error ? e.message : 'Erro desconhecido')
      setEstado('erro')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-violet-600 flex items-center justify-center">
              <FileText size={18} className="text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Gerar PDF de Cartelas</h2>
              <p className="text-xs text-gray-400">Edição #{edicao.numero}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={estado === 'gerando'}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition disabled:opacity-40"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">

          {/* Info */}
          <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-600 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-gray-400">Disponíveis</span>
              <span className="font-medium text-gray-900">{cartelas.length.toLocaleString('pt-BR')} cartelas</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Formato</span>
              <span className="font-medium text-gray-900">A4 Landscape · 2 por página</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Motor</span>
              <span className="font-medium text-gray-900">
                {usarTemplate && temTemplate ? 'Template customizado' : 'Puppeteer (Chromium)'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Páginas estimadas</span>
              <span className="font-medium text-gray-900">{Math.ceil(total / 2).toLocaleString('pt-BR')}</span>
            </div>
          </div>

          {/* Usar template */}
          {temTemplate && (
            <div className="flex items-center justify-between p-3 rounded-xl border border-violet-100 bg-violet-50">
              <div className="flex items-center gap-2">
                <Image size={15} className="text-violet-600" />
                <div>
                  <p className="text-sm font-medium text-violet-900">Usar arte da edição</p>
                  <p className="text-xs text-violet-500">Template configurado em Template Cartela</p>
                </div>
              </div>
              <button
                onClick={() => setUsarTemplate(u => !u)}
                className="w-10 h-5 rounded-full transition-all relative flex-shrink-0"
                style={{ background: usarTemplate ? '#7C3AED' : '#E5E7EB' }}
              >
                <div
                  className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all"
                  style={{ left: usarTemplate ? '22px' : '2px' }}
                />
              </button>
            </div>
          )}

          {/* Preview do template */}
          {usarTemplate && temTemplate && edicao.template_cartela_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={edicao.template_cartela_url}
              alt="Template"
              className="w-full rounded-xl border border-gray-200 max-h-40 object-contain bg-gray-50"
            />
          )}

          {/* Quantidade */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Quantidade a gerar
            </label>
            <input
              type="number"
              min={1}
              max={Math.min(200, cartelas.length)}
              value={quantidade}
              onChange={e => setQuantidade(Math.max(1, Math.min(200, Number(e.target.value))))}
              disabled={estado === 'gerando'}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50"
            />
            <p className="text-xs text-amber-600 mt-1.5">
              Máximo 200 por vez
            </p>
          </div>

          {/* Status */}
          {estado === 'gerando' && (
            <div className="flex items-center gap-3 bg-violet-50 border border-violet-100 rounded-xl px-4 py-3">
              <Loader2 size={18} className="text-violet-500 animate-spin flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-violet-800">{progresso}</p>
                <p className="text-xs text-violet-500 mt-0.5">Não feche esta janela</p>
              </div>
            </div>
          )}
          {estado === 'concluido' && (
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
              <CheckCircle size={18} className="text-emerald-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-emerald-800">PDF gerado com sucesso!</p>
                <p className="text-xs text-emerald-600 mt-0.5">Download iniciado automaticamente.</p>
              </div>
            </div>
          )}
          {estado === 'erro' && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <AlertCircle size={18} className="text-red-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-800">Erro ao gerar PDF</p>
                <p className="text-xs text-red-600 mt-0.5 break-words">{erroMsg}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex gap-3">
          <button
            onClick={onClose}
            disabled={estado === 'gerando'}
            className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition disabled:opacity-40"
          >
            {estado === 'concluido' ? 'Fechar' : 'Cancelar'}
          </button>
          <button
            onClick={gerarPDF}
            disabled={estado === 'gerando' || total === 0}
            className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition flex items-center justify-center gap-2"
          >
            {estado === 'gerando' ? (
              <><Loader2 size={15} className="animate-spin" />Gerando...</>
            ) : (
              <><FileText size={15} />Gerar PDF</>
            )}
          </button>
        </div>

      </div>
    </div>
  )
}
