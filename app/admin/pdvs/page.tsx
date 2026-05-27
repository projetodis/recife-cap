import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PDVsAdminView from './PDVsAdminView'

export interface PDVAdminRow {
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
  distribuidor_id: string
  distribuidor_nome: string
  distribuidor_nivel: number
  cartelas_estoque: number
  cartelas_vendidas: number
}

export default async function AdminPDVsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/login')

  const { data: pdvsRaw } = await supabase
    .from('pontos_de_venda')
    .select(`
      *,
      distribuidores (
        id, nivel, comissao_pct,
        profiles (nome)
      )
    `)
    .order('created_at', { ascending: false })

  const pdvList = pdvsRaw ?? []
  const pdvIds  = pdvList.map((p: any) => p.id)

  // Contagem de cartelas por PDV
  const estoqueMap: Record<string, number>  = {}
  const vendidasMap: Record<string, number> = {}

  if (pdvIds.length > 0) {
    const { data: cartelas } = await supabase
      .from('cartelas')
      .select('pdv_id, status')
      .in('pdv_id', pdvIds)

    for (const c of cartelas ?? []) {
      if (!c.pdv_id) continue
      if (c.status === 'em_estoque_pdv') estoqueMap[c.pdv_id]  = (estoqueMap[c.pdv_id]  ?? 0) + 1
      if (c.status === 'paga')           vendidasMap[c.pdv_id] = (vendidasMap[c.pdv_id] ?? 0) + 1
    }
  }

  const pdvs: PDVAdminRow[] = pdvList.map((p: any) => {
    const dist    = Array.isArray(p.distribuidores) ? p.distribuidores[0] : p.distribuidores
    const distProf = Array.isArray(dist?.profiles) ? dist?.profiles[0] : dist?.profiles
    return {
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
      distribuidor_id:   dist?.id     ?? '',
      distribuidor_nome: distProf?.nome ?? 'Sem distribuidor',
      distribuidor_nivel: dist?.nivel  ?? 1,
      cartelas_estoque:  estoqueMap[p.id]  ?? 0,
      cartelas_vendidas: vendidasMap[p.id] ?? 0,
    }
  })

  return <PDVsAdminView pdvs={pdvs} />
}
