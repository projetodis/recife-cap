import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'

export default async function DistribuidorLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('nome, role').eq('id', user.id).single()
  if (profile?.role !== 'distribuidor') redirect('/login')

  const { data: dist } = await supabase
    .from('distribuidores').select('nivel').eq('user_id', user.id).single()

  return (
    <div className="flex min-h-screen" style={{ background: '#F5F7FA' }}>
      <Sidebar role="distribuidor" nome={profile!.nome} nivel={dist?.nivel} />
      <main className="flex-1 lg:ml-52 p-4 lg:p-8 pt-16 lg:pt-8">
        {children}
      </main>
    </div>
  )
}
