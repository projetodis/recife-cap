import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function adminSB() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'distribuidor')
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  let body: { id: string; status: 'aprovado' | 'rejeitado' }
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }) }

  const { id, status } = body
  if (!id || !['aprovado', 'rejeitado'].includes(status))
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })

  // Verifica que o saque pertence a um PDV deste distribuidor
  const { data: dist } = await supabase
    .from('distribuidores').select('id').eq('user_id', user.id).single()
  if (!dist) return NextResponse.json({ error: 'Distribuidor não encontrado' }, { status: 404 })

  const { data: saque } = await supabase
    .from('saques_pdv')
    .select('id, pdv_id, status')
    .eq('id', id)
    .single()

  if (!saque) return NextResponse.json({ error: 'Saque não encontrado' }, { status: 404 })
  if (saque.status !== 'pendente')
    return NextResponse.json({ error: 'Saque já processado' }, { status: 409 })

  const { data: pdv } = await supabase
    .from('pontos_de_venda')
    .select('id')
    .eq('id', saque.pdv_id)
    .eq('distribuidor_id', dist.id)
    .single()

  if (!pdv) return NextResponse.json({ error: 'PDV não pertence a este distribuidor' }, { status: 403 })

  const admin = adminSB()
  const { error } = await admin
    .from('saques_pdv')
    .update({ status })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
