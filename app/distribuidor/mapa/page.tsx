import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MapaClienteWrapper from './MapaClienteWrapper'

export interface PDVComEstoque {
  id: string
  nome: string
  responsavel_nome: string
  telefone: string | null
  logradouro: string | null
  numero: string | null
  bairro: string | null
  cidade: string | null
  uf: string | null
  latitude: number | null
  longitude: number | null
  status: string
  maps_url: string | null
  cartelas_estoque: number
  cartelas_vendidas: number
  cartelas_aguardando: number
}

export default async function MapaPDVsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: dist } = await supabase
    .from('distribuidores')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!dist) redirect('/distribuidor/dashboard')

  const { data: pdvs, error } = await supabase
    .from('pontos_de_venda')
    .select('*')
    .eq('distribuidor_id', dist.id)
    .order('nome', { ascending: true })

  console.log('dist.id:', dist.id)
  console.log('pdvs:', pdvs?.length, error?.message)

  const listaPdvs: PDVComEstoque[] = (pdvs ?? []).map((p: any) => ({
    id:               p.id,
    nome:             p.nome,
    responsavel_nome: p.responsavel_nome ?? '',
    telefone:         p.telefone         ?? null,
    logradouro:       p.logradouro       ?? null,
    numero:           p.numero           ?? null,
    bairro:           p.bairro           ?? null,
    cidade:           p.cidade           ?? null,
    uf:               p.uf               ?? null,
    latitude:         p.latitude  != null ? parseFloat(p.latitude)  : null,
    longitude:        p.longitude != null ? parseFloat(p.longitude) : null,
    status:           p.status           ?? 'ativo',
    maps_url:         p.maps_url         ?? null,
    cartelas_estoque:    0,
    cartelas_vendidas:   0,
    cartelas_aguardando: 0,
  }))

  return <MapaClienteWrapper pdvs={listaPdvs} />
}
