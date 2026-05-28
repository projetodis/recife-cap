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

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'pdv')
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  let body: { pdv_id: string; valor: number; chave_pix: string }
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }) }

  const { pdv_id, valor, chave_pix } = body
  if (!pdv_id || !valor || valor <= 0)
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  if (!chave_pix?.trim())
    return NextResponse.json({ error: 'Chave PIX obrigatória' }, { status: 400 })

  // Confirma que o PDV pertence ao responsável autenticado
  const { data: pdv } = await supabase
    .from('pontos_de_venda')
    .select('id, responsavel_id')
    .eq('id', pdv_id)
    .eq('responsavel_id', user.id)
    .single()

  if (!pdv) return NextResponse.json({ error: 'PDV não encontrado' }, { status: 404 })

  const admin = adminSB()
  const { error } = await admin.from('saques_pdv').insert({
    pdv_id,
    responsavel_id: user.id,
    valor,
    chave_pix: chave_pix.trim(),
    status: 'pendente',
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
