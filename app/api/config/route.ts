import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  const { data } = await sb.from('configuracoes').select('chave, valor')
  const configs: Record<string, string> = {}
  for (const row of data ?? []) configs[row.chave] = row.valor ?? ''

  return NextResponse.json(configs, {
    headers: { 'Cache-Control': 'public, max-age=5, stale-while-revalidate=10' },
  })
}
