import { createClient as createAdminClient } from '@supabase/supabase-js'
import Link from 'next/link'

function adminSB() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function formatCPF(cpf: string): string {
  const d = cpf.replace(/\D/g, '')
  if (d.length !== 11) return cpf
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}
function dataBR(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR')
}
function brl(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function GradeDezenas({ dezenas, titulo }: { dezenas: number[]; titulo: string }) {
  return (
    <div className="mb-3 last:mb-0">
      <p className="text-xs font-semibold text-gray-400 mb-1.5">{titulo}</p>
      <div className="grid grid-cols-5 gap-1">
        {Array.from({ length: 25 }, (_, i) => {
          const v = dezenas[i]
          return (
            <div
              key={i}
              className="h-7 rounded text-xs font-bold flex items-center justify-center"
              style={{
                background: v !== undefined ? '#FFC107' : '#f3f4f6',
                color:      v !== undefined ? '#1B5E20' : '#d1d5db',
              }}
            >
              {v !== undefined ? String(v).padStart(2, '0') : '·'}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  paga:                    { label: 'Pago ✓',     bg: '#FFC107', text: '#1B5E20' },
  reservada:               { label: 'Aguardando', bg: '#fef9c3', text: '#854d0e' },
  em_estoque_distribuidor: { label: 'Disponível', bg: '#dcfce7', text: '#166534' },
}

export default async function ConsultaPage({
  params,
}: {
  params: Promise<{ cpf: string }>
}) {
  const { cpf: cpfRaw } = await params
  const cpf = cpfRaw.replace(/\D/g, '')

  if (cpf.length !== 11) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 text-center max-w-sm w-full">
          <p className="text-4xl mb-3">⚠️</p>
          <p className="font-bold text-gray-900 mb-2">CPF inválido</p>
          <Link href="/cliente" className="text-sm underline" style={{ color: '#2E7D32' }}>
            Voltar ao início
          </Link>
        </div>
      </div>
    )
  }

  const sb = adminSB()
  const { data, error } = await sb
    .from('cartelas')
    .select(`
      id, codigo, dv, status,
      dezenas_sorteio_1, dezenas_sorteio_2,
      pix_id, reservada_ate,
      edicao:edicoes(id, numero, data_sorteio, hora_sorteio, premio_principal, valor_unitario)
    `)
    .eq('cpf_comprador', cpf)
    .order('created_at', { ascending: false })

  if (error) console.error('[consulta]', error)

  const titulos = (data ?? []).map((c: any) => {
    const ed = Array.isArray(c.edicao) ? c.edicao[0] : c.edicao
    return {
      id:            c.id,
      numero:        `${c.codigo}-${c.dv}`,
      status:        c.status as string,
      pix_id:        c.pix_id as string | null,
      reservada_ate: c.reservada_ate as string | null,
      dezenas_s1:    ((c.dezenas_sorteio_1 ?? []) as string[]).slice(0, 25).map(Number),
      dezenas_s2:    ((c.dezenas_sorteio_1 ?? []) as string[]).slice(25, 50).map(Number),
      dezenas_s3:    ((c.dezenas_sorteio_2 ?? []) as string[]).slice(0, 25).map(Number),
      dezenas_s4:    ((c.dezenas_sorteio_2 ?? []) as string[]).slice(25, 50).map(Number),
      edicao:        ed ?? null,
    }
  })

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <div
        className="px-4 pt-6 pb-10 flex items-center gap-3"
        style={{ background: 'linear-gradient(160deg, #2E7D32 0%, #1B5E20 100%)' }}
      >
        <Link href="/cliente" className="text-white opacity-80 active:opacity-50">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </Link>
        <div>
          <p className="text-white font-bold text-base">Meus títulos</p>
          <p className="text-green-200 text-xs">{formatCPF(cpf)}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="font-black text-lg leading-none" style={{ color: '#FFC107' }}>{titulos.length}</p>
          <p className="text-green-200 text-xs">título(s)</p>
        </div>
      </div>

      <div className="px-4 -mt-6 max-w-md mx-auto w-full pb-8 space-y-4">

        {titulos.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <p className="text-4xl mb-3">🎟</p>
            <p className="font-bold text-gray-900 mb-1">Nenhum título encontrado</p>
            <p className="text-gray-500 text-sm mb-4">Não encontramos títulos para este CPF</p>
            <Link
              href="/cliente/compra"
              className="inline-block py-3 px-6 rounded-2xl text-white font-bold text-sm"
              style={{ background: '#2E7D32' }}
            >
              Comprar títulos
            </Link>
          </div>
        ) : (
          titulos.map(t => {
            const cfg     = STATUS_CONFIG[t.status] ?? STATUS_CONFIG['em_estoque_distribuidor']!
            const expirado = t.reservada_ate ? new Date(t.reservada_ate) < new Date() : false

            return (
              <div key={t.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-gray-50">
                  <div>
                    <p className="font-black text-gray-900 font-mono tracking-wide">{t.numero}</p>
                    {t.edicao && (
                      <p className="text-xs text-gray-500">
                        Edição {t.edicao.numero} · Sorteio {dataBR(t.edicao.data_sorteio)} às {t.edicao.hora_sorteio}
                      </p>
                    )}
                  </div>
                  <span
                    className="text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{ background: cfg.bg, color: cfg.text }}
                  >
                    {cfg.label}
                  </span>
                </div>

                <div className="px-4 py-3">
                  <GradeDezenas dezenas={t.dezenas_s1} titulo="1º Sorteio" />
                  <GradeDezenas dezenas={t.dezenas_s2} titulo="2º Sorteio" />
                  <GradeDezenas dezenas={t.dezenas_s3} titulo="3º Sorteio" />
                  <GradeDezenas dezenas={t.dezenas_s4} titulo="4º Sorteio" />
                </div>

                {t.edicao && (
                  <div className="px-4 py-2 bg-gray-50 border-t border-gray-50 flex items-center justify-between">
                    <p className="text-xs text-gray-500">Prêmio principal</p>
                    <p className="text-sm font-bold" style={{ color: '#2E7D32' }}>
                      {brl(t.edicao.premio_principal)}
                    </p>
                  </div>
                )}

                {t.status === 'reservada' && !expirado && t.pix_id && (
                  <div className="px-4 pb-4 pt-2">
                    <Link
                      href="/cliente/compra"
                      className="block w-full text-center py-2.5 rounded-xl text-white text-sm font-bold"
                      style={{ background: '#2E7D32' }}
                    >
                      Finalizar pagamento
                    </Link>
                  </div>
                )}
              </div>
            )
          })
        )}

        {titulos.some(t => t.status === 'paga') && (
          <Link
            href="/cliente/sorteio"
            className="block text-center py-4 rounded-2xl font-bold text-sm border-2"
            style={{ borderColor: '#2E7D32', color: '#2E7D32' }}
          >
            📡 Acompanhar sorteio ao vivo
          </Link>
        )}
      </div>
    </div>
  )
}
