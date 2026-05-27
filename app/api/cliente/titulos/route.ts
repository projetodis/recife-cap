import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function adminSB() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const cpfRaw = searchParams.get('cpf') ?? ''
  const cpf    = cpfRaw.replace(/\D/g, '')

  if (cpf.length !== 11)
    return NextResponse.json({ erro: 'CPF inválido' }, { status: 400 })

  const sb = adminSB()

  const { data, error } = await sb
    .from('cartelas')
    .select(`
      id, codigo, dv, status,
      dezenas_sorteio_1, dezenas_sorteio_2,
      pix_id, reservada_ate,
      edicao:edicoes(id, numero, data_sorteio, hora_sorteio, premio_principal, valor_unitario)
    `)
    .eq('cpf_comprador', cpf)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[titulos]', error)
    return NextResponse.json({ erro: 'Erro ao buscar títulos' }, { status: 500 })
  }

  const titulos = (data ?? []).map((c: any) => {
    const edicao = Array.isArray(c.edicao) ? c.edicao[0] : c.edicao
    return {
      id:         c.id,
      numero:     `${c.codigo}-${c.dv}`,
      status:     c.status,
      pix_id:     c.pix_id,
      reservada_ate: c.reservada_ate,
      dezenas_s1: (c.dezenas_sorteio_1 ?? []).slice(0, 25).map(Number),
      dezenas_s2: (c.dezenas_sorteio_1 ?? []).slice(25, 50).map(Number),
      dezenas_s3: (c.dezenas_sorteio_2 ?? []).slice(0, 25).map(Number),
      dezenas_s4: (c.dezenas_sorteio_2 ?? []).slice(25, 50).map(Number),
      edicao: edicao ? {
        id:               edicao.id,
        numero:           edicao.numero,
        data_sorteio:     edicao.data_sorteio,
        hora_sorteio:     edicao.hora_sorteio,
        premio_principal: edicao.premio_principal,
        valor_unitario:   edicao.valor_unitario,
      } : null,
    }
  })

  return NextResponse.json({ titulos })
}
