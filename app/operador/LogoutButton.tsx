'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function LogoutButton() {
  const supabase = createClient()
  const router   = useRouter()

  async function sair() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={sair}
      className="text-xs px-3 py-1.5 rounded-lg transition-colors"
      style={{ color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.2)' }}
      onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
    >
      Sair
    </button>
  )
}
