import { createClient as createAdminSupabase } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'distribuidor') return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const { distribuidor_id, edicao_id, codigo_inicio, codigo_fim, motivo } = await request.json()

  const admin = createAdminSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Busca cartelas no intervalo que ainda estão com o distribuidor (não vendidas)
  const { data: cartelas, error } = await admin
    .from('cartelas')
    .select('id, codigo, status')
    .eq('edicao_id', edicao_id)
    .eq('distribuidor_id', distribuidor_id)
    .in('status', ['em_estoque_distribuidor', 'em_estoque_pdv']) // só não vendidas
    .gte('codigo', codigo_inicio)
    .lte('codigo', codigo_fim)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!cartelas || cartelas.length === 0) {
    return NextResponse.json({ error: 'Nenhuma cartela encontrada neste intervalo ou já foram vendidas' }, { status: 400 })
  }

  // Verifica se alguma foi vendida — não pode devolver
  const vendidas = cartelas.filter(c => c.status === 'paga')
  if (vendidas.length > 0) {
    return NextResponse.json({
      error: `${vendidas.length} cartela(s) neste intervalo já foram vendidas e não podem ser devolvidas`
    }, { status: 400 })
  }

  const ids = cartelas.map(c => c.id)

  // Marca como cancelada (devolvida) e remove pdv_id
  const { error: updateError } = await admin
    .from('cartelas')
    .update({ status: 'cancelada', pdv_id: null })
    .in('id', ids)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  // Log
  await admin.from('movimentacoes_estoque').insert(
    ids.map(id => ({
      cartela_id: id,
      de_tipo: 'distribuidor',
      de_id: distribuidor_id,
      para_tipo: 'admin',
      para_id: null,
      observacao: `Devolução: ${codigo_inicio} → ${codigo_fim}. Motivo: ${motivo ?? 'Não informado'}`,
    }))
  )

  return NextResponse.json({ success: true, quantidade: ids.length })
}
