import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const edicao_id = req.nextUrl.searchParams.get('edicao_id')

  let idFinal = edicao_id
  if (!idFinal) {
    const { data: edicao } = await supabase
      .from('edicoes')
      .select('id')
      .in('status', ['ativa', 'em_sorteio'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    idFinal = edicao?.id ?? null
  }

  if (!idFinal) return NextResponse.json([])

  const { data } = await supabase
    .from('premios_edicao')
    .select('id, ordem, nome, valor, quantidade, foto_url, destaque')
    .eq('edicao_id', idFinal)
    .eq('ativo', true)
    .order('ordem', { ascending: true })

  return NextResponse.json(data ?? [])
}
