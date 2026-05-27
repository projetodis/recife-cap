import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const ROLES_PERMITIDOS = ['admin', 'operador_sorteio']

function adminSB() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

async function autorizar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return profile?.role && ROLES_PERMITIDOS.includes(profile.role) ? user : null
}

export async function GET(req: NextRequest) {
  const edicao_id = req.nextUrl.searchParams.get('edicao_id')
  if (!edicao_id) return NextResponse.json({ error: 'edicao_id obrigatório' }, { status: 400 })

  if (!await autorizar()) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const sb = adminSB()
  const { data, error } = await sb
    .from('premios_edicao')
    .select('*')
    .eq('edicao_id', edicao_id)
    .order('ordem', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  if (!await autorizar()) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const body = await req.json()
  const sb = adminSB()
  const { data, error } = await sb
    .from('premios_edicao')
    .insert(body)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  if (!await autorizar()) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const { id, ...updates } = await req.json()
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

  const sb = adminSB()
  const { data, error } = await sb
    .from('premios_edicao')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  if (!await autorizar()) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

  const sb = adminSB()
  const { error } = await sb.from('premios_edicao').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
