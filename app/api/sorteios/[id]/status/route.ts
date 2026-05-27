import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { logSorteio } from '@/lib/logger'

function adminSB() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

const ROLES_PERMITIDOS = ['admin', 'operador_sorteio']

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile?.role || !ROLES_PERMITIDOS.includes(profile.role)) {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 })
  }

  const { id: sorteioId } = await params
  const { acao } = await req.json()

  const sb = adminSB()

  const { data: sorteio } = await sb
    .from('sorteios')
    .select('id, edicao_id, status, numero_sorteio, dezenas_sorteadas, cartela_vencedora')
    .eq('id', sorteioId)
    .single()

  if (!sorteio) return NextResponse.json({ erro: 'Sorteio não encontrado' }, { status: 404 })

  if (acao === 'iniciar') {
    await sb.from('edicoes').update({ status: 'em_sorteio' }).eq('id', sorteio.edicao_id)

    // Snapshot das configurações no momento em que o sorteio é iniciado
    const { data: cfgRows } = await sb
      .from('configuracoes')
      .select('chave, valor')
    const cfg: Record<string, string> = {}
    for (const r of cfgRows ?? []) cfg[r.chave] = r.valor || ''

    await sb.from('sorteio_snapshots').upsert({
      sorteio_id:                sorteioId,
      edicao_id:                 sorteio.edicao_id,
      nome_sistema:              cfg.nome_sistema              ?? null,
      banner_url:                cfg.banner_sorteio_url        ?? null,
      premio_1_foto_url:         cfg.premio_1_foto_url         ?? null,
      premio_1_nome:             cfg.premio_1_nome             ?? null,
      premio_1_valor:            cfg.premio_1_valor            ?? null,
      premio_2_foto_url:         cfg.premio_2_foto_url         ?? null,
      premio_2_nome:             cfg.premio_2_nome             ?? null,
      premio_2_valor:            cfg.premio_2_valor            ?? null,
      premio_3_foto_url:         cfg.premio_3_foto_url         ?? null,
      premio_3_nome:             cfg.premio_3_nome             ?? null,
      premio_3_valor:            cfg.premio_3_valor            ?? null,
      premio_4_foto_url:         cfg.premio_4_foto_url         ?? null,
      premio_4_nome:             cfg.premio_4_nome             ?? null,
      premio_4_valor:            cfg.premio_4_valor            ?? null,
      premio_principal_foto_url: cfg.premio_principal_foto_url ?? null,
      premio_principal_nome:     cfg.premio_principal_nome     ?? null,
      premio_principal_valor:    cfg.premio_principal_valor    ?? null,
    }, { onConflict: 'sorteio_id' })

    logSorteio('sorteio_iniciado', {
      sorteio_id: sorteioId,
      numero: sorteio.numero_sorteio,
      usuario_id: user.id,
    })
    return NextResponse.json({ ok: true })
  }

  if (acao === 'encerrar') {
    if (sorteio.status === 'realizado') {
      return NextResponse.json({ erro: 'Sorteio já encerrado' }, { status: 400 })
    }

    await sb
      .from('sorteios')
      .update({ status: 'realizado', realizado_em: new Date().toISOString() })
      .eq('id', sorteioId)

    const { data: todos } = await sb
      .from('sorteios')
      .select('id, status')
      .eq('edicao_id', sorteio.edicao_id)

    const todosCompletos = (todos ?? []).every(
      s => s.id === sorteioId || s.status === 'realizado',
    )

    if (todosCompletos) {
      await sb.from('edicoes').update({ status: 'encerrada' }).eq('id', sorteio.edicao_id)
    }

    logSorteio('sorteio_encerrado', {
      sorteio_id: sorteioId,
      numero: sorteio.numero_sorteio,
      edicao_encerrada: todosCompletos,
      usuario_id: user.id,
    })

    return NextResponse.json({ status: 'realizado', edicao_encerrada: todosCompletos })
  }

  return NextResponse.json({ erro: 'Ação inválida. Use: iniciar | encerrar' }, { status: 400 })
}
