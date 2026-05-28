import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import EditarPDVForm from './EditarPDVForm'

export default async function EditarPDVPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: pdv } = await supabase
    .from('pontos_de_venda')
    .select('*')
    .eq('id', id)
    .single()

  if (!pdv) redirect('/admin/pdvs')

  return (
    <div className="max-w-2xl space-y-6 pb-16">
      <div className="flex items-center gap-4">
        <Link href="/admin/pdvs"
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft size={16} /> Voltar
        </Link>
        <div>
          <h1 className="text-2xl font-black text-gray-900">Editar PDV</h1>
          <p className="text-sm text-gray-500">{pdv.nome}</p>
        </div>
      </div>
      <EditarPDVForm pdv={pdv} />
    </div>
  )
}
