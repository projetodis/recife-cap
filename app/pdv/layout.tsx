import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'

export default async function PDVLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('nome, role')
    .eq('id', user.id)
    .single()

  console.log('PDV Layout - user.id:', user.id)
  console.log('PDV Layout - profile:', profile)
  console.log('PDV Layout - profileError:', profileError)

  if (profileError || !profile) {
    console.log('PDV Layout - sem profile, redirecionando')
    redirect('/login')
  }

  if (profile.role !== 'pdv') {
    console.log('PDV Layout - role incorreto:', profile.role)
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar role="pdv" nome={profile.nome} />
      <main className="flex-1 lg:ml-52 p-4 lg:p-8 pt-16 lg:pt-8">{children}</main>
    </div>
  )
}
