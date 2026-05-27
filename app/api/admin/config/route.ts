import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

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

// PATCH /api/admin/config — atualiza uma ou várias chaves
export async function PATCH(req: NextRequest) {
  if (!await autorizarAdmin()) {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 })
  }

  const body: { chave: string; valor: string }[] = await req.json()
  if (!Array.isArray(body)) {
    return NextResponse.json({ erro: 'Body deve ser array de {chave, valor}' }, { status: 400 })
  }

  const sb = adminSB()
  const erros: string[] = []

  for (const { chave, valor } of body) {
    const { error } = await sb
      .from('configuracoes')
      .upsert({ chave, valor, updated_at: new Date().toISOString() }, { onConflict: 'chave' })
    if (error) erros.push(`${chave}: ${error.message}`)
  }

  if (erros.length) return NextResponse.json({ erros }, { status: 500 })

  revalidatePath('/cliente', 'layout')
  revalidatePath('/cliente/sorteio')
  revalidatePath('/cliente/compra')

  return NextResponse.json({ ok: true, atualizadas: body.length })
}
