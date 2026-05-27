import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { log } from '@/lib/logger'

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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await autorizarAdmin()
  if (!admin) return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 })

  const { id } = await params
  const body = await req.json()
  const { acao, role, ativo, nova_senha } = body

  const sb = adminSB()

  if (acao === 'toggle_ativo') {
    await sb.from('usuarios_sistema').update({ ativo }).eq('user_id', id)
    log({ tipo: 'usuario', acao: ativo ? 'usuario_ativado' : 'usuario_desativado', metadata: { user_id: id }, usuario_id: admin.id })
    return NextResponse.json({ ok: true })
  }

  if (acao === 'alterar_role') {
    await sb.from('usuarios_sistema').update({ role }).eq('user_id', id)
    await sb.from('profiles').update({ role }).eq('id', id)
    await sb.auth.admin.updateUserById(id, { user_metadata: { role } })
    log({ tipo: 'usuario', acao: 'role_alterado', metadata: { user_id: id, role }, usuario_id: admin.id })
    return NextResponse.json({ ok: true })
  }

  if (acao === 'resetar_senha') {
    if (!nova_senha) return NextResponse.json({ erro: 'nova_senha obrigatória' }, { status: 400 })
    const { error } = await sb.auth.admin.updateUserById(id, { password: nova_senha })
    if (error) return NextResponse.json({ erro: error.message }, { status: 400 })
    log({ tipo: 'usuario', acao: 'senha_resetada', metadata: { user_id: id }, usuario_id: admin.id })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ erro: 'Ação inválida' }, { status: 400 })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await autorizarAdmin()
  if (!admin) return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 })

  const { id } = await params
  const sb = adminSB()

  await sb.from('usuarios_sistema').delete().eq('user_id', id)
  await sb.from('profiles').delete().eq('id', id)
  await sb.auth.admin.deleteUser(id)

  log({ tipo: 'usuario', acao: 'usuario_excluido', metadata: { user_id: id }, usuario_id: admin.id })
  return NextResponse.json({ ok: true })
}
