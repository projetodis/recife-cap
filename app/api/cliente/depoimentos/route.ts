import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data } = await supabase
    .from('depoimentos')
    .select('id, nome, cidade, premio, sorteio, depoimento, foto_url')
    .eq('ativo', true)
    .order('ordem', { ascending: true })

  return NextResponse.json(data ?? [])
}
