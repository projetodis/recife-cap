'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Trash2 } from 'lucide-react'

export default function ExcluirEdicaoBtn({ edicaoId }: { edicaoId: string }) {
  const [confirmando, setConfirmando] = useState(false)
  const [loading, setLoading]         = useState(false)
  const router   = useRouter()
  const supabase = createClient()

  async function excluir() {
    setLoading(true)
    const { error } = await supabase
      .from('edicoes')
      .delete()
      .eq('id', edicaoId)
      .eq('status', 'rascunho')

    if (!error) {
      router.push('/admin/edicoes')
    } else {
      alert('Erro ao excluir: ' + error.message)
      setLoading(false)
    }
  }

  if (confirmando) {
    return (
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-red-600 font-medium">Tem certeza?</span>
        <button
          onClick={() => setConfirmando(false)}
          className="px-3 py-1.5 rounded-lg text-xs font-bold border text-gray-600 hover:bg-gray-50">
          Cancelar
        </button>
        <button
          onClick={excluir}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50">
          {loading ? 'Excluindo...' : 'Confirmar exclusão'}
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirmando(true)}
      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition-all shrink-0">
      <Trash2 size={14} />
      Excluir edição
    </button>
  )
}
