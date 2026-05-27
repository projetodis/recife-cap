import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function adminSB() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function parsePeriodo(p: string | null): { inicio: string; fim: string } | null {
  if (!p || !/^\d{4}-\d{2}$/.test(p)) return null
  const [y, m] = p.split('-').map(Number)
  return {
    inicio: new Date(y!, m! - 1, 1).toISOString(),
    fim:    new Date(y!, m!, 1).toISOString(),
  }
}

function labelMes(yyyymm: string): string {
  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  const [y, m] = yyyymm.split('-').map(Number)
  return `${meses[(m ?? 1) - 1]}/${String(y ?? 0).slice(2)}`
}

async function autorizarDistribuidor() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'distribuidor') return null
  const { data: dist } = await supabase.from('distribuidores').select('id, comissao_pct, meta_mensal').eq('user_id', user.id).single()
  if (!dist) return null
  return { user, dist: dist as { id: string; comissao_pct: number; meta_mensal: number } }
}

// ── Financeiro ────────────────────────────────────────────────────────────────

async function financeiro(
  distribuidorId: string,
  comissaoPct: number,
  metaMensal: number,
  range: { inicio: string; fim: string } | null,
) {
  const sb = adminSB()

  const { data: edicoes } = await sb.from('edicoes').select('id, valor_unitario')
  const edicaoMap = Object.fromEntries((edicoes ?? []).map((e: any) => [e.id, e]))

  let q = sb
    .from('cartelas')
    .select('edicao_id, status, paga_em, created_at')
    .eq('distribuidor_id', distribuidorId)
  if (range) q = q.gte('created_at', range.inicio).lt('created_at', range.fim)
  const { data: cartelas } = await q

  const { data: comissoesAll } = await sb
    .from('comissoes')
    .select('valor, status, created_at')
    .eq('beneficiario_id', distribuidorId)

  let totalReceita = 0
  let totalCartelas = 0
  let cartelasVendidas = 0
  const porMesMap: Record<string, { receita: number; vendidas: number }> = {}

  for (const c of cartelas ?? [] as any[]) {
    totalCartelas++
    const valor = (edicaoMap[c.edicao_id] as any)?.valor_unitario ?? 0
    if (c.status === 'paga') {
      totalReceita += valor
      cartelasVendidas++
      const mesKey = (c.paga_em ?? c.created_at ?? '').substring(0, 7)
      if (mesKey) {
        if (!porMesMap[mesKey]) porMesMap[mesKey] = { receita: 0, vendidas: 0 }
        porMesMap[mesKey].receita += valor
        porMesMap[mesKey].vendidas++
      }
    }
  }

  // Últimos 6 meses
  const hoje = new Date()
  const vendas_por_mes = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - 5 + i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    return {
      mes: key,
      label: labelMes(key),
      receita: porMesMap[key]?.receita ?? 0,
      vendidas: porMesMap[key]?.vendidas ?? 0,
    }
  })

  const comissaoPendente = (comissoesAll ?? [])
    .filter((c: any) => c.status === 'pendente')
    .reduce((acc: number, c: any) => acc + Number(c.valor), 0)
  const comissaoRecebida = (comissoesAll ?? [])
    .filter((c: any) => c.status === 'pago')
    .reduce((acc: number, c: any) => acc + Number(c.valor), 0)

  const comissaoDevida = totalReceita * (comissaoPct / 100)
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
  const receitaMesAtual = porMesMap[mesAtual]?.receita ?? 0
  const progressoMeta = metaMensal > 0 ? Math.min(100, Math.round((receitaMesAtual / metaMensal) * 100)) : null

  return {
    cards: {
      receita_total: totalReceita,
      comissao_devida: comissaoDevida,
      comissao_pendente: comissaoPendente,
      comissao_recebida: comissaoRecebida,
      total_cartelas: totalCartelas,
      cartelas_vendidas: cartelasVendidas,
      taxa_conversao: totalCartelas > 0 ? Math.round((cartelasVendidas / totalCartelas) * 100) : 0,
      progresso_meta: progressoMeta,
      meta_mensal: metaMensal,
      receita_mes_atual: receitaMesAtual,
    },
    vendas_por_mes,
  }
}

// ── PDVs ──────────────────────────────────────────────────────────────────────

