import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Bike, UserPlus, Phone, Route } from 'lucide-react'

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

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Motoboys</h1>
          <p className="text-sm text-gray-500">{motoboys?.length || 0} cadastrados</p>
        </div>
        <a href="/distribuidor/motoboys/novo"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #1B5E20, #2E7D32)' }}>
          <UserPlus size={18} />
          Cadastrar motoboy
        </a>
      </div>

      {!motoboys?.length ? (
        <div className="bg-white rounded-2xl border p-12 shadow-sm text-center">
          <Bike size={48} className="text-gray-200 mx-auto mb-4" />
          <p className="font-bold text-gray-400 text-lg">Nenhum motoboy cadastrado ainda</p>
          <p className="text-gray-400 text-sm mt-1">Cadastre motoboys para criar rotas de entrega</p>
          <a href="/distribuidor/motoboys/novo"
            className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-xl font-bold text-white"
            style={{ background: '#2E7D32' }}>
            <UserPlus size={16} />
            Cadastrar primeiro motoboy
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {(motoboys as any[]).map(mb => {
            const rotaStatus = rotaPorMotoboy[mb.id] ?? null
            return (
              <div key={mb.id}
                className="bg-white rounded-2xl border shadow-sm p-5 hover:shadow-md transition-all">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black text-white flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #1B5E20, #2E7D32)' }}>
                    {mb.nome?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-black text-gray-900 truncate">{mb.nome}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full font-bold flex-shrink-0 ml-2"
                        style={{
                          background: mb.status === 'ativo' ? '#E8F5E9' : '#F5F5F5',
                          color: mb.status === 'ativo' ? '#2E7D32' : '#9E9E9E',
                        }}>
                        {mb.status === 'ativo' ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                      <Bike size={12} />
                      <span className="capitalize">{mb.veiculo || 'moto'}</span>
                      {mb.placa && (
                        <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-xs ml-1">
                          {mb.placa}
                        </span>
                      )}
                    </div>
                    {mb.telefone && (
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <Phone size={11} /> {mb.telefone}
                      </p>
                    )}
                  </div>
                </div>

                {/* Rota do dia */}
                <div className="mt-4 pt-4 border-t flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Rota hoje</p>
                    {rotaStatus ? (
                      <p className="text-xs font-bold mt-0.5"
                        style={{ color: rotaStatus === 'em_andamento' ? '#2E7D32' : rotaStatus === 'concluida' ? '#6B7280' : '#B45309' }}>
                        {rotaStatus === 'em_andamento' ? 'Em andamento'
                          : rotaStatus === 'concluida'  ? 'Concluída'
                          : 'Pendente'}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400 mt-0.5">Sem rota</p>
                    )}
                  </div>
                  <a href="/distribuidor/rotas/nova"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all hover:shadow-sm"
                    style={{ borderColor: '#2E7D32', color: '#2E7D32' }}>
                    <Route size={12} />
                    Nova rota
                  </a>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
