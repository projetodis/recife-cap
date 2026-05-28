import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, DollarSign, Ticket, Trophy, Trash2 } from 'lucide-react'
import ExcluirEdicaoBtn from './ExcluirEdicaoBtn'

export default async function DetalhesEdicaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: edicao } = await supabase
    .from('edicoes')
    .select('*')
    .eq('id', id)
    .single()

  if (!edicao) redirect('/admin/edicoes')

  const [
    { data: premios },
    { data: sorteios },
    { count: totalCartelas },
    { count: cartelasVendidas },
  ] = await Promise.all([
    supabase
      .from('premios_edicao')
      .select('*')
      .eq('edicao_id', id)
      .order('ordem'),

    supabase
      .from('sorteios')
      .select('id, numero_sorteio, status, realizado_em, premio_id')
      .eq('edicao_id', id)
      .order('numero_sorteio'),

    supabase
      .from('cartelas')
      .select('id', { count: 'exact', head: true })
      .eq('edicao_id', id),

    supabase
      .from('cartelas')
      .select('id', { count: 'exact', head: true })
      .eq('edicao_id', id)
      .eq('status', 'paga'),
  ])

  // Mapa premio_id → nome para os sorteios
  const premioNomeMap: Record<string, string> = {}
  for (const p of premios ?? []) premioNomeMap[p.id] = p.nome

  const statusColors: Record<string, { bg: string; color: string; label: string }> = {
    rascunho:   { bg: '#F5F5F5', color: '#9E9E9E', label: 'Rascunho' },
    ativa:      { bg: '#E8F5E9', color: '#2E7D32', label: 'Ativa' },
    em_sorteio: { bg: '#FFF8E1', color: '#F59E0B', label: 'Em sorteio' },
    encerrada:  { bg: '#FFEBEE', color: '#C62828', label: 'Encerrada' },
  }
  const sc = statusColors[edicao.status] ?? statusColors.rascunho

  return (
    <div className="max-w-4xl space-y-6 pb-16">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin/edicoes"
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft size={16} /> Voltar
          </Link>
          <div>
            <h1 className="text-2xl font-black text-gray-900">Edição Nº {edicao.numero}</h1>
            {edicao.descricao && <p className="text-sm text-gray-500">{edicao.descricao}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="px-3 py-1 rounded-full text-xs font-bold"
            style={{ background: sc.bg, color: sc.color }}>
            {sc.label}
          </span>
          <Link href={`/admin/edicoes/${id}/premios`}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white"
            style={{ background: '#2E7D32' }}>
            <Trophy size={14} /> Prêmios
          </Link>
          <Link href={`/admin/cartelas?edicao=${id}`}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border"
            style={{ borderColor: '#2E7D32', color: '#2E7D32' }}>
            <Ticket size={14} /> Cartelas
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Data do sorteio', valor: new Date(edicao.data_sorteio + 'T12:00:00').toLocaleDateString('pt-BR'), icon: Calendar },
          { label: 'Valor do título', valor: `R$ ${Number(edicao.valor_unitario).toFixed(2)}`, icon: DollarSign },
          { label: 'Total cartelas', valor: (totalCartelas ?? 0).toLocaleString('pt-BR'), icon: Ticket },
          { label: 'Vendidas', valor: (cartelasVendidas ?? 0).toLocaleString('pt-BR'), icon: Trophy },
        ].map(({ label, valor, icon: Icon }) => (
          <div key={label} className="bg-white rounded-2xl border p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Icon size={16} style={{ color: '#2E7D32' }} />
              <span className="text-xs text-gray-500 uppercase tracking-wider">{label}</span>
            </div>
            <p className="font-black text-xl text-gray-900">{valor}</p>
          </div>
        ))}
      </div>

      {/* Prêmios */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between"
          style={{ background: 'rgba(46,125,50,0.04)' }}>
          <h2 className="font-bold text-gray-700 flex items-center gap-2">
            <Trophy size={16} style={{ color: '#2E7D32' }} />
            Prêmios da Edição
          </h2>
          <Link href={`/admin/edicoes/${id}/premios`}
            className="text-xs font-bold" style={{ color: '#2E7D32' }}>
            Gerenciar →
          </Link>
        </div>
        <div className="divide-y divide-gray-50">
          {(premios ?? []).length > 0 ? (premios ?? []).map((p: any) => (
            <div key={p.id} className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-3">
                {p.foto_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.foto_url} alt={p.nome} className="w-10 h-10 object-contain rounded-lg" />
                )}
                <div>
                  <p className="font-bold text-gray-800 text-sm">{p.nome}</p>
                  <p className="text-xs text-gray-400">{p.tipo}</p>
                </div>
              </div>
              <p className="font-black text-sm" style={{ color: '#2E7D32' }}>
                R$ {Number(p.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          )) : (
            <p className="text-sm text-gray-400 px-5 py-8 text-center">Nenhum prêmio cadastrado</p>
          )}
        </div>
      </div>

      {/* Sorteios */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b" style={{ background: 'rgba(46,125,50,0.04)' }}>
          <h2 className="font-bold text-gray-700 flex items-center gap-2">
            <Trophy size={16} style={{ color: '#2E7D32' }} />
            Sorteios
          </h2>
        </div>
        <div className="divide-y divide-gray-50">
          {(sorteios ?? []).length > 0 ? (sorteios ?? []).map((s: any) => (
            <div key={s.id} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="font-bold text-gray-800 text-sm">
                  {premioNomeMap[s.premio_id] ?? `Sorteio ${s.numero_sorteio}`}
                </p>
                <p className="text-xs text-gray-400">
                  {s.realizado_em
                    ? new Date(s.realizado_em).toLocaleDateString('pt-BR')
                    : 'Aguardando'}
                </p>
              </div>
              <span className="text-xs font-bold px-2 py-1 rounded-full"
                style={{
                  background: s.status === 'realizado' ? '#E8F5E9' : '#FFF8E1',
                  color:      s.status === 'realizado' ? '#2E7D32' : '#F59E0B',
                }}>
                {s.status === 'realizado' ? 'Realizado' : 'Pendente'}
              </span>
            </div>
          )) : (
            <p className="text-sm text-gray-400 px-5 py-8 text-center">Nenhum sorteio registrado</p>
          )}
        </div>
      </div>

      {/* Zona de perigo */}
      {edicao.status === 'rascunho' && (
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden"
          style={{ borderColor: '#FFCDD2' }}>
          <div className="px-5 py-4 border-b" style={{ background: '#FFF5F5' }}>
            <h2 className="font-bold text-red-700 flex items-center gap-2">
              <Trash2 size={16} className="text-red-500" />
              Zona de Perigo
            </h2>
          </div>
          <div className="px-5 py-4 flex items-center justify-between gap-4">
            <div>
              <p className="font-bold text-gray-800 text-sm">Excluir edição</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Ação irreversível. Só é possível excluir edições em rascunho.
              </p>
            </div>
            <ExcluirEdicaoBtn edicaoId={id} />
          </div>
        </div>
      )}
    </div>
  )
}
