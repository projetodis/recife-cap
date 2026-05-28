import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Bike, Car, UserPlus } from 'lucide-react'

export default async function MotoboyListPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: dist } = await supabase
    .from('distribuidores').select('id').eq('user_id', user.id).single()

  const distribuidorId = dist?.id

  const { data: motoboys, error } = await supabase
    .from('motoboys')
    .select(`
      id,
      nome,
      telefone,
      veiculo,
      placa,
      status,
      user_id,
      distribuidor_id,
      profiles (
        id,
        role,
        nome,
        telefone
      )
    `)
    .eq('distribuidor_id', distribuidorId)
    .order('created_at', { ascending: false })

  if (error) console.error('Erro motoboys:', error)

  const hoje = new Date().toISOString().split('T')[0]
  const { data: rotasHoje } = await supabase
    .from('rotas_entrega')
    .select('motoboy_id, status')
    .eq('distribuidor_id', dist?.id)
    .eq('data_rota', hoje)

  const rotaPorMotoboy: Record<string, string> = {}
  rotasHoje?.forEach(r => { rotaPorMotoboy[r.motoboy_id] = r.status })

  function VeiculoIcon({ veiculo }: { veiculo: string }) {
    if (veiculo === 'carro') return <Car size={20} style={{ color: '#2E7D32' }} />
    return <Bike size={20} style={{ color: '#2E7D32' }} />
  }

  return (
    <div style={{ background: '#F5F7FA', minHeight: '100vh' }} className="p-1">

      {/* HEADER */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Motoboys</h1>
          <p className="text-sm text-gray-500 mt-0.5">{motoboys?.length ?? 0} cadastrados</p>
        </div>
        <Link
          href="/distribuidor/motoboys/novo"
          className="flex items-center gap-2 px-4 py-2.5 text-white text-sm font-bold rounded-xl transition hover:opacity-90"
          style={{ background: '#2E7D32' }}
        >
          <UserPlus size={16} />
          Cadastrar motoboy
        </Link>
      </div>

      {motoboys && motoboys.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {motoboys.map((m: any) => {
            const rotaStatus = rotaPorMotoboy[m.id]
            const inicial    = (m.nome ?? '?').charAt(0).toUpperCase()

            return (
              <div
                key={m.id}
                className="bg-white rounded-2xl border p-5"
                style={{ borderColor: '#E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
              >
                {/* Header do card */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center text-lg font-black flex-shrink-0"
                      style={{ background: '#E8F5E9', color: '#2E7D32' }}
                    >
                      {inicial}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{m.nome}</h3>
                      {m.telefone && <p className="text-xs text-gray-400 mt-0.5">{m.telefone}</p>}
                    </div>
                  </div>
                  <span
                    className="text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                    style={m.status === 'ativo'
                      ? { background: '#E8F5E9', color: '#2E7D32' }
                      : { background: '#F5F5F5', color: '#6B7280' }
                    }
                  >
                    {m.status === 'ativo' ? 'Ativo' : 'Inativo'}
                  </span>
                </div>

                {/* Dados do veículo */}
                <div
                  className="flex items-center gap-3 rounded-xl p-3 mb-4"
                  style={{ background: '#F5F7FA' }}
                >
                  <VeiculoIcon veiculo={m.veiculo} />
                  <div className="text-xs text-gray-500 space-y-0.5">
                    <p className="font-medium text-gray-700 capitalize">{m.veiculo ?? 'Veículo não informado'}</p>
                    {m.placa && <p>Placa: <span className="font-mono font-bold text-gray-800">{m.placa}</span></p>}
                  </div>
                </div>

                {/* Status da rota hoje */}
                <div
                  className="text-xs font-medium px-3 py-2 rounded-xl mb-4"
                  style={rotaStatus === 'em_andamento'
                    ? { background: '#E8F5E9', color: '#2E7D32' }
                    : rotaStatus === 'concluida'
                    ? { background: '#F5F5F5', color: '#4B5563' }
                    : rotaStatus === 'pendente'
                    ? { background: '#FFF8E1', color: '#B45309' }
                    : { background: '#F5F5F5', color: '#9CA3AF' }
                  }
                >
                  {rotaStatus === 'em_andamento' ? 'Em rota agora'
                   : rotaStatus === 'concluida'  ? 'Rota concluída hoje'
                   : rotaStatus === 'pendente'   ? 'Rota pendente hoje'
                   : 'Sem rota hoje'}
                </div>

                {/* Ações */}
                <Link
                  href={`/distribuidor/rotas/nova?motoboy=${m.id}`}
                  className="text-xs font-bold"
                  style={{ color: '#2E7D32' }}
                >
                  + Criar rota para este motoboy
                </Link>
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
            <Bike size={32} className="text-gray-300" />
          </div>
          <p className="font-bold text-gray-400 text-sm mb-4">Nenhum motoboy cadastrado ainda.</p>
          <Link
            href="/distribuidor/motoboys/novo"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-white text-sm font-bold rounded-xl transition hover:opacity-90"
            style={{ background: '#2E7D32' }}
          >
            <UserPlus size={16} />
            Cadastrar primeiro motoboy
          </Link>
        </div>
      )}
    </div>
  )
}
