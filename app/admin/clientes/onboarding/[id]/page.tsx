import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import OnboardingView from './OnboardingView'

export default async function OnboardingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/admin/dashboard')

  const { data: cliente } = await supabase
    .from('clientes_whitelabel').select('*').eq('id', id).single()
  if (!cliente) redirect('/admin/clientes')

  return <OnboardingView cliente={cliente} />
}
