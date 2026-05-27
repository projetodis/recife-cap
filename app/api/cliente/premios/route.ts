import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function GET(req: NextRequest) {
  const edicao_id = req.nextUrl.searchParams.get('edicao_id')

  console.log('Buscando prêmios para edicao_id:', edicao_id)

  const supabase = sb()
  let resolvedId = edicao_id

  if (!resolvedId) {
    // Fallback: pega a edição ativa automaticamente
    const { data: edicao } = await supabase
      .from('edicoes')
      .select('id')
      .in('status', ['ativa', 'em_sorteio'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    console.log('Edição ativa encontrada:', edicao)
    if (!edicao) return NextResponse.json([])
    resolvedId = edicao.id
  }

  const { data, error } = await supabase
    .from('premios_edicao')
    .select('id, ordem, nome, valor, quantidade, foto_url, destaque, ativo')
    .eq('edicao_id', resolvedId)
    .eq('ativo', true)
    .order('ordem', { ascending: true })

  console.log('Prêmios encontrados:', data?.length ?? 0, 'Erro:', error?.message ?? null)

  return NextResponse.json(data ?? [])
}
