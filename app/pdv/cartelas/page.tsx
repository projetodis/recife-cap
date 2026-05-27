import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CartelasView from './CartelasView'

export default async function CartelasPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: pdv } = await supabase
    .from('pontos_de_venda')
    .select('id')
    .eq('responsavel_id', user.id)
    .single()

  if (!pdv) redirect('/pdv/dashboard')

  const { data: cartelas } = await supabase
    .from('cartelas')
    .select('id, codigo, status, edicoes(numero, data_sorteio)')
    .eq('pdv_id', pdv.id)
    .order('codigo', { ascending: true })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <CartelasView cartelas={(cartelas ?? []) as any} />
}
