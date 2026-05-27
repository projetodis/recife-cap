import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'

export default async function AuthClienteLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('nome, role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'cliente') redirect('/login')

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar role="cliente" nome={profile.nome} />
      <main className="flex-1 lg:ml-52 p-4 lg:p-8 pt-16 lg:pt-8">{children}</main>
    </div>
  )
}
