import { createClient } from '@supabase/supabase-js'

function adminSB() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export interface GanhadorDetectado {
  cartela_id: string
  numero: string
  nome_comprador: string
  cpf_mascarado: string
  sorteio_numero: number
  valor_premio: number
}

export interface ProximidadeItem {
  cartela_numero: string
  nome_comprador: string
  cpf_mascarado: string
  acertos: number
  faltando: number
}

function maskCPF(cpf: string): string {
  const d = (cpf ?? '').replace(/\D/g, '')
  if (d.length !== 11) return '***.***.***-**'
  return `${d.slice(0, 3)}.***.***-${d.slice(9)}`
}

function dezenasDoSorteio(cartela: Record<string, unknown>, sorteioNumero: number): number[] {
  // S1: dezenas_sorteio_1[0..24], S2: [25..49], S3: dezenas_sorteio_2[0..24], S4: [25..49]
  if (sorteioNumero === 1) return ((cartela.dezenas_sorteio_1 as unknown[]) ?? []).slice(0, 25).map(Number)
  if (sorteioNumero === 2) return ((cartela.dezenas_sorteio_1 as unknown[]) ?? []).slice(25, 50).map(Number)
  if (sorteioNumero === 3) return ((cartela.dezenas_sorteio_2 as unknown[]) ?? []).slice(0, 25).map(Number)
  if (sorteioNumero === 4) return ((cartela.dezenas_sorteio_2 as unknown[]) ?? []).slice(25, 50).map(Number)
  return []
}

export async function verificarGanhadores(
  sorteioId: string,
  sorteioNumero: number,
): Promise<{ ganhadores: GanhadorDetectado[]; ranking: ProximidadeItem[] }> {
  const sb = adminSB()

  const { data: sorteio } = await sb
    .from('sorteios')
    .select('id, edicao_id, numero_sorteio, dezenas_sorteadas, valor_premio, cartela_vencedora')
    .eq('id', sorteioId)
    .single()

  if (!sorteio) return { ganhadores: [], ranking: [] }

  const dezenasSorteadas = new Set((sorteio.dezenas_sorteadas ?? []).map(Number))

  const { data: cartelas } = await sb
    .from('cartelas')
    .select('id, codigo, dv, cpf_comprador, nome_comprador, dezenas_sorteio_1, dezenas_sorteio_2')
    .eq('edicao_id', sorteio.edicao_id)
    .eq('status', 'paga')

  if (!cartelas?.length) return { ganhadores: [], ranking: [] }

  const ganhadores: GanhadorDetectado[] = []
  const ranking: ProximidadeItem[] = []

  for (const cartela of cartelas) {
    const dezenas = dezenasDoSorteio(cartela as Record<string, unknown>, sorteioNumero)
    if (!dezenas.length) continue

    const acertos = dezenas.filter(d => dezenasSorteadas.has(d)).length
    const faltando = dezenas.length - acertos

    ranking.push({
      cartela_numero: `${cartela.codigo}-${cartela.dv}`,
      nome_comprador: (cartela.nome_comprador as string) ?? 'Desconhecido',
      cpf_mascarado: maskCPF((cartela.cpf_comprador as string) ?? ''),
      acertos,
      faltando,
    })

    if (faltando === 0) {
      ganhadores.push({
        cartela_id: cartela.id as string,
        numero: `${cartela.codigo}-${cartela.dv}`,
        nome_comprador: (cartela.nome_comprador as string) ?? 'Desconhecido',
        cpf_mascarado: maskCPF((cartela.cpf_comprador as string) ?? ''),
        sorteio_numero: sorteioNumero,
        valor_premio: parseFloat(String(sorteio.valor_premio ?? 0)),
      })
    }
  }

  ranking.sort((a, b) => a.faltando - b.faltando || b.acertos - a.acertos)

  return { ganhadores, ranking }
}

export async function rankingProximidade(
  sorteioId: string,
  sorteioNumero: number,
): Promise<ProximidadeItem[]> {
  const { ranking } = await verificarGanhadores(sorteioId, sorteioNumero)
  return ranking
}
