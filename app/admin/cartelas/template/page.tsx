import { createClient } from '@/lib/supabase/server'
import TemplateView from './TemplateView'

export default async function TemplatePage({
  searchParams,
}: {
  searchParams: Promise<{ edicao?: string }>
}) {
  const { edicao } = await searchParams
  const supabase = await createClient()

  const { data: edicoes } = await supabase
    .from('edicoes')
    .select('id, numero, status, template_cartela_url, num_bingos, giro_da_sorte_ativo')
    .in('status', ['ativa', 'rascunho'])
    .order('numero', { ascending: false })

  const edicaoId  = edicao ?? edicoes?.[0]?.id
  const edicaoObj = edicoes?.find(e => e.id === edicaoId) ?? edicoes?.[0] ?? null

  return <TemplateView edicao={edicaoObj} edicoes={edicoes ?? []} />
}
