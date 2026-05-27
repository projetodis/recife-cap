import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { rankingProximidade } from '@/lib/sorteio-engine'

function adminSB() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 })

  const { id: sorteioId } = await params
  const sb = adminSB()

  const { data: sorteio } = await sb
    .from('sorteios')
    .select('numero_sorteio')
    .eq('id', sorteioId)
    .single()

  if (!sorteio) return NextResponse.json({ erro: 'Sorteio não encontrado' }, { status: 404 })

  const ranking = await rankingProximidade(sorteioId, sorteio.numero_sorteio)
  return NextResponse.json({ ranking })
}
