import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function publicSB() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

export async function GET(req: NextRequest) {
  const edicao_id = req.nextUrl.searchParams.get('edicao_id')
  if (!edicao_id) return NextResponse.json([], { status: 200 })

  const sb = publicSB()
  const { data } = await sb
    .from('premios_edicao')
    .select('id, ordem, nome, valor, quantidade, foto_url, destaque')
    .eq('edicao_id', edicao_id)
    .eq('ativo', true)
    .order('ordem', { ascending: true })

  return NextResponse.json(data ?? [])
}
