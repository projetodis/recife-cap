import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Cliente com service role para operações admin
function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(request: Request) {
  // Verifica se quem está chamando é admin
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const body = await request.json()
  const { email, senha, role, nome, cpf, telefone, chave_pix, nivel, comissao_pct, meta_mensal } = body

  const adminClient = createAdminClient()

  // Cria o usuário no Auth
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { role, nome, telefone },
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  const userId = authData.user.id

  // Atualiza o profile com dados completos
  const { error: profileError } = await adminClient
    .from('profiles')
    .update({ role, nome, cpf, telefone, chave_pix })
    .eq('id', userId)

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 })
  }

  // Se for distribuidor, cria o registro na tabela distribuidores
  if (role === 'distribuidor') {
    const { error: distError } = await adminClient
      .from('distribuidores')
      .insert({ user_id: userId, nivel: nivel ?? 1, comissao_pct: comissao_pct ?? 15, meta_mensal })

    if (distError) {
      return NextResponse.json({ error: distError.message }, { status: 400 })
    }
  }

  return NextResponse.json({ success: true, userId })
}
