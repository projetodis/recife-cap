import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

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

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const tipo    = searchParams.get('tipo') ?? 'distribuidores'
  const periodo = searchParams.get('periodo')
  const range   = parsePeriodo(periodo)

  try {
    const XLSX = await import('xlsx')

    const wb   = XLSX.utils.book_new()
    let rows: Record<string, unknown>[] = []
    let sheetName = 'Relatório'
    let filename  = `recife-cap-${tipo}`

    // ── Distribuidores ────────────────────────────────────────────────────────
    if (tipo === 'distribuidores') {
      sheetName = 'Distribuidores'
      filename  = `recife-cap-distribuidores${periodo ? `-${periodo}` : ''}`

      const { data: distribs } = await supabase
        .from('distribuidores')
        .select('id, nivel, comissao_pct, status, profiles(nome)')

      const { data: edicoes } = await supabase.from('edicoes').select('id, valor_unitario')
      const edicaoMap = Object.fromEntries((edicoes ?? []).map((e: any) => [e.id, e]))

      let cartelasQ = supabase
        .from('cartelas')
        .select('distribuidor_id, edicao_id, status')
        .not('distribuidor_id', 'is', null)
      if (range) {
        cartelasQ = cartelasQ.gte('created_at', range.inicio).lt('created_at', range.fim)
      }
      const { data: cartelas } = await cartelasQ

      const enviadas: Record<string, number>  = {}
      const vendidas: Record<string, number>  = {}
      const receita:  Record<string, number>  = {}
      for (const c of cartelas ?? [] as any[]) {
        const d = c.distribuidor_id
        if (!d) continue
        enviadas[d] = (enviadas[d] ?? 0) + 1
        if (c.status === 'paga') {
          vendidas[d] = (vendidas[d] ?? 0) + 1
          receita[d]  = (receita[d] ?? 0) + ((edicaoMap[c.edicao_id] as any)?.valor_unitario ?? 0)
        }
      }

      rows = (distribs ?? []).map((d: any) => {
        const nome  = Array.isArray(d.profiles) ? (d.profiles[0]?.nome ?? '—') : (d.profiles?.nome ?? '—')
        const env   = enviadas[d.id] ?? 0
        const vend  = vendidas[d.id] ?? 0
        const rec   = receita[d.id] ?? 0
        return {
          'Nome':              nome,
          'Nível':             d.nivel,
          'Status':            d.status,
          'Comissão (%)':      d.comissao_pct,
          'Cartelas enviadas': env,
          'Cartelas vendidas': vend,
          'Conversão (%)':     env > 0 ? Math.round((vend / env) * 100) : 0,
          'Receita gerada':    moeda(rec),
          'Comissão devida':   moeda(rec * ((d.comissao_pct ?? 0) / 100)),
        }
      })
    }

    // ── Cartelas por edição ───────────────────────────────────────────────────
    else if (tipo === 'cartelas') {
      sheetName = 'Cartelas por Edição'
      filename  = `recife-cap-cartelas${periodo ? `-${periodo}` : ''}`

      let edicaoQ = supabase
        .from('edicoes')
        .select('id, numero, data_sorteio, valor_unitario, status')
        .order('numero', { ascending: false })
      if (range) {
        edicaoQ = edicaoQ
          .gte('data_sorteio', range.inicio.split('T')[0])
          .lt('data_sorteio', range.fim.split('T')[0])
      }
      const { data: edicoes } = await edicaoQ
      const ids = (edicoes ?? []).map((e: any) => e.id)

      const counts: Record<string, Record<string, number>> = {}
      if (ids.length > 0) {
        const { data: cartelas } = await supabase
          .from('cartelas').select('edicao_id, status').in('edicao_id', ids)
        for (const c of cartelas ?? [] as any[]) {
          if (!counts[c.edicao_id]) counts[c.edicao_id] = {}
          counts[c.edicao_id][c.status] = (counts[c.edicao_id][c.status] ?? 0) + 1
        }
      }

      rows = (edicoes ?? []).map((e: any) => {
        const s      = counts[e.id] ?? {}
        const total  = Object.values(s).reduce((a: number, b) => a + (b as number), 0)
        const vend   = s['paga'] ?? 0
        return {
          'Edição':         e.numero,
          'Data do sorteio': e.data_sorteio,
          'Status edição':   e.status,
          'Total geradas':   total,
          'Vendidas':        vend,
          'Em estoque':      s['em_estoque_distribuidor'] ?? 0,
          'Devolvidas':      s['devolvida'] ?? 0,
          '% Vendidas':      `${total > 0 ? Math.round((vend / total) * 100) : 0}%`,
          'Receita':         moeda(vend * (e.valor_unitario ?? 0)),
        }
      })
    }

    // ── Sorteios ──────────────────────────────────────────────────────────────
    else if (tipo === 'sorteios') {
      sheetName = 'Sorteios'
      filename  = `recife-cap-sorteios${periodo ? `-${periodo}` : ''}`

      let q = supabase
        .from('sorteios')
        .select('*, edicoes(numero, data_sorteio)')
        .order('realizado_em', { ascending: false })
        .limit(500)
      if (range) {
        q = q.gte('realizado_em', range.inicio).lt('realizado_em', range.fim)
      }
      const { data: sorteiosRaw } = await q

      const ids = (sorteiosRaw ?? []).map((s: any) => s.cartela_vencedora).filter(Boolean)
      const codigosMap: Record<string, string> = {}
      if (ids.length > 0) {
        const { data: cart } = await supabase.from('cartelas').select('id, codigo').in('id', ids)
        for (const c of cart ?? [] as any[]) codigosMap[c.id] = c.codigo
      }

      rows = (sorteiosRaw ?? []).map((s: any) => {
        const ed = Array.isArray(s.edicoes) ? s.edicoes[0] : s.edicoes
        return {
          'Edição':         ed?.numero ?? '—',
          'Data sorteio':   ed?.data_sorteio ?? '—',
          'Nº sorteio':     s.numero_sorteio,
          'Status':         s.status ?? 'aguardando',
          'Realizado em':   s.realizado_em ?? '—',
          'Dezenas':        (s.dezenas_sorteadas ?? []).join(', '),
          'Cartela vencedora': s.cartela_vencedora
            ? (codigosMap[s.cartela_vencedora] ?? s.cartela_vencedora)
            : '—',
          'Prêmio':         moeda(parseFloat(s.valor_premio ?? 0)),
        }
      })
    }

    if (rows.length === 0) {
      rows = [{ 'Informação': 'Nenhum dado para o período selecionado' }]
    }

    const ws = XLSX.utils.json_to_sheet(rows)

    // Largura automática das colunas
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
    console.error('[relatorios/excel]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erro interno' },
      { status: 500 },
    )
  }
}
