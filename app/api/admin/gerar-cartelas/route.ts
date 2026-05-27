import { createClient as createAdminSupabase } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Gera dezenas únicas aleatórias de 01 a 60 (estilo Recife Cap)
function gerarDezenas(quantidade: number): string[] {
  const pool = Array.from({ length: 60 }, (_, i) => String(i + 1).padStart(2, '0'))
  const embaralhado = pool.sort(() => Math.random() - 0.5)
  return embaralhado.slice(0, quantidade).sort((a, b) => parseInt(a) - parseInt(b))
}

// Gera código único da cartela: prefixo da edição + sequencial
function gerarCodigo(numeroEdicao: number, sequencial: number): string {
  return `${numeroEdicao}${String(sequencial).padStart(6, '0')}`
}

// Calcula dígito verificador simples (soma dos dígitos mod 9)
function calcularDV(codigo: string): string {
  const soma = codigo.split('').reduce((acc, d) => acc + parseInt(d), 0)
  return String(soma % 9)
}

export async function POST(request: Request) {
  // Verifica se é admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const { edicao_id, total, numero_edicao } = await request.json()

  if (!edicao_id || !total || !numero_edicao) {
    return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
  }

  if (total > 500000) {
    return NextResponse.json({ error: 'Máximo 500.000 cartelas por edição' }, { status: 400 })
  }

  const admin = createAdminSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Gera em lotes de 500 para não estourar memória
  const LOTE = 500
  let inseridas = 0

  for (let i = 0; i < total; i += LOTE) {
    const loteAtual = Math.min(LOTE, total - i)
    const cartelas = []

    for (let j = 0; j < loteAtual; j++) {
      const seq = i + j + 1
      const codigo = gerarCodigo(numero_edicao, seq)
      const dv = calcularDV(codigo)

      // Cada cartela tem 2 grupos de dezenas (como Recife Cap real)
      const dezenas1 = gerarDezenas(10)  // 10 dezenas para o 1º grupo de sorteios
      const dezenas2 = gerarDezenas(10)  // 10 dezenas para o 2º grupo

      cartelas.push({
        edicao_id,
        codigo,
        dv,
        dezenas_sorteio_1: dezenas1,
        dezenas_sorteio_2: dezenas2,
        status: 'em_estoque_distribuidor',
      })
    }

    const { error } = await admin.from('cartelas').insert(cartelas)
    if (error) {
      return NextResponse.json({ error: `Erro ao inserir lote ${i}: ${error.message}` }, { status: 500 })
    }
    inseridas += loteAtual
  }

  // Ativa a edição após gerar cartelas
  await admin.from('edicoes').update({ status: 'ativa' }).eq('id', edicao_id)

  return NextResponse.json({ success: true, total: inseridas })
}
