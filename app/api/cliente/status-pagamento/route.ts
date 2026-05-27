import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function adminSB() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// Polling a cada 5s na tela do PIX.
// Em produção: verificar com o gateway PIX antes de retornar pago=true.
// Aqui retorna pago=true somente se as cartelas já foram confirmadas via
// POST /api/cliente/confirmar-pagamento.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const pixId = searchParams.get('pix_id')

  if (!pixId)
    return NextResponse.json({ pago: false })

  const sb = adminSB()
  const { data } = await sb
    .from('cartelas')
    .select('codigo, dv, status')
    .eq('pix_id', pixId)

  if (!data?.length) return NextResponse.json({ pago: false })

  const allPaid = data.every((c: any) => c.status === 'paga')
  return NextResponse.json({
    pago:   allPaid,
    titulos: allPaid ? data.map((c: any) => `${c.codigo}-${c.dv}`) : [],
  })
}
