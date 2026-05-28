import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Route, Bike, Calendar, User, Plus } from 'lucide-react'

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

  const statusStyle: Record<string, { bg: string; text: string; label: string }> = {
    pendente:     { bg: '#FFF8E1',  text: '#B45309', label: 'Pendente' },
    em_andamento: { bg: '#E8F5E9',  text: '#2E7D32', label: 'Em andamento' },
    concluida:    { bg: '#F5F5F5',  text: '#6B7280', label: 'Concluída' },
  }

  return (
    <div style={{ background: '#F5F7FA', minHeight: '100vh' }} className="p-1">

      {/* HEADER */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Rotas de entrega</h1>
          <p className="text-sm text-gray-500 mt-0.5">{rotas?.length ?? 0} rotas registradas</p>
        </div>
        <Link
          href="/distribuidor/rotas/nova"
          className="flex items-center gap-2 px-4 py-2.5 text-white text-sm font-bold rounded-xl transition hover:opacity-90"
          style={{ background: '#2E7D32' }}
        >
          <Plus size={16} />
          Nova rota
        </Link>
      </div>

      {rotas && rotas.length > 0 ? (
        <div className="space-y-3">
          {rotas.map((r: any) => {
            const pp  = paradasPorRota[r.id] ?? { total: 0, visitadas: 0 }
            const pct = pp.total > 0 ? Math.round(pp.visitadas / pp.total * 100) : 0
            const st  = statusStyle[r.status] ?? statusStyle.pendente

            return (
              <div
                key={r.id}
                className="bg-white rounded-2xl border p-5"
                style={{ borderColor: '#E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
              >
                <div className="flex items-start justify-between mb-3">

                  {/* Lado esquerdo */}
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: '#E8F5E9' }}
                    >
                      <Route size={18} style={{ color: '#2E7D32' }} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{r.nome}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        {r.motoboys?.nome && (
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <User size={11} />
                            {r.motoboys.nome}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Calendar size={11} />
                          {new Date(r.data_rota).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Lado direito */}
                  <span
                    className="text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                    style={{ background: st.bg, color: st.text }}
                  >
                    {st.label}
                  </span>
                </div>

                {/* Progresso */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#F3F4F6' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: '#2E7D32' }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0 flex items-center gap-1">
                    <Bike size={11} />
                    {pp.visitadas}/{pp.total} paradas
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div
          className="bg-white rounded-2xl border p-16 text-center"
          style={{ borderColor: '#E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
        >
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: '#F5F5F5' }}>
            <Route size={32} className="text-gray-300" />
          </div>
          <p className="font-bold text-gray-400 text-sm mb-4">Nenhuma rota criada ainda.</p>
          <Link
            href="/distribuidor/rotas/nova"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-white text-sm font-bold rounded-xl transition hover:opacity-90"
            style={{ background: '#2E7D32' }}
          >
            <Plus size={16} />
            Criar primeira rota
          </Link>
        </div>
      )}
    </div>
  )
}
