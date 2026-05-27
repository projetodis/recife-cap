import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PDVsView from './PDVsView'

export interface PDVRow {
  id: string
  nome: string
  responsavel_nome: string
  telefone: string | null
  cidade: string | null
  regiao: string | null
  bairro: string | null
  logradouro: string | null
  numero: string | null
  latitude: number | null
  longitude: number | null
  status: string
  comissao_pct: number
  maps_url: string | null
  created_at: string
  rota_nome: string | null
  cartelas_estoque: number
  cartelas_vendidas: number
}

export default async function PDVsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: dist } = await supabase
    .from('distribuidores')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!dist) redirect('/distribuidor/dashboard')

  const { data: pdvsRaw } = await supabase
    .from('pontos_de_venda')
    .select('*')
    .eq('distribuidor_id', dist.id)
    .order('nome', { ascending: true })

  const pdvList = pdvsRaw ?? []
  const pdvIds  = pdvList.map((p: any) => p.id)

  // Rotas ativas de hoje → mapa pdv_id → nome da rota
  const rotaMap: Record<string, string> = {}
  const hoje = new Date().toISOString().split('T')[0]

  if (pdvIds.length > 0) {
    const { data: rotas } = await supabase
      .from('rotas_entrega')
      .select('nome, paradas_rota(pdv_id)')
      .eq('distribuidor_id', dist.id)
      .eq('data_rota', hoje)
      .in('status', ['pendente', 'em_andamento'])

    for (const rota of rotas ?? []) {
      const paradas = Array.isArray(rota.paradas_rota) ? rota.paradas_rota : []
      for (const p of paradas as any[]) {
        if (p.pdv_id) rotaMap[p.pdv_id] = rota.nome
      }
    }
  }

  // Contagem de cartelas por PDV
  const estoqueMap: Record<string, number>  = {}
  const vendidasMap: Record<string, number> = {}

  if (pdvIds.length > 0) {
    const { data: cartelas } = await supabase
      .from('cartelas')
      .select('pdv_id, status')
      .in('pdv_id', pdvIds)
      .in('status', ['em_estoque_pdv', 'paga'])

    for (const c of cartelas ?? []) {
      if (!c.pdv_id) continue
      if (c.status === 'em_estoque_pdv') estoqueMap[c.pdv_id]  = (estoqueMap[c.pdv_id]  ?? 0) + 1
      if (c.status === 'paga')           vendidasMap[c.pdv_id] = (vendidasMap[c.pdv_id] ?? 0) + 1
    }
  }

  const pdvs: PDVRow[] = pdvList.map((p: any) => ({
    id:                p.id,
    nome:              p.nome,
    responsavel_nome:  p.responsavel_nome ?? '',
    telefone:          p.telefone   ?? null,
    cidade:            p.cidade     ?? null,
    regiao:            p.regiao     ?? null,
    bairro:            p.bairro     ?? null,
    logradouro:        p.logradouro ?? null,
    numero:            p.numero     ?? null,
    latitude:          p.latitude  != null ? parseFloat(p.latitude)  : null,
    longitude:         p.longitude != null ? parseFloat(p.longitude) : null,
    status:            p.status     ?? 'ativo',
    comissao_pct:      parseFloat(p.comissao_pct ?? 5),
    maps_url:          p.maps_url   ?? null,
    created_at:        p.created_at,
    rota_nome:         rotaMap[p.id]    ?? null,
    cartelas_estoque:  estoqueMap[p.id] ?? 0,
    cartelas_vendidas: vendidasMap[p.id] ?? 0,
  }))

  return <PDVsView pdvs={pdvs} distribuidorId={dist.id} />
}
