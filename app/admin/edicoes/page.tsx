import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function EdicoesPage() {
  const supabase = await createClient()

  const { data: edicoes } = await supabase
    .from('edicoes')
    .select('*')
    .order('numero', { ascending: false })

  const statusColor: Record<string, string> = {
    rascunho:   'bg-gray-100 text-gray-500',
    ativa:      'bg-emerald-50 text-emerald-700',
    em_sorteio: 'bg-blue-50 text-blue-700',
    encerrada:  'bg-gray-100 text-gray-400',
  }
  const statusLabel: Record<string, string> = {
    rascunho:   'Rascunho',
    ativa:      'Ativa',
    em_sorteio: 'Em sorteio',
    encerrada:  'Encerrada',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Edições</h1>
          <p className="text-sm text-gray-500 mt-1">{edicoes?.length ?? 0} edições cadastradas</p>
        </div>
        <Link href="/admin/edicoes/nova"
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition">
          + Nova edição
        </Link>
      </div>

      {edicoes && edicoes.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left text-xs text-gray-400 font-medium px-6 py-3">Edição</th>
                <th className="text-left text-xs text-gray-400 font-medium px-6 py-3">Data sorteio</th>
                <th className="text-left text-xs text-gray-400 font-medium px-6 py-3">Valor</th>
                <th className="text-left text-xs text-gray-400 font-medium px-6 py-3">Total cartelas</th>
                <th className="text-left text-xs text-gray-400 font-medium px-6 py-3">Prêmio</th>
                <th className="text-left text-xs text-gray-400 font-medium px-6 py-3">Status</th>
                <th className="text-left text-xs text-gray-400 font-medium px-6 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {edicoes.map((e: any) => (
                <tr key={e.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition">
                  <td className="px-6 py-4 font-medium text-gray-900">Nº {e.numero}</td>
                  <td className="px-6 py-4 text-gray-600">
                    {new Date(e.data_sorteio).toLocaleDateString('pt-BR')} às {e.hora_sorteio}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {Number(e.valor_unitario).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td className="px-6 py-4 text-gray-600">{e.total_cartelas.toLocaleString('pt-BR')}</td>
                  <td className="px-6 py-4 text-emerald-600 font-medium">
                    {Number(e.premio_principal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor[e.status]}`}>
                      {statusLabel[e.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-3 text-xs">
                      <Link href={`/admin/cartelas?edicao=${e.id}`}
                        className="text-emerald-600 hover:text-emerald-700 font-medium">
                        Cartelas
                      </Link>
                      <Link href={`/admin/edicoes/${e.id}`}
                        className="text-gray-500 hover:text-gray-700 font-medium">
                        Detalhes
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
          <p className="text-gray-400 text-sm mb-4">Nenhuma edição cadastrada ainda.</p>
          <Link href="/admin/edicoes/nova"
            className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition">
            Criar primeira edição
          </Link>
        </div>
      )}
    </div>
  )
}
