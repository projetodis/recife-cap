import { NextResponse, NextRequest } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function adminSB() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function GET(req: NextRequest) {
  const sb       = adminSB()
  const edicaoId = req.nextUrl.searchParams.get('edicao')

  const { data: edicoes } = await sb
    .from('edicoes')
    .select('id, numero, data_sorteio, status')
    .in('status', ['encerrada', 'finalizada', 'concluida'])
    .order('numero', { ascending: false })

  if (!edicoes?.length) {
    return NextResponse.json({ edicoes: [], edicao: null, sorteios: [], ganhadores: [], premios: [], snapshot: null })
  }

  const edicao = (edicaoId ? edicoes.find((e: any) => e.id === edicaoId) : null) ?? edicoes[0]

  const { data: sorteiosRaw } = await sb
    .from('sorteios')
    .select('id, numero_sorteio, valor_premio, status, dezenas_sorteadas, realizado_em, cartela_vencedora')
    .eq('edicao_id', edicao.id)
    .order('numero_sorteio', { ascending: true })

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
      const cartela = Array.isArray(g.cartela) ? g.cartela[0] : g.cartela
      const pdv     = cartela ? (Array.isArray(cartela.pdv) ? cartela.pdv[0] : cartela.pdv) : null
      return {
        sorteio_numero: sorteioNumMap[g.sorteio_id] ?? 0,
        cartela: cartela ? {
          numero:         `${cartela.codigo ?? ''}${cartela.dv ? '-' + cartela.dv : ''}`,
          nome_comprador: cartela.nome_comprador ?? null,
          status:         cartela.status ?? null,
          pdv_nome:       pdv?.nome ?? null,
        } : null,
      }
    })
  }

  const { data: premios } = await sb
    .from('premios_edicao')
    .select('id, ordem, nome, valor, foto_url, destaque')
    .eq('edicao_id', edicao.id)
    .eq('ativo', true)
    .order('ordem', { ascending: true })

  let snapshot = null
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

  const sorteios = (sorteiosRaw ?? []).map((s: any) => ({
    id:                s.id,
    numero_sorteio:    s.numero_sorteio,
    valor_premio:      parseFloat(s.valor_premio ?? 0),
    status:            s.status ?? 'aguardando',
    dezenas_sorteadas: s.dezenas_sorteadas ?? [],
    realizado_em:      s.realizado_em ?? null,
    cartela_vencedora: s.cartela_vencedora ?? null,
  }))

  return NextResponse.json({
    edicoes:   edicoes.map((e: any) => ({ id: e.id, numero: e.numero, data_sorteio: e.data_sorteio, status: e.status })),
    edicao:    { id: edicao.id, numero: edicao.numero, data_sorteio: edicao.data_sorteio, status: edicao.status },
    sorteios,
    ganhadores,
    premios:   premios ?? [],
    snapshot,
  })
}
