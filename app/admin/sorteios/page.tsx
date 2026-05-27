import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SorteiosView from './SorteiosView'

export interface EdicaoComSorteios {
  id: string
  numero: number
  descricao: string | null
  data_sorteio: string
  hora_sorteio: string
  valor_unitario: number
  total_cartelas: number
  premio_principal: number
  status: string
  cartelas_pagas: number
  sorteios: SorteioRow[]
}

export interface SorteioRow {
  id: string
  edicao_id: string
  numero_sorteio: number
  valor_premio: number
  status: string
  realizado_em: string | null
  cartela_vencedora: string | null
  cartela_codigo: string | null
  dezenas_sorteadas: string[]
}

export default async function SorteiosAdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/login')

  // Edições relevantes
  const { data: edicoes } = await supabase
    .from('edicoes')
    .select('*')
    .in('status', ['ativa', 'em_sorteio', 'encerrada'])
    .order('numero', { ascending: false })

  const edicaoIds = (edicoes ?? []).map((e: any) => e.id)

  // Sorteios das edições
  const { data: sorteiosRaw } = await supabase
    .from('sorteios')
    .select('*')
    .in('edicao_id', edicaoIds.length > 0 ? edicaoIds : ['__none__'])
    .order('numero_sorteio', { ascending: true })

  // Cartelas pagas por edição
  const pagasMap: Record<string, number> = {}
  if (edicaoIds.length > 0) {
    const { data: cartelas } = await supabase
      .from('cartelas')
      .select('edicao_id, status')
      .in('edicao_id', edicaoIds)
      .eq('status', 'paga')

    for (const c of cartelas ?? []) {
      if (!c.edicao_id) continue
      pagasMap[c.edicao_id] = (pagasMap[c.edicao_id] ?? 0) + 1
    }
  }

  // Codes das cartelas vencedoras
  const cartelaVencedoraIds = (sorteiosRaw ?? [])
    .map((s: any) => s.cartela_vencedora)
    .filter(Boolean) as string[]

  const codigosMap: Record<string, string> = {}
  if (cartelaVencedoraIds.length > 0) {
    const { data: cartelasVenc } = await supabase
      .from('cartelas')
      .select('id, codigo')
      .in('id', cartelaVencedoraIds)

    for (const c of cartelasVenc ?? []) {
      codigosMap[c.id] = c.codigo
    }
  }

  // Montar sorteios por edição
  const sorteiosPorEdicao: Record<string, SorteioRow[]> = {}
  for (const s of sorteiosRaw ?? [] as any[]) {
    const row: SorteioRow = {
      id:                s.id,
      edicao_id:         s.edicao_id,
      numero_sorteio:    s.numero_sorteio,
      valor_premio:      parseFloat(s.valor_premio ?? 0),
      status:            s.status ?? 'aguardando',
      realizado_em:      s.realizado_em ?? null,
      cartela_vencedora: s.cartela_vencedora ?? null,
      cartela_codigo:    s.cartela_vencedora ? (codigosMap[s.cartela_vencedora] ?? null) : null,
      dezenas_sorteadas: s.dezenas_sorteadas ?? [],
    }
    if (!sorteiosPorEdicao[s.edicao_id]) sorteiosPorEdicao[s.edicao_id] = []
    sorteiosPorEdicao[s.edicao_id].push(row)
  }

  const listaEdicoes: EdicaoComSorteios[] = (edicoes ?? []).map((e: any) => ({
    id:               e.id,
    numero:           e.numero,
    descricao:        e.descricao ?? null,
    data_sorteio:     e.data_sorteio,
    hora_sorteio:     e.hora_sorteio,
    valor_unitario:   parseFloat(e.valor_unitario ?? 0),
    total_cartelas:   e.total_cartelas ?? 0,
    premio_principal: parseFloat(e.premio_principal ?? 0),
    status:           e.status,
    cartelas_pagas:   pagasMap[e.id] ?? 0,
    sorteios:         sorteiosPorEdicao[e.id] ?? [],
  }))

  return <SorteiosView edicoes={listaEdicoes} />
}
