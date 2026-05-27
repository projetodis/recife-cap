import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { logPagamento } from '@/lib/logger'

export const dynamic = 'force-dynamic'

function adminSB() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// Acionado pelo botão "Já paguei" na tela do PIX.
// Como o PIX é simulado, confirma imediatamente.
// TODO: Em produção, verificar confirmação com gateway PIX antes de confirmar.
export async function POST(request: Request) {
  let body: { pix_id: string }
  try { body = await request.json() }
  catch { return NextResponse.json({ erro: 'Body inválido' }, { status: 400 }) }

  const { pix_id } = body
  if (!pix_id)
    return NextResponse.json({ erro: 'pix_id obrigatório' }, { status: 400 })

  const sb = adminSB()

  // Marca como paga (idempotente: ignora se já estava paga)
  const { data: atualizadas } = await sb
    .from('cartelas')
    .update({ status: 'paga', reservada_ate: null })
    .eq('pix_id', pix_id)
    .eq('status', 'reservada')
    .select('codigo, dv')

  if (atualizadas?.length) {
    logPagamento('pagamento_confirmado', { pix_id, titulos: atualizadas.map((c: any) => `${c.codigo}-${c.dv}`) })
    return NextResponse.json({
      pago:    true,
      titulos: atualizadas.map((c: any) => `${c.codigo}-${c.dv}`),
    })
  }

  // Já estava paga (clique duplo ou polling encontrou antes)
  const { data: japagas } = await sb
    .from('cartelas')
    .select('codigo, dv')
    .eq('pix_id', pix_id)
    .eq('status', 'paga')

  if (japagas?.length) {
    return NextResponse.json({
      pago:    true,
      titulos: japagas.map((c: any) => `${c.codigo}-${c.dv}`),
    })
  }

  return NextResponse.json(
    { pago: false, erro: 'Reserva não encontrada ou expirada. Tente comprar novamente.' },
    { status: 404 },
  )
}
