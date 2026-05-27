'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Plus, Package, Map, Link2, Search, Pencil, MapPin,
  Layers, Trash2, ChevronLeft, ChevronRight, Store,
  AlertCircle,
} from 'lucide-react'
import type { PDVRow } from './page'

interface Props {
  pdvs: PDVRow[]
  distribuidorId: string
}

const STATUS_LABEL: Record<string, string> = {
  ativo:       'Ativo',
  inativo:     'Inativo',
  sem_estoque: 'Sem estoque',
}

const STATUS_CLASS: Record<string, string> = {
  ativo:       'border-emerald-300 text-emerald-700 bg-emerald-50',
  inativo:     'border-gray-300 text-gray-500 bg-gray-50',
  sem_estoque: 'border-amber-300 text-amber-700 bg-amber-50',
}

const PAGE_SIZE = 20

export default function PDVsView({ pdvs, distribuidorId }: Props) {
  const [busca, setBusca]         = useState('')
  const [buscaAtiva, setBuscaAtiva] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [filtroRegiao, setFiltroRegiao] = useState('todos')
  const [pagina, setPagina]       = useState(1)
  const [linkCopiado, setLinkCopiado] = useState(false)
  const [excluindo, setExcluindo] = useState<string | null>(null)

  const regioes = useMemo(() => {
    const set = new Set<string>()
    for (const p of pdvs) { if (p.regiao) set.add(p.regiao) }
    return Array.from(set).sort()
  }, [pdvs])

  const filtrados = useMemo(() => {
    const termo = buscaAtiva.toLowerCase().trim()
    return pdvs.filter(p => {
      if (filtroStatus !== 'todos' && p.status !== filtroStatus) return false
      if (filtroRegiao !== 'todos' && (p.regiao ?? '') !== filtroRegiao) return false
      if (!termo) return true
      return (
        p.nome.toLowerCase().includes(termo) ||
        p.responsavel_nome.toLowerCase().includes(termo) ||
        (p.telefone ?? '').toLowerCase().includes(termo) ||
        (p.cidade ?? '').toLowerCase().includes(termo) ||
        (p.regiao ?? '').toLowerCase().includes(termo) ||
        (p.bairro ?? '').toLowerCase().includes(termo)
      )
    })
  }, [pdvs, buscaAtiva, filtroStatus, filtroRegiao])

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE))
  const paginaAtual  = Math.min(pagina, totalPaginas)
  const paginated    = filtrados.slice((paginaAtual - 1) * PAGE_SIZE, paginaAtual * PAGE_SIZE)

  function pesquisar(e: React.FormEvent) {
    e.preventDefault()
    setBuscaAtiva(busca)
    setPagina(1)
  }

  function mudarFiltro(status: string) {
    setFiltroStatus(status)
    setPagina(1)
  }

  function mudarRegiao(regiao: string) {
    setFiltroRegiao(regiao)
    setPagina(1)
  }

  async function copiarLinkCadastro() {
    const url = `${window.location.origin}/distribuidor/pdvs/novo`
    await navigator.clipboard.writeText(url)
    setLinkCopiado(true)
    setTimeout(() => setLinkCopiado(false), 2500)
  }

  async function excluirPDV(id: string, nome: string) {
    if (!confirm(`Excluir "${nome}"? Esta ação não pode ser desfeita.`)) return
    setExcluindo(id)
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    await supabase.from('pontos_de_venda').delete().eq('id', id)
    window.location.reload()
  }

  function abrirMapa(p: PDVRow) {
    if (p.latitude && p.longitude) {
      window.open(`https://www.google.com/maps?q=${p.latitude},${p.longitude}`, '_blank')
    } else if (p.maps_url) {
      window.open(p.maps_url, '_blank')
    }
  }

  const ativos      = pdvs.filter(p => p.status === 'ativo').length
  const semEstoque  = pdvs.filter(p => p.status === 'sem_estoque').length
  const inativos    = pdvs.filter(p => p.status === 'inativo').length

  return (
    <div>

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl lg:text-2xl font-semibold text-gray-900">Vendedores (PDVs)</h1>
          <p className="text-sm text-gray-500 mt-1">
            {pdvs.length} cadastrados &middot; {ativos} ativos &middot; {semEstoque} sem estoque &middot; {inativos} inativos
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/distribuidor/pdvs/novo"
            className="inline-flex items-center gap-1.5 px-3 py-2 min-h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition"
          >
            <Plus size={14} />
            Novo PDV
          </Link>
          <Link
            href="/distribuidor/cartelas"
            className="inline-flex items-center gap-1.5 px-3 py-2 min-h-9 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition"
          >
            <Package size={14} />
            <span className="hidden sm:inline">Fazer Distribuição</span>
            <span className="sm:hidden">Distribuir</span>
          </Link>
          <Link
            href="/distribuidor/rotas/nova"
            className="inline-flex items-center gap-1.5 px-3 py-2 min-h-9 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
          >
            <Map size={14} />
            <span className="hidden sm:inline">Distribuição por Rota</span>
            <span className="sm:hidden">Nova Rota</span>
          </Link>
          <button
            onClick={copiarLinkCadastro}
            className="inline-flex items-center gap-1.5 px-3 py-2 min-h-9 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition"
          >
            <Link2 size={14} />
            {linkCopiado ? 'Copiado!' : 'Link de Cadastro'}
          </button>
        </div>
      </div>

      {/* ── BUSCA + FILTROS ────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 flex flex-wrap gap-3">
        <form onSubmit={pesquisar} className="flex flex-1 min-w-0 gap-2">
          <div className="relative flex-1 min-w-0">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por nome, telefone, cidade..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-gray-900 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition whitespace-nowrap"
          >
            Pesquisar
          </button>
        </form>

        <select
          value={filtroStatus}
          onChange={e => mudarFiltro(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="todos">Todos os status</option>
          <option value="ativo">Ativo</option>
          <option value="sem_estoque">Sem estoque</option>
          <option value="inativo">Inativo</option>
        </select>

        {regioes.length > 0 && (
          <select
            value={filtroRegiao}
            onChange={e => mudarRegiao(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="todos">Todas as regiões</option>
            {regioes.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        )}
      </div>

      {/* ── TABELA ─────────────────────────────────────────────── */}
      {filtrados.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-16 text-center">
          {pdvs.length === 0 ? (
            <>
              <Store size={40} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 font-medium mb-1">Nenhum PDV cadastrado</p>
              <p className="text-gray-400 text-sm mb-5">Cadastre o primeiro ponto de venda para começar</p>
              <Link
                href="/distribuidor/pdvs/novo"
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition"
              >
                <Plus size={14} /> Cadastrar primeiro PDV
              </Link>
            </>
          ) : (
            <>
              <AlertCircle size={36} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm">Nenhum PDV encontrado com os filtros aplicados.</p>
            </>
          )}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider w-12">#</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider min-w-48">Nome</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider w-36">Telefone</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider w-36">Cidade</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider w-32">Região</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider w-36">Rota hoje</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider w-28 text-right">Cartelas</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider w-24 text-right">Comissão</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider w-28">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider w-28">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginated.map((p, i) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors group">

                    {/* # sequencial */}
                    <td className="px-4 py-3.5 text-xs text-gray-400 tabular-nums">
                      {(paginaAtual - 1) * PAGE_SIZE + i + 1}
                    </td>

                    {/* Nome / Responsável */}
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-gray-900 text-sm leading-tight">
                        {p.nome.toUpperCase()}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5 leading-tight">{p.responsavel_nome}</p>
                    </td>

                    {/* Telefone */}
                    <td className="px-4 py-3.5 text-gray-600 tabular-nums whitespace-nowrap">
                      {p.telefone ?? <span className="text-gray-300">&mdash;</span>}
                    </td>

                    {/* Cidade / Bairro */}
                    <td className="px-4 py-3.5">
                      {p.cidade ? (
                        <>
                          <p className="font-medium text-gray-800 leading-tight">{p.cidade}</p>
                          {p.bairro && <p className="text-xs text-gray-400 mt-0.5 leading-tight">{p.bairro}</p>}
                        </>
                      ) : (
                        <span className="text-gray-300">&mdash;</span>
                      )}
                    </td>

                    {/* Região */}
                    <td className="px-4 py-3.5 text-sm text-gray-600 whitespace-nowrap">
                      {p.regiao ?? <span className="text-gray-300">&mdash;</span>}
                    </td>

                    {/* Rota */}
                    <td className="px-4 py-3.5">
                      {p.rota_nome ? (
                        <span className="inline-block px-2 py-0.5 text-xs font-medium border border-blue-200 text-blue-700 bg-blue-50 rounded-full whitespace-nowrap max-w-[140px] truncate">
                          {p.rota_nome}
                        </span>
                      ) : (
                        <span className="text-gray-300">&mdash;</span>
                      )}
                    </td>

                    {/* Cartelas */}
                    <td className="px-4 py-3.5 text-right tabular-nums whitespace-nowrap">
                      <span className="text-gray-800 font-medium">{p.cartelas_estoque}</span>
                      <span className="text-gray-300 mx-1">|</span>
                      <span className="text-gray-500">{p.cartelas_vendidas}</span>
                    </td>

                    {/* Comissão */}
                    <td className="px-4 py-3.5 text-right tabular-nums text-gray-600">
                      {p.comissao_pct}%
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      <span className={`inline-block px-2.5 py-0.5 text-xs font-medium border rounded-full ${STATUS_CLASS[p.status] ?? STATUS_CLASS.inativo}`}>
                        {STATUS_LABEL[p.status] ?? p.status}
                      </span>
                    </td>

                    {/* Ações */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">

                        <Link
                          href={`/distribuidor/pdvs/${p.id}/editar`}
                          title="Editar"
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition"
                        >
                          <Pencil size={15} />
                        </Link>

                        <button
                          onClick={() => abrirMapa(p)}
                          title="Ver no mapa"
                          disabled={!p.latitude && !p.maps_url}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <MapPin size={15} />
                        </button>

                        <Link
                          href="/distribuidor/cartelas"
                          title="Gerenciar cartelas"
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-violet-600 hover:bg-violet-50 transition"
                        >
                          <Layers size={15} />
                        </Link>

                        <button
                          onClick={() => excluirPDV(p.id, p.nome)}
                          title="Excluir"
                          disabled={excluindo === p.id}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition disabled:opacity-50"
                        >
                          <Trash2 size={15} />
                        </button>

                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── PAGINAÇÃO ────────────────────────────────────── */}
          {totalPaginas > 1 && (
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50">
              <p className="text-xs text-gray-500">
                {(paginaAtual - 1) * PAGE_SIZE + 1}–{Math.min(paginaAtual * PAGE_SIZE, filtrados.length)} de {filtrados.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPagina(p => Math.max(1, p - 1))}
                  disabled={paginaAtual === 1}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-white disabled:opacity-30 transition"
                >
                  <ChevronLeft size={15} />
                </button>
                <span className="px-3 text-sm text-gray-700 font-medium">{paginaAtual} / {totalPaginas}</span>
                <button
                  onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                  disabled={paginaAtual === totalPaginas}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-white disabled:opacity-30 transition"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
