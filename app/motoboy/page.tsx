import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import Link             from 'next/link'
import {
  MapPin, Package, CheckCircle, Clock,
  TrendingUp, Navigation, ChevronRight,
  Bike, Calendar,
} from 'lucide-react'

export default async function MotoboyDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('nome')
    .eq('id', user.id)
    .single()

  const { data: motoboy } = await supabase
    .from('motoboys')
    .select('id, nome, status')
    .eq('user_id', user.id)
    .single()

  if (!motoboy) redirect('/login')

  const hoje = new Date().toISOString().split('T')[0]
  const dataHoje = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  const { data: rotasList } = await supabase
    .from('rotas_entrega')
    .select('*')
    .eq('motoboy_id', motoboy.id)
    .eq('data_rota', hoje)
    .in('status', ['pendente', 'em_andamento', 'concluida'])
    .order('created_at', { ascending: true })

  const rotasComParadas = rotasList ? await Promise.all(
    rotasList.map(async (r) => {
      const { data: paradas } = await supabase
        .from('paradas_rota')
        .select('id, status, ordem')
        .eq('rota_id', r.id)
        .order('ordem', { ascending: true })
      return { ...r, paradas: paradas ?? [] }
    })
  ) : []

  const totalParadas = rotasComParadas.reduce((acc, r) => acc + r.paradas.length, 0)
  const entregues    = rotasComParadas.reduce(
    (acc, r) => acc + r.paradas.filter((p: any) => p.status === 'visitado').length, 0
  )
  const porcentagem  = totalParadas > 0 ? Math.round((entregues / totalParadas) * 100) : 0
  const rotaAtiva    = rotasComParadas.find(r => r.status === 'em_andamento') ?? null
  const nomeMotoboy  = profile?.nome ?? motoboy.nome

  return (
    <div className="min-h-screen text-gray-900" style={{ background: '#F5F7FA' }}>

      {/* HEADER */}
      <div className="px-4 pt-10 pb-10" style={{
        background: 'linear-gradient(135deg, #1B5E20 0%, #2E7D32 100%)',
      }}>
        <div className="flex items-center justify-between mb-1">
          <div>
            <p className="text-green-200 text-sm font-medium">Bem-vindo,</p>
            <h1 className="text-white text-2xl font-black">{nomeMotoboy}</h1>
          </div>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.15)' }}>
            <Bike size={24} className="text-white" />
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mt-3"
          style={{ background: 'rgba(255,255,255,0.15)' }}>
          <div className="w-2 h-2 rounded-full bg-green-300 animate-pulse" />
          <span className="text-green-100 text-xs font-medium">
            {motoboy.status === 'ativo' ? 'Ativo hoje' : 'Inativo'}
          </span>
        </div>

        <div className="flex items-center gap-2 mt-2">
          <Calendar size={14} className="text-green-300" />
          <span className="text-green-200 text-xs capitalize">{dataHoje}</span>
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-4 pb-10">

        {/* CARDS DE STATS */}
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: 'Entregas',
              valor: `${entregues}/${totalParadas}`,
              Icon:  Package,
              cor:   '#2E7D32',
              bg:    '#E8F5E9',
            },
            {
              label: 'Concluídas',
              valor: entregues,
              Icon:  CheckCircle,
              cor:   '#1565C0',
              bg:    '#E3F2FD',
            },
            {
              label: 'Pendentes',
              valor: totalParadas - entregues,
              Icon:  Clock,
              cor:   '#E65100',
              bg:    '#FFF3E0',
            },
          ].map(({ label, valor, Icon, cor, bg }) => (
            <div key={label} className="bg-white rounded-2xl p-3 shadow-sm">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2"
                style={{ background: bg }}>
                <Icon size={16} style={{ color: cor }} />
              </div>
              <p className="font-black text-lg text-gray-800 leading-none">{valor}</p>
              <p className="text-xs text-gray-400 mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* PROGRESSO DO DIA */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} style={{ color: '#2E7D32' }} />
              <span className="font-bold text-gray-700 text-sm">Progresso do dia</span>
            </div>
            <span className="text-sm font-black" style={{ color: '#2E7D32' }}>
              {porcentagem}%
            </span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width:      `${porcentagem}%`,
                background: 'linear-gradient(90deg, #2E7D32, #66BB6A)',
              }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {entregues} de {totalParadas} entregas realizadas
          </p>
        </div>

        {/* ROTAS DO DIA */}
        <div>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">
            Rotas de hoje
          </h2>

          {rotasComParadas.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
              <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                style={{ background: '#F5F5F5' }}>
                <MapPin size={24} className="text-gray-300" />
              </div>
              <p className="font-bold text-gray-400 text-sm">Nenhuma rota para hoje</p>
              <p className="text-xs text-gray-300 mt-1">
                Aguarde seu distribuidor atribuir uma rota
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {rotasComParadas.map((rota) => {
                const paradasConcluidas = rota.paradas.filter((p: any) => p.status === 'visitado').length
                const totalParadasRota  = rota.paradas.length
                const pct = totalParadasRota > 0
                  ? Math.round((paradasConcluidas / totalParadasRota) * 100)
                  : 0
                const emAndamento = rota.status === 'em_andamento'
                const concluida   = rota.status === 'concluida'

                return (
                  <Link
                    key={rota.id}
                    href="/motoboy/rotas"
                    className="block bg-white rounded-2xl p-4 shadow-sm border-l-4 transition-all hover:shadow-md"
                    style={{
                      borderLeftColor: emAndamento ? '#FFC107' : concluida ? '#10b981' : '#2E7D32',
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className="text-xs font-bold px-2 py-0.5 rounded-full"
                            style={{
                              background: emAndamento ? '#FFF8E1' : concluida ? '#E8F5E9' : '#F3F4F6',
                              color:      emAndamento ? '#F57F17'  : concluida ? '#2E7D32' : '#6B7280',
                            }}
                          >
                            {emAndamento ? 'Em andamento' : concluida ? 'Concluída' : 'Pendente'}
                          </span>
                          {emAndamento && (
                            <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                          )}
                        </div>

                        <p className="font-bold text-gray-800 text-sm">{rota.nome}</p>

                        <div className="flex items-center gap-1 mt-1">
                          <MapPin size={12} className="text-gray-400" />
                          <span className="text-xs text-gray-400">
                            {totalParadasRota} parada{totalParadasRota !== 1 ? 's' : ''}
                          </span>
                        </div>

                        <div className="mt-3">
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width:      `${pct}%`,
                                background: 'linear-gradient(90deg, #2E7D32, #66BB6A)',
                              }}
                            />
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            {paradasConcluidas}/{totalParadasRota} entregas
                          </p>
                        </div>
                      </div>

                      <div className="ml-3 flex flex-col items-center gap-2">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{ background: '#E8F5E9' }}>
                          <Navigation size={18} style={{ color: '#2E7D32' }} />
                        </div>
                        <ChevronRight size={16} className="text-gray-300" />
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* BOTÃO IR PARA ROTA ATIVA */}
        {rotaAtiva && (
          <Link
            href="/motoboy/rotas"
            className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl font-black text-white text-base transition-all active:scale-95"
            style={{
              background:  'linear-gradient(135deg, #1B5E20, #2E7D32)',
              boxShadow:   '0 8px 24px rgba(46,125,50,0.35)',
            }}
          >
            <Navigation size={20} />
            Continuar rota ativa
          </Link>
        )}

        {/* Link para rotas quando não há rota ativa mas há pendente */}
        {!rotaAtiva && rotasComParadas.some(r => r.status === 'pendente') && (
          <Link
            href="/motoboy/rotas"
            className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl font-black text-white text-base transition-all active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #1B5E20, #2E7D32)',
              boxShadow:  '0 8px 24px rgba(46,125,50,0.35)',
            }}
          >
            <Navigation size={20} />
            Iniciar rota do dia
          </Link>
        )}
      </div>
    </div>
  )
}
