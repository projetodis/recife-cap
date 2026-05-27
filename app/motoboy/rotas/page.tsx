import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RotaClienteWrapper from './RotaClienteWrapper'

export default async function MotoboyRotasPage() {
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
    .select('id, nome, distribuidor_id')
    .eq('user_id', user.id)
    .single()

  if (!motoboy) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-8">
        <p className="text-4xl mb-4">🛵</p>
        <p className="text-gray-300 font-medium mb-2">Perfil de motoboy não encontrado</p>
        <p className="text-gray-500 text-sm">Fale com seu distribuidor.</p>
      </div>
    )
  }

  const hoje = new Date().toISOString().split('T')[0]

  // Busca TODAS as rotas do dia (sem limit) — evita pegar a rota errada
  const { data: rotasList } = await supabase
    .from('rotas_entrega')
    .select('*')
    .eq('motoboy_id', motoboy.id)
    .eq('data_rota', hoje)
    .in('status', ['pendente', 'em_andamento'])
    .order('created_at', { ascending: true })

  const rotasComParadas = rotasList ? await Promise.all(
    rotasList.map(async (r) => {
      const { data: paradasRota } = await supabase
        .from('paradas_rota')
        .select(`
          id,
          ordem,
          quantidade_cartelas,
          status,
          visitado_em,
          pdv_id,
          pontos_de_venda (
            id, nome, responsavel_nome, telefone,
            endereco, numero, bairro, cidade, uf,
            latitude, longitude
          )
        `)
        .eq('rota_id', r.id)
        .order('ordem', { ascending: true })
      return { ...r, paradas: paradasRota ?? [] }
    })
  ) : []

  // Prioriza rota em_andamento; senão usa a mais antiga (primeira criada)
  const rota = rotasComParadas.find(r => r.status === 'em_andamento')
    ?? rotasComParadas[0]
    ?? null

  const pontos = (rota?.paradas ?? []).map((p: any) => {
    const pdv = Array.isArray(p.pontos_de_venda) ? p.pontos_de_venda[0] : p.pontos_de_venda
    return {
      parada_id:   p.id,
      pdv_id:      pdv?.id ?? '',
      nome:        pdv?.nome ?? 'PDV',
      lat:         pdv?.latitude  != null ? parseFloat(pdv.latitude)  : null,
      lng:         pdv?.longitude != null ? parseFloat(pdv.longitude) : null,
      status:      p.status,
      responsavel: pdv?.responsavel_nome ?? undefined,
      telefone:    pdv?.telefone ?? undefined,
      endereco:    [pdv?.endereco, pdv?.numero].filter(v => v && String(v).trim() !== '').join(', ') || undefined,
      bairro:      pdv?.bairro   || undefined,
      cidade:      pdv?.cidade   || undefined,
      uf:          pdv?.uf       || undefined,
      cartelas:    p.quantidade_cartelas,
      visitado:    p.status === 'visitado',
      visitado_em: p.visitado_em ?? undefined,
      ordem:       p.ordem,
    }
  })

  return (
    <RotaClienteWrapper
      nomeMotoboy={profile?.nome ?? motoboy.nome}
      nomeRota={rota?.nome ?? 'Sem rota hoje'}
      rotaId={rota?.id ?? null}
      rotaStatus={rota?.status ?? null}
      pontos={pontos}
    />
  )
}
