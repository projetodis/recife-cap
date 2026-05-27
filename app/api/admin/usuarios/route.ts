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
  const { data: profile } = await supabase.from('profiles').select('role, nome').eq('id', user.id).single()
  return profile?.role === 'admin' ? { user, profile } : null
}

export async function GET() {
  if (!await autorizarAdmin()) {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 })
  }
  const sb = adminSB()
  const { data, error } = await sb
    .from('usuarios_sistema')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const auth = await autorizarAdmin()
  if (!auth) return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 })

  const body = await req.json()
  const { nome, email, role, senha, enviar_email } = body

  if (!nome || !email || !role || !senha) {
    return NextResponse.json({ erro: 'Campos obrigatórios: nome, email, role, senha' }, { status: 400 })
  }

  const sb = adminSB()

  // Cria usuário no Supabase Auth
  const { data: authData, error: authError } = await sb.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome, role },
  })
  if (authError) return NextResponse.json({ erro: authError.message }, { status: 400 })

  const userId = authData.user.id

  // Insere no profiles
  await sb.from('profiles').insert({
    id: userId,
    nome,
    role,
    status_pix: 'pendente',
  })

  // Insere na tabela usuarios_sistema
  const { error: sysError } = await sb.from('usuarios_sistema').insert({
    user_id: userId,
    nome,
    email,
    role,
    criado_por: auth.user.id,
  })
  if (sysError) {
    // Rollback: deleta o auth user criado
    await sb.auth.admin.deleteUser(userId)
    return NextResponse.json({ erro: sysError.message }, { status: 500 })
  }

  log({
    tipo: 'usuario',
    acao: 'usuario_criado',
    descricao: `Usuário ${email} criado com role ${role}`,
    usuario_id: auth.user.id,
    metadata: { email, role, enviar_email },
  })

  return NextResponse.json({ ok: true, user_id: userId })
}
