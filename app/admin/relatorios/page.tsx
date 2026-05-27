import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RelatoriosClient from './RelatoriosClient'

export default async function RelatoriosPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/login')

  return <RelatoriosClient />
}
