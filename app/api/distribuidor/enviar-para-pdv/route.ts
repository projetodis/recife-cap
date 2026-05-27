import { createClient as createAdminSupabase } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'distribuidor') return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const { pdv_id, edicao_id, quantidade, distribuidor_id } = await request.json()

  const admin = createAdminSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Busca cartelas do distribuidor nesta edição, ainda com ele
  const { data: cartelas, error } = await admin
    .from('cartelas')
    .select('id, codigo')
    .eq('edicao_id', edicao_id)
    .eq('distribuidor_id', distribuidor_id)
    .eq('status', 'em_estoque_distribuidor')
    .order('codigo', { ascending: true })
    .limit(quantidade)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!cartelas || cartelas.length < quantidade) {
    return NextResponse.json({ error: `Apenas ${cartelas?.length ?? 0} cartelas disponíveis no seu estoque` }, { status: 400 })
  }

  const ids = cartelas.map(c => c.id)
  const codigoInicial = cartelas[0].codigo
  const codigoFinal = cartelas[cartelas.length - 1].codigo

  // Atualiza status e pdv_id
  const { error: updateError } = await admin
    .from('cartelas')
    .update({ pdv_id, status: 'em_estoque_pdv' })
    .in('id', ids)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  // Log de movimentação
  await admin.from('movimentacoes_estoque').insert(
    ids.map(id => ({
      cartela_id: id,
      de_tipo: 'distribuidor',
      de_id: distribuidor_id,
      para_tipo: 'pdv',
      para_id: pdv_id,
      observacao: `Envio para PDV: ${codigoInicial} → ${codigoFinal}`,
    }))
  )

  return NextResponse.json({ success: true, quantidade: ids.length, codigo_inicial: codigoInicial, codigo_final: codigoFinal })
}
