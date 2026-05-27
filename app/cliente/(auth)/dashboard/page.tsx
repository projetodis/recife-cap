import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function ClienteDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: cartelas } = await supabase
    .from('cartelas')
    .select('*, edicoes(numero, data_sorteio, hora_sorteio, status)')
    .eq('cliente_id', user.id)
    .order('created_at', { ascending: false })

  const { data: edicaoAtiva } = await supabase
    .from('edicoes')
    .select('*')
    .eq('status', 'ativa')
    .single()

  const cartelasAtivas = cartelas?.filter(c =>
    (c.edicoes as any)?.status === 'ativa' || (c.edicoes as any)?.status === 'em_sorteio'
  ) ?? []

  const diasParaSorteio = edicaoAtiva
    ? Math.ceil((new Date(edicaoAtiva.data_sorteio).getTime() - Date.now()) / 86400000)
    : null

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Minhas cartelas</h1>
        {edicaoAtiva && (
          <p className="text-sm text-gray-500 mt-1">
            Próximo sorteio: {new Date(edicaoAtiva.data_sorteio).toLocaleDateString('pt-BR')} às {edicaoAtiva.hora_sorteio}
            {diasParaSorteio !== null && ` · ${diasParaSorteio} dia${diasParaSorteio !== 1 ? 's' : ''}`}
          </p>
        )}
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 mb-2">Total de cartelas</p>
          <p className="text-2xl font-semibold text-gray-900">{cartelas?.length ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 mb-2">Participando agora</p>
          <p className="text-2xl font-semibold text-emerald-600">{cartelasAtivas.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 mb-2">Edição atual</p>
          <p className="text-2xl font-semibold text-gray-900">{edicaoAtiva ? `Nº ${edicaoAtiva.numero}` : '—'}</p>
        </div>
      </div>

      {/* Lista de cartelas */}
      {cartelas && cartelas.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cartelas.map((cartela: any) => {
            const edicao = cartela.edicoes
            const isAtiva = edicao?.status === 'ativa' || edicao?.status === 'em_sorteio'

            return (
              <div key={cartela.id} className={`bg-white rounded-xl border p-5 ${isAtiva ? 'border-emerald-200' : 'border-gray-200'}`}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-xs text-gray-400">Cartela</p>
                    <p className="text-lg font-semibold text-gray-900">{cartela.codigo}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Edição</p>
                    <p className="text-sm font-medium text-gray-700">Nº {edicao?.numero}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    cartela.status === 'paga'
                      ? 'bg-emerald-50 text-emerald-700'
                      : cartela.status === 'vendida'
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {cartela.status === 'paga' ? 'Pago' :
                     cartela.status === 'vendida' ? 'Aguardando PIX' : cartela.status}
                  </span>
                </div>

                {/* Dezenas */}
                {cartela.dezenas_sorteio_1 && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-400 mb-2">Dezenas</p>
                    <div className="flex flex-wrap gap-1.5">
                      {cartela.dezenas_sorteio_1.map((num: string) => (
                        <span key={num} className="inline-flex items-center justify-center w-7 h-7 bg-gray-100 rounded text-xs font-medium text-gray-700">
                          {num}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {edicao && (
                  <p className="text-xs text-gray-400">
                    Sorteio: {new Date(edicao.data_sorteio).toLocaleDateString('pt-BR')} às {edicao.hora_sorteio}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-400 text-sm">Você ainda não tem cartelas.</p>
          <p className="text-gray-400 text-xs mt-1">Compre uma cartela em um ponto de venda e registre com PIX.</p>
        </div>
      )}
    </div>
  )
}
