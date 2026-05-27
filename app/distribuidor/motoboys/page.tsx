import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function MotoboyListPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: dist } = await supabase
    .from('distribuidores').select('id').eq('user_id', user.id).single()

  const { data: motoboys } = await supabase
    .from('motoboys')
    .select('*, profiles(email)')
    .eq('distribuidor_id', dist?.id)
    .order('created_at', { ascending: false })

  // Rotas de hoje por motoboy
  const hoje = new Date().toISOString().split('T')[0]
  const { data: rotasHoje } = await supabase
    .from('rotas_entrega')
    .select('motoboy_id, status')
    .eq('distribuidor_id', dist?.id)
    .eq('data_rota', hoje)

  const rotaPorMotoboy: Record<string, string> = {}
  rotasHoje?.forEach(r => { rotaPorMotoboy[r.motoboy_id] = r.status })

  const veiculoIcon: Record<string, string> = { moto: '🏍️', bicicleta: '🚲', carro: '🚗' }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Motoboys</h1>
          <p className="text-sm text-gray-500 mt-1">{motoboys?.length ?? 0} cadastrados</p>
        </div>
        <Link href="/distribuidor/motoboys/novo"
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition">
          + Cadastrar motoboy
        </Link>
      </div>

      {motoboys && motoboys.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {motoboys.map((m: any) => {
            const rotaStatus = rotaPorMotoboy[m.id]
            return (
              <div key={m.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{veiculoIcon[m.veiculo] ?? '🛵'}</span>
                    <div>
                      <h3 className="font-medium text-gray-900">{m.nome}</h3>
                      <p className="text-xs text-gray-400">{m.profiles?.email}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    m.status === 'ativo' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {m.status === 'ativo' ? 'Ativo' : 'Inativo'}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-gray-500 mb-4">
                  {m.telefone && <p>📞 {m.telefone}</p>}
                  {m.placa && <p>🔖 Placa: {m.placa}</p>}
                  <p>Veículo: {m.veiculo}</p>
                </div>

                {/* Rota de hoje */}
                <div className={`text-xs px-3 py-2 rounded-lg mb-3 ${
                  rotaStatus === 'em_andamento' ? 'bg-blue-50 text-blue-700' :
                  rotaStatus === 'concluida'    ? 'bg-emerald-50 text-emerald-700' :
                  rotaStatus === 'pendente'     ? 'bg-amber-50 text-amber-700' :
                  'bg-gray-50 text-gray-500'
                }`}>
                  {rotaStatus === 'em_andamento' ? '🔵 Em rota agora' :
                   rotaStatus === 'concluida'    ? '✅ Rota concluída hoje' :
                   rotaStatus === 'pendente'     ? '⏳ Rota pendente hoje' :
                   '— Sem rota hoje'}
                </div>

                <Link href={`/distribuidor/rotas/nova?motoboy=${m.id}`}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">
                  + Criar rota para este motoboy →
                </Link>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <p className="text-4xl mb-4">🛵</p>
          <p className="text-gray-400 text-sm mb-4">Nenhum motoboy cadastrado ainda.</p>
          <Link href="/distribuidor/motoboys/novo"
            className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition">
            Cadastrar primeiro motoboy
          </Link>
        </div>
      )}
    </div>
  )
}