async function pdvs(
  distribuidorId: string,
  range: { inicio: string; fim: string } | null,
) {
  const sb = adminSB()

  const { data: pdvsAll } = await sb
    .from('pontos_de_venda')
    .select('id, nome, bairro, status, comissao_pct')
    .eq('distribuidor_id', distribuidorId)
    .order('nome')

  const { data: edicoes } = await sb.from('edicoes').select('id, valor_unitario')
  const edicaoMap = Object.fromEntries((edicoes ?? []).map((e: any) => [e.id, e]))

  const pdvIds = (pdvsAll ?? []).map((p: any) => p.id)

  let cartelasQ = sb
    .from('cartelas')
    .select('pdv_id, edicao_id, status')
    .in('pdv_id', pdvIds.length > 0 ? pdvIds : ['__none__'])
  if (range) cartelasQ = cartelasQ.gte('created_at', range.inicio).lt('created_at', range.fim)
  const { data: cartelas } = await cartelasQ

  const receitaPorPdv: Record<string, number>  = {}
  const vendidasPorPdv: Record<string, number> = {}
  const estoquePortPdv: Record<string, number> = {}

  for (const c of cartelas ?? [] as any[]) {
    const p = c.pdv_id
    if (!p) continue
    const valor = (edicaoMap[c.edicao_id] as any)?.valor_unitario ?? 0
    if (c.status === 'paga') {
      receitaPorPdv[p]  = (receitaPorPdv[p] ?? 0) + valor
      vendidasPorPdv[p] = (vendidasPorPdv[p] ?? 0) + 1
    } else if (c.status === 'em_estoque_pdv') {
      estoquePortPdv[p] = (estoquePortPdv[p] ?? 0) + 1
    }
  }

  const resultado = (pdvsAll ?? []).map((p: any) => ({
    id:              p.id,
    nome:            p.nome,
    bairro:          p.bairro ?? '—',
    status:          p.status,
    comissao_pct:    p.comissao_pct ?? 0,
    vendidas:        vendidasPorPdv[p.id] ?? 0,
    em_estoque:      estoquePortPdv[p.id] ?? 0,
    receita:         receitaPorPdv[p.id] ?? 0,
  }))

  return { pdvs: resultado }
}

// ── Cartelas ──────────────────────────────────────────────────────────────────

async function cartelas(
  distribuidorId: string,
  range: { inicio: string; fim: string } | null,
) {
  const sb = adminSB()

  let q = sb
    .from('cartelas')
    .select('id, codigo, dv, status, pdv_id, paga_em, created_at, edicao_id, edicoes(numero, valor_unitario), pontos_de_venda(nome)')
    .eq('distribuidor_id', distribuidorId)
    .order('created_at', { ascending: false })
    .limit(500)
  if (range) q = q.gte('created_at', range.inicio).lt('created_at', range.fim)
  const { data: cartelasAll } = await q

  const STATUS_LABEL: Record<string, string> = {
    em_estoque_distribuidor: 'Em estoque',
    em_estoque_pdv: 'No PDV',
    vendida: 'Vendida',
    paga: 'Paga',
    cancelada: 'Cancelada',
    reservada: 'Reservada',
  }

  // Resumo por status
  const porStatus: Record<string, number> = {}
  for (const c of cartelasAll ?? [] as any[]) {
    porStatus[c.status] = (porStatus[c.status] ?? 0) + 1
  }

  const resultado = (cartelasAll ?? []).map((c: any) => {
    const edicao = Array.isArray(c.edicoes) ? c.edicoes[0] : c.edicoes
    const pdv    = Array.isArray(c.pontos_de_venda) ? c.pontos_de_venda[0] : c.pontos_de_venda
    return {
      codigo:    c.codigo,
      dv:        c.dv,
      status:    c.status,
      status_label: STATUS_LABEL[c.status] ?? c.status,
      edicao:    edicao?.numero ?? '—',
      valor:     edicao?.valor_unitario ?? 0,
      pdv:       pdv?.nome ?? '—',
      paga_em:   c.paga_em ?? null,
      criada_em: c.created_at,
    }
  })

  return { cartelas: resultado, por_status: porStatus }
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const auth = await autorizarDistribuidor()
  if (!auth) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const { dist } = auth
  const { searchParams } = new URL(request.url)
  const tipo    = searchParams.get('tipo') ?? 'financeiro'
  const periodo = searchParams.get('periodo')
  const range   = parsePeriodo(periodo)

  try {
    switch (tipo) {
      case 'financeiro':
        return NextResponse.json(await financeiro(dist.id, dist.comissao_pct, dist.meta_mensal ?? 0, range))
      case 'pdvs':
        return NextResponse.json(await pdvs(dist.id, range))
      case 'cartelas':
        return NextResponse.json(await cartelas(dist.id, range))
      default:
        return NextResponse.json({ error: 'tipo invalido' }, { status: 400 })
    }
  } catch (e: unknown) {
    console.error('[distribuidor/relatorios]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erro interno' },
      { status: 500 },
    )
  }
}
