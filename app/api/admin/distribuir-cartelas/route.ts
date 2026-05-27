import { createClient as createAdminSupabase } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const { edicao_id, distribuidor_id, quantidade } = await request.json()

  const admin = createAdminSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Busca cartelas disponíveis ordenadas pelo código (intervalo sequencial)
  const { data: cartelas, error } = await admin
    .from('cartelas')
    .select('id, codigo')
    .eq('edicao_id', edicao_id)
    .eq('status', 'em_estoque_distribuidor')
    .is('distribuidor_id', null)
    .order('codigo', { ascending: true })
    .limit(quantidade)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!cartelas || cartelas.length < quantidade) {
    return NextResponse.json({ error: `Apenas ${cartelas?.length ?? 0} cartelas disponíveis` }, { status: 400 })
  }

  const ids = cartelas.map(c => c.id)
  const codigoInicial = cartelas[0].codigo
  const codigoFinal = cartelas[cartelas.length - 1].codigo

  // Atribui ao distribuidor
  const { error: updateError } = await admin
    .from('cartelas')
    .update({ distribuidor_id })
    .in('id', ids)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  // Registra movimentação com intervalo
  const movs = ids.map(id => ({
    cartela_id: id,
    de_tipo: 'admin',
    de_id: null,
    para_tipo: 'distribuidor',
    para_id: distribuidor_id,
    observacao: `Lote: ${codigoInicial} até ${codigoFinal}`,
  }))

  await admin.from('movimentacoes_estoque').insert(movs)

  return NextResponse.json({
    success: true,
    quantidade: ids.length,
    codigo_inicial: codigoInicial,
    codigo_final: codigoFinal,
  })
}
