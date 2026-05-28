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

  const { data: edicoes, error: edicaoError } = await sb
    .from('edicoes')
    .select('id, numero, descricao, data_sorteio, status, premio_principal')
    .in('status', ['encerrada'])
    .order('numero', { ascending: false })

  if (edicaoError) {
    console.error('Erro query edicoes:', edicaoError)
    return NextResponse.json({ error: edicaoError.message }, { status: 500 })
  }

  if (!edicoes?.length) {
    return NextResponse.json({ edicoes: [], edicao: null, sorteios: [], ganhadores: [], premios: [], snapshot: null })
  }

  const edicao = (edicaoId ? edicoes.find((e: any) => e.id === edicaoId) : null) ?? edicoes[0]

  // ── Sorteios ──────────────────────────────────────────────────────────────
  const { data: sorteiosRaw } = await sb
    .from('sorteios')
    .select('id, numero_sorteio, valor_premio, status, dezenas_sorteadas, realizado_em, cartela_vencedora, arte_url, banner_url, premio_id')
    .eq('edicao_id', edicao.id)
    .eq('status', 'realizado')
    .order('numero_sorteio', { ascending: true })

  const premioIds = (sorteiosRaw ?? []).map((s: any) => s.premio_id).filter(Boolean)
  const { data: premiosLookup } = premioIds.length
    ? await sb.from('premios_edicao').select('id, nome, valor, foto_url, tipo, ordem').in('id', premioIds)
    : { data: [] }

  const sorteiosComPremio = (sorteiosRaw ?? []).map((s: any) => ({
    ...s,
    premios_edicao: (premiosLookup ?? []).find((p: any) => p.id === s.premio_id) ?? null,
  }))

  const sorteioIds = (sorteiosRaw ?? []).map((s: any) => s.id)

  // ── Ganhadores via campos desnormalizados ─────────────────────────────────
  const { data: ganhadoresRaw } = await sb
    .from('ganhadores')
    .select('id, sorteio_id, sorteio_numero, nome_ganhador, numero_titulo, cidade, pdv_nome, premio_nome, premio_valor, confirmado')
    .eq('edicao_id', edicao.id)
    .order('sorteio_numero')

  const ganhadores = (ganhadoresRaw ?? []).map((g: any) => ({
    id:             g.id,
    sorteio_id:     g.sorteio_id,
    sorteio_numero: g.sorteio_numero ?? 0,
    nome_ganhador:  g.nome_ganhador  ?? null,
    numero_titulo:  g.numero_titulo  ?? null,
    cidade:         g.cidade         ?? null,
    pdv_nome:       g.pdv_nome       ?? null,
    premio_nome:    g.premio_nome    ?? null,
    premio_valor:   g.premio_valor   != null ? parseFloat(g.premio_valor) : null,
    confirmado:     g.confirmado     ?? null,
  }))

  // ── Prêmios da edição ─────────────────────────────────────────────────────
  const { data: premios } = await sb
    .from('premios_edicao')
    .select('id, ordem, nome, valor, foto_url, destaque')
    .eq('edicao_id', edicao.id)
    .eq('ativo', true)
    .order('ordem', { ascending: true })

  // ── Snapshot ──────────────────────────────────────────────────────────────
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

  const sorteios = sorteiosComPremio.map((s: any) => {
    const pe = s.premios_edicao
    return {
      id:                s.id,
      numero_sorteio:    s.numero_sorteio,
      valor_premio:      parseFloat(s.valor_premio ?? 0),
      status:            s.status ?? 'aguardando',
      dezenas_sorteadas: s.dezenas_sorteadas ?? [],
      realizado_em:      s.realizado_em ?? null,
      cartela_vencedora: s.cartela_vencedora ?? null,
      arte_url:          s.arte_url ?? null,
      banner_url:        s.banner_url ?? null,
      premios_edicao:    pe ? {
        id:       pe.id,
        nome:     pe.nome,
        valor:    parseFloat(pe.valor ?? 0),
        foto_url: pe.foto_url ?? null,
        ordem:    pe.ordem,
      } : null,
    }
  })

  return NextResponse.json({
    edicoes:   edicoes.map((e: any) => ({ id: e.id, numero: e.numero, data_sorteio: e.data_sorteio, status: e.status })),
    edicao:    { id: edicao.id, numero: edicao.numero, data_sorteio: edicao.data_sorteio, status: edicao.status },
    sorteios,
    ganhadores,
    premios:   premios ?? [],
    snapshot,
  })
}
