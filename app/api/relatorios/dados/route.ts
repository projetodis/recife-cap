import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// ── Helpers ───────────────────────────────────────────────────────────────────

function parsePeriodo(p: string | null): { inicio: string; fim: string } | null {
  if (!p || !/^\d{4}-\d{2}$/.test(p)) return null
  const [y, m] = p.split('-').map(Number)
  const inicio = new Date(y!, m! - 1, 1)
  const fim    = new Date(y!, m!, 1)
  return { inicio: inicio.toISOString(), fim: fim.toISOString() }
}

function labelMes(yyyymm: string): string {
  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  const [y, m] = yyyymm.split('-').map(Number)
  return `${meses[(m ?? 1) - 1]}/${String(y ?? 0).slice(2)}`
}

// ── Visão Geral ───────────────────────────────────────────────────────────────

async function visaoGeral(sb: SupabaseClient) {
  // Cards: contagens
  const [
    { count: totalCartelas },
    { count: totalVendidas },
    { count: pdvsAtivos },
    { count: distribAtivos },
  ] = await Promise.all([
    sb.from('cartelas').select('*', { count: 'exact', head: true }),
    sb.from('cartelas').select('*', { count: 'exact', head: true }).eq('status', 'paga'),
    sb.from('pdvs').select('*', { count: 'exact', head: true }).eq('status', 'ativo'),
    sb.from('distribuidores').select('*', { count: 'exact', head: true }).eq('status', 'ativo'),
  ])

  // Receita e comissões: cartelas pagas × valor_unitario da edição
  const { data: edicoes }      = await sb.from('edicoes').select('id, valor_unitario')
  const { data: cartelasPagas } = await sb.from('cartelas').select('edicao_id, distribuidor_id').eq('status', 'paga')
  const { data: distribs }      = await sb.from('distribuidores').select('id, comissao_pct')

  const edicaoMap  = Object.fromEntries((edicoes ?? []).map((e: any) => [e.id, e]))
  const distribMap = Object.fromEntries((distribs ?? []).map((d: any) => [d.id, d]))

  let receita   = 0
  let comissoes = 0
  for (const c of cartelasPagas ?? [] as any[]) {
    const valor = (edicaoMap[c.edicao_id] as any)?.valor_unitario ?? 0
    receita += valor
    if (c.distribuidor_id) {
      const pct = (distribMap[c.distribuidor_id] as any)?.comissao_pct ?? 0
      comissoes += valor * (pct / 100)
    }
  }

  // Vendas por mês — últimos 6 meses baseado em data_sorteio das edições
  const seisAtras = new Date()
  seisAtras.setMonth(seisAtras.getMonth() - 5)
  seisAtras.setDate(1)

  const { data: edicoesMes } = await sb
    .from('edicoes')
    .select('id, data_sorteio, valor_unitario')
    .gte('data_sorteio', seisAtras.toISOString().split('T')[0])
    .order('data_sorteio', { ascending: true })

  const edicoesMesIds = (edicoesMes ?? []).map((e: any) => e.id)
  const edicoesMesMap = Object.fromEntries((edicoesMes ?? []).map((e: any) => [e.id, e]))

  const { data: vendasMes } = edicoesMesIds.length > 0
    ? await sb.from('cartelas').select('edicao_id').eq('status', 'paga').in('edicao_id', edicoesMesIds)
    : { data: [] }

  const porMes: Record<string, { vendidas: number; receita: number }> = {}
  for (const c of vendasMes ?? [] as any[]) {
    const e = edicoesMesMap[c.edicao_id] as any
    if (!e) continue
    const key = (e.data_sorteio as string).substring(0, 7)
    if (!porMes[key]) porMes[key] = { vendidas: 0, receita: 0 }
    porMes[key].vendidas++
    porMes[key].receita += e.valor_unitario ?? 0
  }

  // Garantir os últimos 6 meses mesmo sem dados
  const vendas_por_mes = Array.from({ length: 6 }, (_, i) => {
    const d   = new Date(seisAtras.getFullYear(), seisAtras.getMonth() + i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    return { mes: key, label: labelMes(key), ...(porMes[key] ?? { vendidas: 0, receita: 0 }) }
  })

  // Por status
  const { data: statusCounts } = await sb.from('cartelas').select('status')
  const statusMap: Record<string, number> = {}
  for (const c of statusCounts ?? [] as any[]) {
    statusMap[c.status] = (statusMap[c.status] ?? 0) + 1
  }

  const STATUS_CONFIG: Record<string, { label: string; cor: string }> = {
    em_estoque_distribuidor: { label: 'Em estoque',  cor: '#10b981' },
    paga:                    { label: 'Vendida',     cor: '#1B1B8E' },
    devolvida:               { label: 'Devolvida',   cor: '#f59e0b' },
    bloqueada:               { label: 'Bloqueada',   cor: '#ef4444' },
    disponivel:              { label: 'Disponível',  cor: '#6366f1' },
  }

  const por_status = Object.entries(statusMap).map(([status, total]) => ({
    status,
    label: STATUS_CONFIG[status]?.label ?? status,
    total,
    cor: STATUS_CONFIG[status]?.cor ?? '#9ca3af',
  }))

  return {
    cards: {
      total_cartelas:     totalCartelas    ?? 0,
      total_vendidas:     totalVendidas    ?? 0,
      receita_total:      receita,
      comissoes_pagas:    comissoes,
      pdvs_ativos:        pdvsAtivos       ?? 0,
      distribuidores_ativos: distribAtivos ?? 0,
    },
    vendas_por_mes,
    por_status,
  }
}

// ── Distribuidores ────────────────────────────────────────────────────────────

async function distribuidores(
  sb: SupabaseClient,
  range: { inicio: string; fim: string } | null,
) {
  const { data: distribs } = await sb
    .from('distribuidores')
    .select('id, nivel, comissao_pct, status, profiles(nome)')
    .order('status', { ascending: true })

  const { data: pdvs } = await sb.from('pdvs').select('distribuidor_id, status')
  const { data: edicoes } = await sb.from('edicoes').select('id, valor_unitario')

  // Cartelas agrupadas por distribuidor com filtro de período
  let cartelasQuery = sb
    .from('cartelas')
    .select('distribuidor_id, edicao_id, status')
    .not('distribuidor_id', 'is', null)
  if (range) {
    cartelasQuery = cartelasQuery
      .gte('created_at', range.inicio)
      .lt('created_at', range.fim)
  }
  const { data: cartelas } = await cartelasQuery

  const edicaoMap  = Object.fromEntries((edicoes ?? []).map((e: any) => [e.id, e]))
  const pdvsPorDist: Record<string, number>      = {}
  const enviadasPorDist: Record<string, number>  = {}
  const vendidasPorDist: Record<string, number>  = {}
  const receitaPorDist: Record<string, number>   = {}

  for (const p of pdvs ?? [] as any[]) {
    if (p.distribuidor_id && p.status === 'ativo') {
      pdvsPorDist[p.distribuidor_id] = (pdvsPorDist[p.distribuidor_id] ?? 0) + 1
    }
  }

  for (const c of cartelas ?? [] as any[]) {
    const did = c.distribuidor_id
    if (!did) continue
    enviadasPorDist[did]  = (enviadasPorDist[did]  ?? 0) + 1
    if (c.status === 'paga') {
      vendidasPorDist[did] = (vendidasPorDist[did] ?? 0) + 1
      const valor = (edicaoMap[c.edicao_id] as any)?.valor_unitario ?? 0
      receitaPorDist[did]  = (receitaPorDist[did]  ?? 0) + valor
    }
  }

  const resultado = (distribs ?? []).map((d: any) => {
    const nome      = Array.isArray(d.profiles) ? (d.profiles[0]?.nome ?? '—') : (d.profiles?.nome ?? '—')
    const enviadas  = enviadasPorDist[d.id] ?? 0
    const vendidas  = vendidasPorDist[d.id] ?? 0
    const receita   = receitaPorDist[d.id] ?? 0
    return {
      id:             d.id,
      nome,
      nivel:          d.nivel,
      comissao_pct:   d.comissao_pct,
      status:         d.status,
      pdvs_count:     pdvsPorDist[d.id] ?? 0,
      cartelas_enviadas: enviadas,
      cartelas_vendidas: vendidas,
      conversao_pct:  enviadas > 0 ? Math.round((vendidas / enviadas) * 100) : 0,
      receita_gerada: receita,
      comissao_devida: receita * ((d.comissao_pct ?? 0) / 100),
    }
  })

  return { distribuidores: resultado }
}

// ── Cartelas por Edição ───────────────────────────────────────────────────────

async function cartelas(
  sb: SupabaseClient,
  range: { inicio: string; fim: string } | null,
) {
  let edicaoQuery = sb
    .from('edicoes')
    .select('id, numero, data_sorteio, valor_unitario, status')
    .order('numero', { ascending: false })

  if (range) {
    edicaoQuery = edicaoQuery
      .gte('data_sorteio', range.inicio.split('T')[0])
      .lt('data_sorteio', range.fim.split('T')[0])
  }

  const { data: edicoes } = await edicaoQuery

  const edicaoIds = (edicoes ?? []).map((e: any) => e.id)
  if (edicaoIds.length === 0) return { edicoes: [] }

  const { data: cartelasAll } = await sb
    .from('cartelas')
    .select('edicao_id, status, distribuidor_id')
    .in('edicao_id', edicaoIds)

  const counts: Record<string, Record<string, number>> = {}
  for (const c of cartelasAll ?? [] as any[]) {
    if (!counts[c.edicao_id]) counts[c.edicao_id] = {}
    counts[c.edicao_id][c.status] = (counts[c.edicao_id][c.status] ?? 0) + 1
  }

  const resultado = (edicoes ?? []).map((e: any) => {
    const s         = counts[e.id] ?? {}
    const total     = Object.values(s).reduce((a: number, b) => a + (b as number), 0)
    const vendidas  = s['paga'] ?? 0
    const distribuidas = Object.entries(s)
      .filter(([k]) => k !== 'paga' && k !== 'bloqueada')
      .reduce((a, [, v]) => a + (v as number), 0)
    const devolvidas = s['devolvida'] ?? 0
    return {
      edicao_id:    e.id,
      numero:       e.numero,
      data_sorteio: e.data_sorteio,
      status:       e.status,
      total_geradas: total,
      distribuidas,
      vendidas,
      devolvidas,
      vendidas_pct: total > 0 ? Math.round((vendidas / total) * 100) : 0,
      receita:      vendidas * (e.valor_unitario ?? 0),
    }
  })

  return { edicoes: resultado }
}

// ── Sorteios ──────────────────────────────────────────────────────────────────

async function sorteios(
  sb: SupabaseClient,
  range: { inicio: string; fim: string } | null,
) {
  let query = sb
    .from('sorteios')
    .select('*, edicoes(numero, data_sorteio)')
    .order('realizado_em', { ascending: false })
    .limit(200)

  if (range) {
    query = query
      .gte('realizado_em', range.inicio)
      .lt('realizado_em', range.fim)
  }

  const { data: sorteiosRaw } = await query

  // Códigos das cartelas vencedoras
  const ids = (sorteiosRaw ?? [])
    .map((s: any) => s.cartela_vencedora)
    .filter(Boolean) as string[]

  const codigosMap: Record<string, string> = {}
  if (ids.length > 0) {
    const { data: cart } = await sb.from('cartelas').select('id, codigo').in('id', ids)
    for (const c of cart ?? [] as any[]) codigosMap[c.id] = c.codigo
  }

  const resultado = (sorteiosRaw ?? []).map((s: any) => {
    const edicao = Array.isArray(s.edicoes) ? s.edicoes[0] : s.edicoes
    return {
      id:                s.id,
      edicao_numero:     edicao?.numero      ?? '—',
      data_sorteio:      edicao?.data_sorteio ?? '—',
      numero_sorteio:    s.numero_sorteio,
      dezenas_sorteadas: s.dezenas_sorteadas ?? [],
      cartela_codigo:    s.cartela_vencedora ? (codigosMap[s.cartela_vencedora] ?? '—') : '—',
      valor_premio:      parseFloat(s.valor_premio ?? 0),
      status:            s.status ?? 'aguardando',
      realizado_em:      s.realizado_em ?? null,
    }
  })

  return { sorteios: resultado }
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const tipo    = searchParams.get('tipo') ?? 'visao-geral'
  const periodo = searchParams.get('periodo')
  const range   = parsePeriodo(periodo)

  try {
    switch (tipo) {
      case 'visao-geral':    return NextResponse.json(await visaoGeral(supabase))
      case 'distribuidores': return NextResponse.json(await distribuidores(supabase, range))
      case 'cartelas':       return NextResponse.json(await cartelas(supabase, range))
      case 'sorteios':       return NextResponse.json(await sorteios(supabase, range))
      default:               return NextResponse.json({ error: 'tipo invalido' }, { status: 400 })
    }
  } catch (e: unknown) {
    console.error('[relatorios/dados]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erro interno' },
      { status: 500 },
    )
  }
}
