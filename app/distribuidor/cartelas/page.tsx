import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import EnviarParaPDV from './EnviarParaPDV'
import DevolverCartelas from './DevolverCartelas'

export default async function CartelasDistribuidorPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: dist } = await supabase
    .from('distribuidores').select('id').eq('user_id', user.id).single()

  if (!dist) redirect('/distribuidor/dashboard')

  // Só as cartelas deste distribuidor
  const { data: cartelas } = await supabase
    .from('cartelas')
    .select('*, edicoes(numero, data_sorteio)')
    .eq('distribuidor_id', dist.id)
    .order('codigo', { ascending: true })

  // Resumo por status
  const total = cartelas?.length ?? 0
  const comDist = cartelas?.filter(c => c.status === 'em_estoque_distribuidor').length ?? 0
  const comPDV  = cartelas?.filter(c => c.status === 'em_estoque_pdv').length ?? 0
  const vendidas = cartelas?.filter(c => c.status === 'paga').length ?? 0
  const devolvidas = cartelas?.filter(c => c.status === 'cancelada').length ?? 0

  // Intervalo de cada edição
  const porEdicao: Record<string, { numero: number; data: string; min: string; max: string; total: number; vendidas: number; comDist: number; comPDV: number }> = {}
  cartelas?.forEach((c: any) => {
    const eid = c.edicao_id
    if (!porEdicao[eid]) {
      porEdicao[eid] = {
        numero: c.edicoes?.numero,
        data: c.edicoes?.data_sorteio,
        min: c.codigo,
        max: c.codigo,
        total: 0, vendidas: 0, comDist: 0, comPDV: 0,
      }
    }
    const e = porEdicao[eid]
    if (c.codigo < e.min) e.min = c.codigo
    if (c.codigo > e.max) e.max = c.codigo
    e.total++
    if (c.status === 'paga') e.vendidas++
    if (c.status === 'em_estoque_distribuidor') e.comDist++
    if (c.status === 'em_estoque_pdv') e.comPDV++
  })

  // PDVs do distribuidor para envio
  const { data: pdvs } = await supabase
    .from('pontos_de_venda')
    .select('id, nome, responsavel_nome')
    .eq('distribuidor_id', dist.id)
    .eq('status', 'ativo')

  // Edições com cartelas disponíveis para envio
  const edicoesComEstoque = Object.entries(porEdicao)
    .filter(([, e]) => e.comDist > 0)
    .map(([edicaoId, e]) => ({ edicaoId, ...e }))

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Minhas cartelas</h1>
        <p className="text-sm text-gray-500 mt-1">Apenas as cartelas do seu lote</p>
      </div>

      {/* Resumo geral */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {[
          { label: 'Total recebidas', value: total, color: 'text-gray-900' },
          { label: 'Comigo',          value: comDist, color: 'text-amber-600' },
          { label: 'Nos PDVs',        value: comPDV,  color: 'text-blue-600' },
          { label: 'Vendidas',        value: vendidas, color: 'text-emerald-600' },
          { label: 'Devolvidas',      value: devolvidas, color: 'text-red-500' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">{c.label}</p>
            <p className={`text-xl font-semibold ${c.color}`}>{c.value.toLocaleString('pt-BR')}</p>
          </div>
        ))}
      </div>

      {/* Lotes por edição */}
      {Object.entries(porEdicao).length > 0 ? (
        <div className="space-y-4 mb-6">
          {Object.entries(porEdicao).map(([edicaoId, e]) => (
            <div key={edicaoId} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Edição Nº {e.numero}</h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Sorteio: {new Date(e.data).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Seu intervalo</p>
                  <p className="text-sm font-mono font-medium text-gray-900">
                    {e.min} → {e.max}
                  </p>
                </div>
              </div>

              {/* Barra de progresso */}
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>{e.vendidas} vendidas de {e.total}</span>
                  <span>{e.total > 0 ? Math.round(e.vendidas / e.total * 100) : 0}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
                  <div className="h-full bg-emerald-500 transition-all"
                    style={{ width: `${e.total > 0 ? (e.vendidas / e.total) * 100 : 0}%` }} />
                  <div className="h-full bg-blue-400 transition-all"
                    style={{ width: `${e.total > 0 ? (e.comPDV / e.total) * 100 : 0}%` }} />
                  <div className="h-full bg-amber-400 transition-all"
                    style={{ width: `${e.total > 0 ? (e.comDist / e.total) * 100 : 0}%` }} />
                </div>
                <div className="flex gap-4 mt-1.5 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>Vendidas: {e.vendidas}</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block"></span>Nos PDVs: {e.comPDV}</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>Comigo: {e.comDist}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center mb-6">
          <p className="text-gray-400 text-sm">Nenhuma cartela recebida ainda.</p>
          <p className="text-gray-400 text-xs mt-1">O administrador precisa enviar cartelas para você.</p>
        </div>
      )}

      {/* Ações */}
      {(pdvs?.length ?? 0) > 0 && edicoesComEstoque.length > 0 && (
        <div className="grid grid-cols-2 gap-6">
          <EnviarParaPDV
            pdvs={pdvs ?? []}
            edicoesComEstoque={edicoesComEstoque}
            distribuidorId={dist.id}
          />
          <DevolverCartelas
            distribuidorId={dist.id}
            edicoesComEstoque={edicoesComEstoque}
          />
        </div>
      )}
    </div>
  )
}
