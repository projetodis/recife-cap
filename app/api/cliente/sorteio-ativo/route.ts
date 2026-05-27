import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function adminSB() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function GET() {
  const sb = adminSB()

  // Edição mais próxima: ativas ou em sorteio
  const { data: edicoes } = await sb
    .from('edicoes')
    .select('id, numero, data_sorteio, hora_sorteio, premio_principal, valor_unitario, status, total_cartelas')
    .in('status', ['ativa', 'em_sorteio'])
    .order('data_sorteio', { ascending: true })
    .limit(1)

  if (!edicoes?.length)
    return NextResponse.json({ edicao: null, sorteios: [] })

  const edicao = edicoes[0]!

  const { data: sorteiosRaw } = await sb
    .from('sorteios')
    .select('id, numero_sorteio, valor_premio, status, dezenas_sorteadas, realizado_em, cartela_vencedora')
    .eq('edicao_id', edicao.id)
    .order('numero_sorteio', { ascending: true })

  // Código das cartelas vencedoras (se houver)
  const vencIds = (sorteiosRaw ?? [])
    .map((s: any) => s.cartela_vencedora).filter(Boolean) as string[]

  const codigosMap: Record<string, string> = {}
  if (vencIds.length > 0) {
    const { data: cart } = await sb
      .from('cartelas').select('id, codigo, dv').in('id', vencIds)
    for (const c of cart ?? [] as any[]) codigosMap[c.id] = `${c.codigo}-${c.dv}`
  }

  const sorteios = (sorteiosRaw ?? []).map((s: any) => ({
    id:                s.id,
    numero_sorteio:    s.numero_sorteio,
    valor_premio:      parseFloat(s.valor_premio ?? 0),
    status:            s.status ?? 'aguardando',
    dezenas_sorteadas: s.dezenas_sorteadas ?? [],
    realizado_em:      s.realizado_em ?? null,
    cartela_vencedora: s.cartela_vencedora
      ? (codigosMap[s.cartela_vencedora] ?? s.cartela_vencedora)
      : null,
  }))

  // Ganhadores com dados da cartela e PDV
  const sorteioIds = (sorteiosRaw ?? []).map((s: any) => s.id)
  const sorteioNumMap: Record<string, number> = Object.fromEntries(
    (sorteiosRaw ?? []).map((s: any) => [s.id, s.numero_sorteio])
  )

  let ganhadores: any[] = []
  if (sorteioIds.length > 0) {
    const { data: ganhadoresRaw } = await sb
      .from('ganhadores')
      .select('sorteio_id, cartela:cartelas(codigo, dv, nome_comprador, status, pdv:pontos_de_venda(nome))')
      .in('sorteio_id', sorteioIds)

    ganhadores = (ganhadoresRaw ?? []).map((g: any) => {
      const cartela  = Array.isArray(g.cartela) ? g.cartela[0] : g.cartela
      const pdv      = cartela ? (Array.isArray(cartela.pdv) ? cartela.pdv[0] : cartela.pdv) : null
      return {
        sorteio_numero: sorteioNumMap[g.sorteio_id] ?? 0,
        cartela: cartela ? {
          numero:          `${cartela.codigo ?? ''}${cartela.dv ? '-' + cartela.dv : ''}`,
          nome_comprador:  cartela.nome_comprador ?? null,
          status:          cartela.status ?? null,
          pdv_nome:        pdv?.nome ?? null,
        } : null,
      }
    })
  }

  // Snapshot mais recente da sessão de sorteio ativa
  let snapshot: Record<string, string | null> | null = null
  if (sorteioIds.length > 0) {
    const { data: snapRow } = await sb
      .from('sorteio_snapshots')
      .select('*')
      .in('sorteio_id', sorteioIds)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    snapshot = snapRow ?? null
  }

  return NextResponse.json({
    edicao: {
      id:               edicao.id,
      numero:           edicao.numero,
      data_sorteio:     edicao.data_sorteio,
      hora_sorteio:     edicao.hora_sorteio,
      premio_principal: edicao.premio_principal,
      valor_unitario:   edicao.valor_unitario,
      status:           edicao.status,
      total_cartelas:   edicao.total_cartelas,
    },
    sorteios,
    ganhadores,
    snapshot,
  })
}
