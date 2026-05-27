import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// Redireciona automaticamente para o sorteio da edição ativa
export default async function OperadorSorteioPage() {
  const supabase = await createClient()

  const { data: edicaoAtiva } = await supabase
    .from('edicoes')
    .select('id')
    .in('status', ['em_sorteio', 'ativa'])
    .order('data_sorteio', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (edicaoAtiva?.id) {
    redirect(`/admin/sorteios/${edicaoAtiva.id}`)
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <p className="text-5xl mb-4">🎱</p>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Nenhum sorteio ativo</h2>
        <p className="text-gray-500 text-sm">Aguarde o administrador iniciar um sorteio.</p>
      </div>
    </div>
  )
}
