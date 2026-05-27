import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function MotoboyLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'motoboy') redirect('/login')

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {children}
    </div>
  )
}
