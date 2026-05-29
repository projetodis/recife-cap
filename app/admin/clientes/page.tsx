import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ClientesView from './ClientesView'

export default async function ClientesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/admin/dashboard')

  const { data: clientes } = await supabase
    .from('clientes_whitelabel')
    .select('*')
    .order('created_at', { ascending: false })

  const lista = clientes || []
  const total = lista.length
  const ativos = lista.filter(c => c.status === 'ativo').length
  const trial = lista.filter(c => c.status === 'trial').length
  const mrr = lista
    .filter(c => c.status === 'ativo')
    .reduce((acc, c) => acc + Number(c.valor_mensal || 0), 0)

  return <ClientesView clientes={lista} stats={{ total, ativos, trial, mrr }} />
}
