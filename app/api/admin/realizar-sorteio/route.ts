import { createClient as createAdminSupabase } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const { edicao_id, sorteio_id } = await request.json()
  if (!edicao_id || !sorteio_id) {
    return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
  }

  const admin = createAdminSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Verifica se o sorteio existe e ainda não foi realizado
  const { data: sorteio } = await admin
    .from('sorteios')
    .select('id, status')
    .eq('id', sorteio_id)
    .eq('edicao_id', edicao_id)
    .single()

  if (!sorteio) return NextResponse.json({ error: 'Sorteio não encontrado' }, { status: 404 })
  if (sorteio.status === 'realizado') return NextResponse.json({ error: 'Sorteio já realizado' }, { status: 409 })

  // Busca todas as cartelas pagas da edição
  const { data: cartelas, error: erroCartelas } = await admin
    .from('cartelas')
    .select('id, codigo, dezenas_sorteio_1, pdv_id')
    .eq('edicao_id', edicao_id)
    .eq('status', 'paga')

  if (erroCartelas) return NextResponse.json({ error: erroCartelas.message }, { status: 500 })
  if (!cartelas || cartelas.length === 0) {
    return NextResponse.json({ error: 'Nenhuma cartela paga nesta edição' }, { status: 422 })
  }

  // Seleciona cartela vencedora aleatória
  const idx = Math.floor(Math.random() * cartelas.length)
  const vencedora = cartelas[idx]

  // Registra o resultado no sorteio
  const { error: erroUpdate } = await admin
    .from('sorteios')
    .update({
      cartela_vencedora: vencedora.id,
      dezenas_sorteadas: vencedora.dezenas_sorteio_1 ?? [],
      status: 'realizado',
      realizado_em: new Date().toISOString(),
    })
    .eq('id', sorteio_id)

  if (erroUpdate) return NextResponse.json({ error: erroUpdate.message }, { status: 500 })

  // Verifica se há sorteios pendentes para atualizar status da edição
  const { data: pendentes } = await admin
    .from('sorteios')
    .select('id')
    .eq('edicao_id', edicao_id)
    .neq('status', 'realizado')

  if (!pendentes || pendentes.length === 0) {
    await admin.from('edicoes').update({ status: 'encerrada' }).eq('id', edicao_id)
  } else {
    await admin
      .from('edicoes')
      .update({ status: 'em_sorteio' })
      .eq('id', edicao_id)
      .eq('status', 'ativa')
  }

  // Busca nome do PDV e distribuidor da cartela vencedora
  let pdv_nome: string | null = null
  let distribuidor_nome: string | null = null

  if (vencedora.pdv_id) {
    const { data: pdv } = await admin
      .from('pontos_de_venda')
      .select('nome, distribuidores(profiles(nome))')
      .eq('id', vencedora.pdv_id)
      .single()

    if (pdv) {
      pdv_nome = (pdv as any).nome ?? null
      const dist = Array.isArray((pdv as any).distribuidores)
        ? (pdv as any).distribuidores[0]
        : (pdv as any).distribuidores
      const distProf = Array.isArray(dist?.profiles) ? dist.profiles[0] : dist?.profiles
      distribuidor_nome = distProf?.nome ?? null
    }
  }

  return NextResponse.json({
    cartela_codigo:    vencedora.codigo,
    pdv_nome,
    distribuidor_nome,
    dezenas:           vencedora.dezenas_sorteio_1 ?? [],
  })
}
