import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { verificarGanhadores } from '@/lib/sorteio-engine'
import { logSorteio, logGanhador } from '@/lib/logger'

function adminSB() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

async function autorizarAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'admin' ? user : null
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!await autorizarAdmin()) {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 })
  }

  const { id: sorteioId } = await params
  const { dezena } = await req.json()
  const num = Number(dezena)

  if (!num || num < 1 || num > 60) {
    return NextResponse.json({ erro: 'Dezena deve estar entre 1 e 60' }, { status: 400 })
  }

  const sb = adminSB()

  const { data: sorteio } = await sb
    .from('sorteios')
    .select('id, numero_sorteio, dezenas_sorteadas, status, cartela_vencedora')
    .eq('id', sorteioId)
    .single()

  if (!sorteio) return NextResponse.json({ erro: 'Sorteio não encontrado' }, { status: 404 })
  if (sorteio.status === 'realizado') return NextResponse.json({ erro: 'Sorteio já encerrado' }, { status: 400 })

  const atual = (sorteio.dezenas_sorteadas ?? []).map(Number)

  if (atual.includes(num)) {
    return NextResponse.json({ erro: `Dezena ${num} já foi sorteada` }, { status: 400 })
  }

  const novaLista = [...atual, num]

  const { error } = await sb
    .from('sorteios')
    .update({ dezenas_sorteadas: novaLista })
    .eq('id', sorteioId)

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })

  const { ganhadores, ranking } = await verificarGanhadores(sorteioId, sorteio.numero_sorteio)

  if (ganhadores.length > 0) {
    // Descobre quais já estão registrados para não duplicar
    const { data: jaRegistrados } = await sb
      .from('ganhadores')
      .select('cartela_id')
      .eq('sorteio_id', sorteioId)

    const jaSet = new Set((jaRegistrados ?? []).map((g: { cartela_id: string }) => g.cartela_id))
    const novos = ganhadores.filter(g => !jaSet.has(g.cartela_id))

    if (novos.length > 0) {
      await sb
        .from('ganhadores')
        .insert(novos.map(g => ({ sorteio_id: sorteioId, cartela_id: g.cartela_id })))

      // Registra a primeira cartela vencedora no sorteio (referência rápida)
      if (!sorteio.cartela_vencedora) {
        await sb
          .from('sorteios')
          .update({ cartela_vencedora: novos[0].cartela_id })
          .eq('id', sorteioId)
      }
    }
  }

  logSorteio('dezena_inserida', { dezena: num, sorteio_id: sorteioId, total: novaLista.length })
  if (ganhadores.length > 0) {
    logGanhador('ganhador_detectado', { sorteio_id: sorteioId, total_ganhadores: ganhadores.length })
  }

  return NextResponse.json({
    dezenas_sorteadas: novaLista,
    ganhadores,
    ranking,
  })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!await autorizarAdmin()) {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 })
  }

  const { id: sorteioId } = await params
  const sb = adminSB()

  const { data: sorteio } = await sb
    .from('sorteios')
    .select('id, dezenas_sorteadas, status')
    .eq('id', sorteioId)
    .single()

  if (!sorteio) return NextResponse.json({ erro: 'Sorteio não encontrado' }, { status: 404 })
  if (sorteio.status === 'realizado') return NextResponse.json({ erro: 'Sorteio já encerrado' }, { status: 400 })

  const atual = (sorteio.dezenas_sorteadas ?? []).map(Number)
  if (atual.length === 0) return NextResponse.json({ erro: 'Nenhuma dezena para desfazer' }, { status: 400 })

  const novaLista = atual.slice(0, -1)

  await sb
    .from('sorteios')
    .update({ dezenas_sorteadas: novaLista, cartela_vencedora: null })
    .eq('id', sorteioId)

  return NextResponse.json({ dezenas_sorteadas: novaLista })
}
