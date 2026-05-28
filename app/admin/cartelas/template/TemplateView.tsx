'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Upload, Eye, Settings, Grid, Save } from 'lucide-react'

interface EdicaoTemplate {
  id: string
  numero: number
  status: string
  template_cartela_url: string | null
  num_bingos: number | null
  giro_da_sorte_ativo: boolean | null
}

interface Props {
  edicao: EdicaoTemplate | null
  edicoes: EdicaoTemplate[]
}

export default function TemplateView({ edicao, edicoes }: Props) {
  const supabase = createClient()

  const [templateUrl, setTemplateUrl] = useState(edicao?.template_cartela_url ?? '')
  const [numBingos,   setNumBingos]   = useState(edicao?.num_bingos ?? 4)
  const [giroSorte,   setGiroSorte]   = useState(edicao?.giro_da_sorte_ativo ?? false)
  const [uploading,   setUploading]   = useState(false)
  const [salvando,    setSalvando]    = useState(false)
  const [mensagem,    setMensagem]    = useState('')

  if (!edicao) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
        <p className="text-gray-400 text-sm">Nenhuma edição ativa ou em rascunho.</p>
      </div>
    )
  }

  async function handleUploadTemplate(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)

    const ext  = file.name.split('.').pop()
    const path = `templates/cartela-${edicao!.id}-${Date.now()}.${ext}`

    const { error } = await supabase.storage
      .from('midias')
      .upload(path, file, { upsert: true })

    if (!error) {
      const { data: { publicUrl } } = supabase.storage
        .from('midias')
        .getPublicUrl(path)
      setTemplateUrl(publicUrl)
    }
    setUploading(false)
    e.target.value = ''
  }

  async function salvarConfiguracoes() {
    setSalvando(true)
    const { error } = await supabase
      .from('edicoes')
      .update({
        template_cartela_url: templateUrl || null,
        num_bingos:           numBingos,
        giro_da_sorte_ativo:  giroSorte,
      })
      .eq('id', edicao!.id)

    setSalvando(false)
    setMensagem(error ? 'Erro ao salvar: ' + error.message : 'Configurações salvas!')
    setTimeout(() => setMensagem(''), 3000)
  }

  const dezPorCartela = numBingos * 20

  return (
    <div className="space-y-6 pb-16">

      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Template da Cartela</h1>
        <p className="text-sm text-gray-500 mt-1">
          Edição {edicao.numero} — Configure a arte e as variáveis para impressão
        </p>
      </div>

      {/* Seletor de edição */}
      {edicoes.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {edicoes.map(e => (
            <a
              key={e.id}
              href={`/admin/cartelas/template?edicao=${e.id}`}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition border ${
                e.id === edicao.id
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300'
              }`}
            >
              Ed. {e.numero}
            </a>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* COLUNA ESQUERDA — configurações */}
        <div className="space-y-5">

          {/* Upload da arte */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <Upload size={15} className="text-emerald-600" />
              Arte da Cartela
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              Template PNG/JPG — tamanho recomendado: A5 a 300dpi (1748×2480px)
            </p>

            {templateUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={templateUrl}
                alt="Template atual"
                className="w-full rounded-lg mb-4 border border-gray-200"
              />
            )}

            <label className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border-2 border-dashed cursor-pointer transition-all hover:border-emerald-400 hover:bg-emerald-50">
              <Upload size={16} className="text-gray-400" />
              <span className="text-sm text-gray-500">
                {uploading ? 'Enviando...' : templateUrl ? 'Substituir template' : 'Enviar arte (PNG/JPG)'}
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUploadTemplate}
                disabled={uploading}
              />
            </label>

            {templateUrl && (
              <button
                onClick={() => setTemplateUrl('')}
                className="mt-2 text-xs text-red-500 hover:text-red-700"
              >
                Remover template
              </button>
            )}
          </div>

          {/* Configurações de variáveis */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Settings size={15} className="text-emerald-600" />
              Variáveis da Cartela
            </h3>

            <div className="mb-5">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Quantidade de Bingos por cartela
              </label>
              <div className="flex gap-2">
                {[4, 5, 6, 7, 8].map(n => (
                  <button
                    key={n}
                    onClick={() => setNumBingos(n)}
                    className="w-12 h-12 rounded-xl font-bold text-sm transition-all border"
                    style={{
                      background:   numBingos === n ? '#2E7D32' : '#F9FAFB',
                      color:        numBingos === n ? 'white'   : '#6B7280',
                      borderColor:  numBingos === n ? '#2E7D32' : '#E5E7EB',
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Cada bingo tem 5 colunas × 4 linhas = 20 dezenas · Total: {dezPorCartela} dezenas por cartela
              </p>
            </div>

            <div
              className="flex items-center justify-between p-4 rounded-xl"
              style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}
            >
              <div>
                <p className="font-semibold text-gray-800 text-sm">Giro da Sorte</p>
                <p className="text-xs text-gray-400">Campo extra de Giro da Sorte na cartela</p>
              </div>
              <button
                onClick={() => setGiroSorte(g => !g)}
                className="w-12 h-6 rounded-full transition-all relative flex-shrink-0"
                style={{ background: giroSorte ? '#2E7D32' : '#E5E7EB' }}
              >
                <div
                  className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all"
                  style={{ left: giroSorte ? '26px' : '2px' }}
                />
              </button>
            </div>
          </div>

          {/* Variáveis disponíveis */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Grid size={15} className="text-emerald-600" />
              Variáveis disponíveis no template
            </h3>
            <div className="space-y-2">
              {[
                { v: '{{NUMERO_TITULO}}',       d: 'Número do título (ex: 1000001-5)' },
                { v: '{{SERIE}}',               d: 'Série da cartela (ex: A001)' },
                { v: '{{EDICAO}}',              d: 'Número da edição' },
                { v: '{{BINGO_1}}…{{BINGO_8}}', d: 'Grade de dezenas de cada bingo' },
                { v: '{{QR_CODE}}',             d: 'QR Code PIX para pagamento' },
                { v: '{{GIRO_QUANTIDADE}}',     d: 'Quantidade de prêmios do Giro (opcional)' },
                { v: '{{GIRO_VALOR}}',          d: 'Valor do prêmio do Giro (opcional)' },
              ].map(({ v, d }) => (
                <div key={v} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50">
                  <code
                    className="text-xs font-mono px-2 py-0.5 rounded text-emerald-700 flex-shrink-0"
                    style={{ background: '#E8F5E9' }}
                  >
                    {v}
                  </code>
                  <span className="text-xs text-gray-500">{d}</span>
                </div>
              ))}
            </div>
          </div>

          {mensagem && (
            <div
              className="p-4 rounded-xl text-sm font-medium"
              style={{
                background: mensagem.startsWith('Erro') ? '#FFF5F5' : '#E8F5E9',
                color:      mensagem.startsWith('Erro') ? '#C62828' : '#2E7D32',
              }}
            >
              {mensagem}
            </div>
          )}

          <button
            onClick={salvarConfiguracoes}
            disabled={salvando}
            className="w-full py-3 rounded-xl font-semibold text-white text-sm transition hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #1B5E20, #2E7D32)' }}
          >
            <Save size={15} />
            {salvando ? 'Salvando...' : 'Salvar configurações'}
          </button>
        </div>

        {/* COLUNA DIREITA — preview */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Eye size={15} className="text-emerald-600" />
            Preview da Cartela
          </h3>

          <div
            className="border-2 border-dashed border-gray-200 rounded-xl overflow-hidden relative"
            style={{
              aspectRatio: '148/210',
              background:  templateUrl ? `url(${templateUrl}) center/cover no-repeat` : '#F9FAFB',
            }}
          >
            {!templateUrl && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-300">
                <Grid size={40} />
                <p className="text-xs mt-2">Faça upload do template</p>
              </div>
            )}

            {templateUrl && (
              <div className="absolute inset-0 p-2 overflow-hidden" style={{ fontSize: '9px' }}>
                <div className="bg-white/90 rounded px-2 py-0.5 mb-1 text-center font-mono font-bold text-gray-800">
                  Nº 1000001-5 · Série A001
                </div>
                <div className="grid gap-1" style={{ gridTemplateColumns: '1fr' }}>
                  {Array.from({ length: numBingos }).map((_, i) => (
                    <div key={i} className="bg-white/80 rounded p-1">
                      <p className="text-center font-bold text-emerald-800 mb-0.5">
                        {i + 1}º BINGO
                      </p>
                      <div className="grid grid-cols-5 gap-px">
                        {Array.from({ length: 20 }).map((_, j) => (
                          <div
                            key={j}
                            className="bg-emerald-50 rounded text-center font-mono py-px"
                          >
                            {String(((i * 20 + j) % 60) + 1).padStart(2, '0')}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {giroSorte && (
                    <div className="bg-yellow-50/90 rounded p-1 text-center">
                      <p className="font-bold text-yellow-800">GIRO DA SORTE</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 p-3 rounded-xl text-xs text-gray-500" style={{ background: '#F9FAFB' }}>
            <p className="font-semibold text-gray-700 mb-1">Dimensões para impressão:</p>
            <p>• Tamanho: A5 (14,8cm × 21cm)</p>
            <p>• Resolução recomendada: 300dpi = 1748×2480px</p>
            <p>• Formato aceito: PNG, JPG</p>
            <p>• {numBingos} bingos × 20 dezenas = {dezPorCartela} dezenas por cartela</p>
            {giroSorte && <p>• Giro da Sorte: ativado</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
