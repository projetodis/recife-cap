import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CartelasAdminWrapper from './CartelasAdminWrapper'

export default async function CartelasAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ edicao?: string }>
}) {
  const { edicao: edicaoId } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/login')

  // Edições ativas — campos completos para o GeradorPDF
  const { data: edicoes } = await supabase
    .from('edicoes')
    .select('id, numero, status, total_cartelas, data_sorteio, hora_sorteio, valor_unitario, premio_principal, template_cartela_url')
    .in('status', ['ativa', 'rascunho'])
    .order('numero', { ascending: false })

  const edicaoSelecionada = edicaoId ?? edicoes?.[0]?.id
  const edicaoObj = edicoes?.find(e => e.id === edicaoSelecionada) ?? null

  // Resumo de cartelas da edição selecionada
  let resumo = null
  if (edicaoSelecionada) {
    const { data } = await supabase
      .from('cartelas')
      .select('status, distribuidor_id')
      .eq('edicao_id', edicaoSelecionada)

    if (data) {
      resumo = {
        total:       data.length,
        em_estoque:  data.filter(c => c.status === 'em_estoque_distribuidor').length,
        distribuidas: data.filter(c => c.distribuidor_id && c.status !== 'em_estoque_distribuidor').length,
        vendidas:    data.filter(c => c.status === 'paga').length,
      }
    }
  }

  // Distribuidores ativos
  const { data: distribuidoresRaw } = await supabase
    .from('distribuidores')
    .select('id, nivel, comissao_pct, profiles(nome)')
    .eq('status', 'ativo')

  const distribuidores = (distribuidoresRaw ?? []).map((d: any) => ({
    id:           d.id,
    nivel:        d.nivel,
    comissao_pct: d.comissao_pct,
    profiles:     Array.isArray(d.profiles) ? (d.profiles[0] ?? null) : (d.profiles ?? null),
  }))

  // Estoque por distribuidor
  const estoqueQuery = edicaoSelecionada
    ? await supabase
        .from('cartelas')
        .select('distribuidor_id')
        .eq('edicao_id', edicaoSelecionada)
        .not('distribuidor_id', 'is', null)
    : { data: [] }

  const contPorDist: Record<string, number> = {}
  estoqueQuery.data?.forEach((c: any) => {
    if (c.distribuidor_id) contPorDist[c.distribuidor_id] = (contPorDist[c.distribuidor_id] ?? 0) + 1
  })

  // Cartelas para geração de PDF (em estoque, até 1000)
  const { data: cartelasParaPDF } = edicaoSelecionada
    ? await supabase
        .from('cartelas')
        .select('id, codigo, dv, dezenas_sorteio_1, dezenas_sorteio_2')
        .eq('edicao_id', edicaoSelecionada)
        .eq('status', 'em_estoque_distribuidor')
        .limit(1000)
    : { data: [] }

  return (
    <CartelasAdminWrapper
      edicoes={edicoes ?? []}
      edicaoSelecionada={edicaoSelecionada}
      resumo={resumo}
      distribuidores={distribuidores ?? []}
      contPorDist={contPorDist}
      cartelasParaPDF={cartelasParaPDF ?? []}
      edicaoObj={edicaoObj}
    />
  )
}
