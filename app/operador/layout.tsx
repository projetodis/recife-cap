import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import { LogoutButton } from './LogoutButton'

export default async function OperadorLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('nome, role')
    .eq('id', user.id)
    .single()

  const rolesPermitidos = ['operador_sorteio', 'admin']
  if (!profile || !rolesPermitidos.includes(profile.role)) redirect('/login')

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f8faf8' }}>
      {/* Header simples */}
      <header
        className="flex items-center justify-between px-6 py-3 flex-shrink-0"
        style={{ background: '#1B5E20', borderBottom: '1px solid rgba(255,255,255,0.1)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 relative">
            <Image src="/logo.png" alt="Recife Cap" fill className="object-contain" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none">Recife Cap</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Painel do Operador</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.8)' }}>
            {profile.nome}
          </p>
          <LogoutButton />
        </div>
      </header>

      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}
