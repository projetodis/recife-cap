import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function DistribuidoresPage() {
  const supabase = await createClient()

  const { data: distribuidores } = await supabase
    .from('distribuidores')
    .select(`
      *,
      profiles (nome, cpf, telefone, chave_pix, status_pix)
    `)
    .order('created_at', { ascending: false })

  const statusColor: Record<string, string> = {
    ativo:     'bg-emerald-50 text-emerald-700',
    bloqueado: 'bg-red-50 text-red-700',
    inativo:   'bg-gray-100 text-gray-500',
  }

  const pixColor: Record<string, string> = {
    validado:             'bg-emerald-50 text-emerald-700',
    aguardando_validacao: 'bg-amber-50 text-amber-700',
    pendente:             'bg-gray-100 text-gray-500',
    rejeitado:            'bg-red-50 text-red-700',
  }

  const pixLabel: Record<string, string> = {
    validado:             'PIX validado',
    aguardando_validacao: 'Aguardando validação',
    pendente:             'PIX pendente',
    rejeitado:            'PIX rejeitado',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Distribuidores</h1>
          <p className="text-sm text-gray-500 mt-1">{distribuidores?.length ?? 0} cadastrados</p>
        </div>
        <Link
          href="/admin/distribuidores/novo"
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition"
        >
          + Cadastrar distribuidor
        </Link>
      </div>

      {distribuidores && distribuidores.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left text-xs text-gray-400 font-medium px-6 py-3">Nome</th>
                <th className="text-left text-xs text-gray-400 font-medium px-6 py-3">CPF</th>
                <th className="text-left text-xs text-gray-400 font-medium px-6 py-3">Telefone</th>
                <th className="text-left text-xs text-gray-400 font-medium px-6 py-3">Nível</th>
                <th className="text-left text-xs text-gray-400 font-medium px-6 py-3">Comissão</th>
                <th className="text-left text-xs text-gray-400 font-medium px-6 py-3">PIX</th>
                <th className="text-left text-xs text-gray-400 font-medium px-6 py-3">Status</th>
                <th className="text-left text-xs text-gray-400 font-medium px-6 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {distribuidores.map((d: any) => (
                <tr key={d.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition">
                  <td className="px-6 py-4 font-medium text-gray-900">{d.profiles?.nome}</td>
                  <td className="px-6 py-4 text-gray-600">{d.profiles?.cpf ?? '—'}</td>
                  <td className="px-6 py-4 text-gray-600">{d.profiles?.telefone ?? '—'}</td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                      nv:{d.nivel}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{d.comissao_pct}%</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${pixColor[d.profiles?.status_pix ?? 'pendente']}`}>
                      {pixLabel[d.profiles?.status_pix ?? 'pendente']}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor[d.status]}`}>
                      {d.status.charAt(0).toUpperCase() + d.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-3">
                      <Link href={`/admin/distribuidores/${d.id}`} className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">
                        Ver detalhes
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <p className="text-gray-400 text-sm mb-4">Nenhum distribuidor cadastrado ainda.</p>
          <Link
            href="/admin/distribuidores/novo"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition"
          >
            Cadastrar primeiro distribuidor
          </Link>
        </div>
      )}
    </div>
  )
}
