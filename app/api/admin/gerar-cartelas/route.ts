import { createClient as createAdminSupabase } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function gerarDezenasUnicas(numBingos: number): number[] {
  const totalDezenas = numBingos * 20 // cada bingo: 5 cols × 4 rows
  const pool = Array.from({ length: 60 }, (_, i) => i + 1)
  const sorteadas: number[] = []
  const totalNecessario = Math.min(totalDezenas, 60)
  for (let i = 0; i < totalNecessario; i++) {
    const idx = Math.floor(Math.random() * pool.length)
    sorteadas.push(pool.splice(idx, 1)[0]!)
  }
  // Se numBingos > 3 (> 60 dezenas), reutilizar pool
  while (sorteadas.length < totalDezenas) {
    const pool2 = Array.from({ length: 60 }, (_, i) => i + 1)
    const idx = Math.floor(Math.random() * pool2.length)
    sorteadas.push(pool2.splice(idx, 1)[0]!)
  }
  return sorteadas
}

function gerarSerie(indice: number): string {
  const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const grupo = Math.floor(indice / 999)
  const num   = (indice % 999) + 1
  return `${letras[grupo] ?? 'Z'}${String(num).padStart(3, '0')}`
}

function gerarCodigo(numeroEdicao: number, sequencial: number): string {
  return `${numeroEdicao}${String(sequencial).padStart(6, '0')}`
}

function calcularDV(codigo: string): string {
  const soma = codigo.split('').reduce((acc, d) => acc + parseInt(d), 0)
  return String(soma % 9)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin')
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const { edicao_id, total, numero_edicao, num_bingos = 4, giro_da_sorte_ativo = false } =
    await request.json()

  if (!edicao_id || !total || !numero_edicao)
    return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })

  if (total > 500000)
    return NextResponse.json({ error: 'Máximo 500.000 cartelas por edição' }, { status: 400 })

  const numBingos = Math.min(8, Math.max(4, num_bingos))

  const admin = createAdminSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const LOTE = 500
  let inseridas = 0

  for (let i = 0; i < total; i += LOTE) {
    const loteAtual = Math.min(LOTE, total - i)
    const cartelas  = []

    for (let j = 0; j < loteAtual; j++) {
      const seq    = i + j + 1
      const codigo = gerarCodigo(numero_edicao, seq)
      const dv     = calcularDV(codigo)
      const serie  = gerarSerie(i + j)

      cartelas.push({
        edicao_id,
        codigo,
        dv,
        serie,
        giro_da_sorte:     giro_da_sorte_ativo,
        dezenas_sorteio_1: gerarDezenasUnicas(numBingos), // array flat com todas as dezenas
        status:            'em_estoque_distribuidor',
      })
    }

    const { error } = await admin.from('cartelas').insert(cartelas)
    if (error) {
      return NextResponse.json(
        { error: `Erro ao inserir lote ${i}: ${error.message}` },
        { status: 500 },
      )
    }
    inseridas += loteAtual
  }

  await admin.from('edicoes').update({ status: 'ativa' }).eq('id', edicao_id)

  return NextResponse.json({ success: true, total: inseridas })
}
