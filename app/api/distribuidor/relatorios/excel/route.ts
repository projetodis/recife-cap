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

function moeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'distribuidor') return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const { data: dist } = await supabase
    .from('distribuidores').select('id, comissao_pct').eq('user_id', user.id).single()
  if (!dist) return NextResponse.json({ error: 'Distribuidor nao encontrado' }, { status: 404 })

  const { searchParams } = new URL(request.url)
  const tipo    = searchParams.get('tipo') ?? 'financeiro'
  const periodo = searchParams.get('periodo')
  const range   = parsePeriodo(periodo)

  const sb = adminSB()

  try {
    const XLSX = await import('xlsx')
    const wb   = XLSX.utils.book_new()
    let rows: Record<string, unknown>[] = []
    let sheetName = 'Relatório'
    let filename  = `recife-cap-dist-${tipo}${periodo ? `-${periodo}` : ''}`

    // ── Financeiro ────────────────────────────────────────────────────────────
    if (tipo === 'financeiro') {
      sheetName = 'Financeiro'

      const { data: edicoes } = await sb.from('edicoes').select('id, valor_unitario')
      const edicaoMap = Object.fromEntries((edicoes ?? []).map((e: any) => [e.id, e]))

      let q = sb.from('cartelas')
        .select('edicao_id, status, paga_em, created_at')
        .eq('distribuidor_id', dist.id)
      if (range) q = q.gte('created_at', range.inicio).lt('created_at', range.fim)
      const { data: cartelas } = await q

      const { data: comissoes } = await sb.from('comissoes')
        .select('valor, status, created_at')
        .eq('beneficiario_id', dist.id)

      const porMes: Record<string, { vendidas: number; receita: number }> = {}
      for (const c of cartelas ?? [] as any[]) {
        if (c.status !== 'paga') continue
        const valor = (edicaoMap[c.edicao_id] as any)?.valor_unitario ?? 0
        const key = (c.paga_em ?? c.created_at ?? '').substring(0, 7)
        if (!key) continue
        if (!porMes[key]) porMes[key] = { vendidas: 0, receita: 0 }
        porMes[key].vendidas++
        porMes[key].receita += valor
      }

      const comissaoPendente = (comissoes ?? []).filter((c: any) => c.status === 'pendente').reduce((a: number, c: any) => a + Number(c.valor), 0)
      const comissaoRecebida = (comissoes ?? []).filter((c: any) => c.status === 'pago').reduce((a: number, c: any) => a + Number(c.valor), 0)

      rows = Object.entries(porMes)
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([mes, d]) => ({
          'Mês':                 mes,
          'Cartelas vendidas':   d.vendidas,
          'Receita gerada':      moeda(d.receita),
          'Comissão devida':     moeda(d.receita * ((dist.comissao_pct ?? 0) / 100)),
        }))

      if (rows.length > 0) {
        rows.push({
          'Mês': '— TOTAIS —',
          'Cartelas vendidas': Object.values(porMes).reduce((a, d) => a + d.vendidas, 0),
          'Receita gerada': moeda(Object.values(porMes).reduce((a, d) => a + d.receita, 0)),
          'Comissão devida': moeda(Object.values(porMes).reduce((a, d) => a + d.receita, 0) * ((dist.comissao_pct ?? 0) / 100)),
        })
        rows.push({ 'Mês': 'Comissão pendente de pagamento', 'Cartelas vendidas': '', 'Receita gerada': '', 'Comissão devida': moeda(comissaoPendente) })
        rows.push({ 'Mês': 'Comissão já recebida', 'Cartelas vendidas': '', 'Receita gerada': '', 'Comissão devida': moeda(comissaoRecebida) })
      }
    }

    // ── PDVs ──────────────────────────────────────────────────────────────────
    else if (tipo === 'pdvs') {
      sheetName = 'PDVs'

      const { data: pdvsAll } = await sb.from('pontos_de_venda')
        .select('id, nome, bairro, status, comissao_pct')
        .eq('distribuidor_id', dist.id)
        .order('nome')

      const { data: edicoes } = await sb.from('edicoes').select('id, valor_unitario')
      const edicaoMap = Object.fromEntries((edicoes ?? []).map((e: any) => [e.id, e]))

      const pdvIds = (pdvsAll ?? []).map((p: any) => p.id)
      let cartelasQ = sb.from('cartelas').select('pdv_id, edicao_id, status').in('pdv_id', pdvIds.length > 0 ? pdvIds : ['__none__'])
      if (range) cartelasQ = cartelasQ.gte('created_at', range.inicio).lt('created_at', range.fim)
      const { data: cartelas } = await cartelasQ

      const receitaP: Record<string, number>  = {}
      const vendidasP: Record<string, number> = {}
      const estoqueP: Record<string, number>  = {}
      for (const c of cartelas ?? [] as any[]) {
        const p = c.pdv_id
        if (!p) continue
        const valor = (edicaoMap[c.edicao_id] as any)?.valor_unitario ?? 0
        if (c.status === 'paga') { receitaP[p] = (receitaP[p] ?? 0) + valor; vendidasP[p] = (vendidasP[p] ?? 0) + 1 }
        if (c.status === 'em_estoque_pdv') estoqueP[p] = (estoqueP[p] ?? 0) + 1
      }

      rows = (pdvsAll ?? []).map((p: any) => ({
        'PDV':               p.nome,
        'Bairro':            p.bairro ?? '—',
        'Status':            p.status,
        'Comissão (%)':      p.comissao_pct ?? 0,
        'Vendidas':          vendidasP[p.id] ?? 0,
        'Em estoque':        estoqueP[p.id] ?? 0,
        'Receita gerada':    moeda(receitaP[p.id] ?? 0),
      }))
    }

    // ── Cartelas ──────────────────────────────────────────────────────────────
    else if (tipo === 'cartelas') {
      sheetName = 'Cartelas'

      let q = sb.from('cartelas')
        .select('codigo, dv, status, paga_em, created_at, edicao_id, pdv_id, edicoes(numero, valor_unitario), pontos_de_venda(nome)')
        .eq('distribuidor_id', dist.id)
        .order('created_at', { ascending: false })
        .limit(2000)
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

      rows = (cartelasAll ?? []).map((c: any) => {
        const edicao = Array.isArray(c.edicoes) ? c.edicoes[0] : c.edicoes
        const pdv    = Array.isArray(c.pontos_de_venda) ? c.pontos_de_venda[0] : c.pontos_de_venda
        return {
          'Código':    c.codigo,
          'DV':        c.dv,
          'Status':    STATUS_LABEL[c.status] ?? c.status,
          'Edição':    edicao?.numero ?? '—',
          'Valor':     moeda(edicao?.valor_unitario ?? 0),
          'PDV':       pdv?.nome ?? '—',
          'Paga em':   c.paga_em ? new Date(c.paga_em).toLocaleDateString('pt-BR') : '—',
          'Criada em': new Date(c.created_at).toLocaleDateString('pt-BR'),
        }
      })
    }

    if (rows.length === 0) {
      rows = [{ 'Informação': 'Nenhum dado para o período selecionado' }]
    }

    const ws   = XLSX.utils.json_to_sheet(rows)
    const cols = Object.keys(rows[0] ?? {}).map(k => ({ wch: Math.max(k.length + 2, 12) }))
    ws['!cols'] = cols
    XLSX.utils.book_append_sheet(wb, ws, sheetName)

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer

    return new NextResponse(buf as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}.xlsx"`,
      },
    })
  } catch (e: unknown) {
    console.error('[distribuidor/relatorios/excel]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erro interno' },
      { status: 500 },
    )
  }
}
