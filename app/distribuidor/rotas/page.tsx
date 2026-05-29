import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Route, Plus, User, Calendar } from 'lucide-react'

export default async function RotasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: dist } = await supabase
    .from('distribuidores').select('id').eq('user_id', user.id).single()

  const { data: rotas } = await supabase
    .from('rotas_entrega')
    .select('*, motoboys(nome, veiculo)')
    .eq('distribuidor_id', dist?.id)
    .order('data_rota', { ascending: false })
    .limit(30)

  const rotaIds = rotas?.map(r => r.id) ?? []
  const { data: paradas } = rotaIds.length > 0
    ? await supabase.from('paradas_rota').select('rota_id, status').in('rota_id', rotaIds)
    : { data: [] }

  const paradasPorRota: Record<string, { total: number; visitadas: number }> = {}
  paradas?.forEach(p => {
    if (!paradasPorRota[p.rota_id]) paradasPorRota[p.rota_id] = { total: 0, visitadas: 0 }
    paradasPorRota[p.rota_id].total++
    if (p.status === 'visitado') paradasPorRota[p.rota_id].visitadas++
  })

  // Enriquecer rotas com dados de paradas e motoboy
  const rotasEnriquecidas = (rotas ?? []).map((r: any) => {
    const pp = paradasPorRota[r.id] ?? { total: 0, visitadas: 0 }
    return {
      ...r,
      motoboy_nome:       r.motoboys?.nome ?? null,
      total_paradas:      pp.total,
      paradas_concluidas: pp.visitadas,
    }
  })

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Rotas de entrega</h1>
          <p className="text-sm text-gray-500">{rotasEnriquecidas.length} rotas registradas</p>
        </div>
        <a href="/distribuidor/rotas/nova"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #1B5E20, #2E7D32)' }}>
          <Plus size={18} />
          Nova rota
        </a>
      </div>

      {!rotasEnriquecidas.length ? (
        <div className="bg-white rounded-2xl border p-12 shadow-sm text-center">
          <Route size={48} className="text-gray-200 mx-auto mb-4" />
          <p className="font-bold text-gray-400 text-lg">Nenhuma rota registrada ainda</p>
          <a href="/distribuidor/rotas/nova"
            className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-xl font-bold text-white"
            style={{ background: '#2E7D32' }}>
            <Plus size={16} /> Criar primeira rota
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          {rotasEnriquecidas.map(rota => {
            const pct = rota.total_paradas > 0
              ? Math.round((rota.paradas_concluidas / rota.total_paradas) * 100)
              : 0
            const statusCfg = ({
              pendente:     { bg: '#FFF8E1', color: '#B45309', label: 'Pendente' },
              em_andamento: { bg: '#E8F5E9', color: '#2E7D32', label: 'Em andamento' },
              concluida:    { bg: '#F5F5F5', color: '#9E9E9E', label: 'Concluída' },
            } as Record<string, { bg: string; color: string; label: string }>)[rota.status]
              ?? { bg: '#FFF8E1', color: '#B45309', label: rota.status }

            return (
              <div key={rota.id}
                className="bg-white rounded-2xl border shadow-sm p-5 hover:shadow-md transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: '#E8F5E9' }}>
                      <Route size={18} style={{ color: '#2E7D32' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-gray-900">{rota.nome || 'Rota sem nome'}</p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {rota.motoboy_nome && (
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <User size={11} /> {rota.motoboy_nome}
                          </span>
                        )}
                        {rota.data_rota && (
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Calendar size={11} />
                            {new Date(rota.data_rota + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                      style={{ background: statusCfg.bg, color: statusCfg.color }}>
                      {statusCfg.label}
                    </span>
                    <span className="text-xs text-gray-400">
                      {rota.paradas_concluidas}/{rota.total_paradas} paradas
                    </span>
                  </div>
                </div>
                {rota.total_paradas > 0 && (
                  <div className="mt-4">
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          background: 'linear-gradient(90deg, #2E7D32, #66BB6A)',
                        }} />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
