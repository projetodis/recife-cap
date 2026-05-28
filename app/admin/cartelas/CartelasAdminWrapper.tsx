'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FileDown, Plus } from 'lucide-react'
import DistribuirCartelas from './DistribuirCartelas'
import GeradorPDF from './GeradorPDF'

interface EdicaoResumida {
  id: string
  numero: number
  status: string
  total_cartelas: number
  data_sorteio: string
  hora_sorteio: string
  valor_unitario: number
  premio_principal: number
  template_cartela_url?: string | null
}

interface ResumoCartelas {
  total: number
  em_estoque: number
  distribuidas: number
  vendidas: number
}

interface Distribuidor {
  id: string
  nivel: number
  comissao_pct: number
  profiles: { nome: string } | null
}

interface CartelaPDF {
  id: string
  codigo: string
  dv: string
  dezenas_sorteio_1: string[]
  dezenas_sorteio_2: string[]
}

interface Props {
  edicoes: EdicaoResumida[]
  edicaoSelecionada: string | undefined
  resumo: ResumoCartelas | null
  distribuidores: Distribuidor[]
  contPorDist: Record<string, number>
  cartelasParaPDF: CartelaPDF[]
  edicaoObj: EdicaoResumida | null
}

export default function CartelasAdminWrapper({
  edicoes,
  edicaoSelecionada,
  resumo,
  distribuidores,
  contPorDist,
  cartelasParaPDF,
  edicaoObj,
}: Props) {
  const [showGerador, setShowGerador] = useState(false)

  const podeGerarPDF = !!edicaoObj && cartelasParaPDF.length > 0

  return (
    <div>
      {/* HEADER */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-semibold text-gray-900">Gestao de cartelas</h1>
          <p className="text-sm text-gray-500 mt-1">Distribuicao e rastreamento por edicao</p>
        </div>
        <div className="flex items-center gap-2">
          {podeGerarPDF && (
            <button
              onClick={() => setShowGerador(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition"
            >
              <FileDown size={15} />
              Gerar PDF das cartelas
            </button>
          )}
          <Link
            href="/admin/edicoes/nova"
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
          >
            <Plus size={15} />
            Nova edicao
          </Link>
        </div>
      </div>

      {/* SELETOR DE EDIÇÃO */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {edicoes.map(e => (
          <Link
            key={e.id}
            href={`/admin/cartelas?edicao=${e.id}`}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition border ${
              edicaoSelecionada === e.id
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300'
            }`}
          >
            Ed. {e.numero} — {new Date(e.data_sorteio + 'T00:00:00').toLocaleDateString('pt-BR')}
          </Link>
        ))}
      </div>

      {resumo ? (
        <>
          {/* RESUMO */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total geradas',    value: resumo.total.toLocaleString('pt-BR'),        color: 'text-gray-900' },
              { label: 'No estoque admin', value: resumo.em_estoque.toLocaleString('pt-BR'),   color: 'text-amber-600' },
              { label: 'Distribuidas',     value: resumo.distribuidas.toLocaleString('pt-BR'), color: 'text-blue-600' },
              { label: 'Vendidas/pagas',   value: resumo.vendidas.toLocaleString('pt-BR'),     color: 'text-emerald-600' },
            ].map(c => (
              <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-xs text-gray-500 mb-2">{c.label}</p>
                <p className={`text-2xl font-semibold ${c.color}`}>{c.value}</p>
              </div>
            ))}
          </div>

          {/* BARRA DE PROGRESSO */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
            <div className="flex justify-between text-xs text-gray-500 mb-2">
              <span>Progresso de vendas</span>
              <span>{resumo.total > 0 ? Math.round(resumo.vendidas / resumo.total * 100) : 0}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${resumo.total > 0 ? (resumo.vendidas / resumo.total) * 100 : 0}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-2">
              <span>{resumo.vendidas.toLocaleString('pt-BR')} vendidas</span>
              <span>{(resumo.total - resumo.vendidas).toLocaleString('pt-BR')} restantes</span>
            </div>
          </div>

          {/* DISTRIBUIDORES + FORMULÁRIO */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-medium text-gray-900 mb-4">Estoque por distribuidor</h2>
              {distribuidores.length > 0 ? (
                <div className="space-y-3">
                  {distribuidores.map(d => (
                    <div key={d.id} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="text-gray-900 font-medium">{d.profiles?.nome}</p>
                        <p className="text-xs text-gray-400">nv:{d.nivel} · {d.comissao_pct}%</p>
                      </div>
                      <span className="text-emerald-600 font-medium">
                        {(contPorDist[d.id] ?? 0).toLocaleString('pt-BR')} cartelas
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400">Nenhum distribuidor ativo</p>
              )}
            </div>

            <DistribuirCartelas
              edicaoId={edicaoSelecionada!}
              distribuidores={distribuidores}
              disponiveis={resumo.em_estoque}
            />
          </div>
        </>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <p className="text-gray-400 text-sm">Selecione uma edicao acima ou crie uma nova.</p>
        </div>
      )}

      {/* MODAL GERADOR PDF */}
      {showGerador && edicaoObj && (
        <GeradorPDF
          edicao={edicaoObj}
          cartelas={cartelasParaPDF}
          onClose={() => setShowGerador(false)}
        />
      )}
    </div>
  )
}
