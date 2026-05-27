import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

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

  // Paradas por rota
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

  const statusColor: Record<string, string> = {
    pendente:     'bg-amber-50 text-amber-700',
    em_andamento: 'bg-blue-50 text-blue-700',
    concluida:    'bg-emerald-50 text-emerald-700',
  }
  const statusLabel: Record<string, string> = {
    pendente:     'Pendente',
    em_andamento: 'Em andamento',
    concluida:    'Concluída',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Rotas de entrega</h1>
          <p className="text-sm text-gray-500 mt-1">{rotas?.length ?? 0} rotas registradas</p>
        </div>
        <Link href="/distribuidor/rotas/nova"
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition">
          + Nova rota
        </Link>
      </div>

      {rotas && rotas.length > 0 ? (
        <div className="space-y-3">
          {rotas.map((r: any) => {
            const pp = paradasPorRota[r.id] ?? { total: 0, visitadas: 0 }
            const prog = pp.total > 0 ? Math.round(pp.visitadas / pp.total * 100) : 0
            return (
              <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-medium text-gray-900">{r.nome}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      🛵 {r.motoboys?.nome} · {new Date(r.data_rota).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor[r.status]}`}>
                    {statusLabel[r.status]}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${prog}%` }} />
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {pp.visitadas}/{pp.total} paradas
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <p className="text-4xl mb-4">🗺️</p>
          <p className="text-gray-400 text-sm mb-4">Nenhuma rota criada ainda.</p>
          <Link href="/distribuidor/rotas/nova"
            className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition">
            Criar primeira rota
          </Link>
        </div>
      )}
    </div>
  )
}
