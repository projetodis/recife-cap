import { createClient as createAdminSupabase } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'distribuidor') return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const { data: dist } = await supabase.from('distribuidores').select('id').eq('user_id', user.id).single()
  if (!dist) return NextResponse.json({ error: 'Distribuidor não encontrado' }, { status: 404 })

  const body = await request.json()
  const { nome, email, senha, telefone, veiculo, placa } = body

  const admin = createAdminSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Cria usuário com role motoboy
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email, password: senha, email_confirm: true,
    user_metadata: { role: 'motoboy', nome, telefone },
  })

  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

  const userId = authData.user.id

  // Atualiza profile
  await admin.from('profiles').update({ role: 'motoboy', nome, telefone }).eq('id', userId)

  // Cria registro de motoboy
  const { error: motoboyError } = await admin.from('motoboys').insert({
    user_id: userId,
    distribuidor_id: dist.id,
    nome, telefone, veiculo, placa,
  })

  if (motoboyError) return NextResponse.json({ error: motoboyError.message }, { status: 400 })

  return NextResponse.json({ success: true })
}
