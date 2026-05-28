import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { logPagamento, logErro } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// ── Admin Supabase (bypassa RLS para escrita) ─────────────────────────────────
function adminSB() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// ── Payload PIX EMV (formato BCB) ────────────────────────────────────────────
function crc16(s: string): string {
  let c = 0xffff
  for (let i = 0; i < s.length; i++) {
    c ^= s.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++)
      c = c & 0x8000 ? ((c << 1) ^ 0x1021) & 0xffff : (c << 1) & 0xffff
  }
  return c.toString(16).toUpperCase().padStart(4, '0')
}
function emv(id: string, v: string) {
  return `${id}${String(v.length).padStart(2, '0')}${v}`
}
function gerarPixPayload(chave: string, valor: number, txid: string): string {
  const info = emv('26', emv('00', 'br.gov.bcb.pix') + emv('01', chave))
  const extra = emv('62', emv('05', txid.slice(0, 25)))
  const corpo = [
    emv('00', '01'), info,
    emv('52', '0000'), emv('53', '986'),
    emv('54', valor.toFixed(2)),
    emv('58', 'BR'), emv('59', 'Recife Cap'), emv('60', 'Recife PE'),
    extra, '6304',
  ].join('')
  return corpo + crc16(corpo)
}

// ── Validação de CPF ──────────────────────────────────────────────────────────
function cpfValido(cpf: string): boolean {
  const n = cpf.replace(/\D/g, '')
  if (n.length !== 11 || /^(\d)\1+$/.test(n)) return false
  let s = 0
  for (let i = 0; i < 9; i++) s += parseInt(n[i]!) * (10 - i)
  let r = (s * 10) % 11; if (r >= 10) r = 0
  if (r !== parseInt(n[9]!)) return false
  s = 0
  for (let i = 0; i < 10; i++) s += parseInt(n[i]!) * (11 - i)
  r = (s * 10) % 11; if (r >= 10) r = 0
  return r === parseInt(n[10]!)
}

// ── POST /api/cliente/comprar ─────────────────────────────────────────────────
export async function POST(request: Request) {
  let body: {
    cpf: string; nome: string; telefone: string; data_nascimento: string
    quantidade: number; edicao_id?: string
  }

  try { body = await request.json() }
  catch { return NextResponse.json({ erro: 'Body inválido' }, { status: 400 }) }

  const { cpf, nome, telefone, data_nascimento, quantidade, edicao_id } = body
  const cpfNumeros = cpf.replace(/\D/g, '')

  if (!cpfValido(cpfNumeros))
    return NextResponse.json({ erro: 'CPF inválido' }, { status: 400 })
  if (!nome?.trim())
    return NextResponse.json({ erro: 'Nome obrigatório' }, { status: 400 })
  if (quantidade < 1 || quantidade > 10)
    return NextResponse.json({ erro: 'Quantidade deve ser entre 1 e 10' }, { status: 400 })

  const sb = adminSB()

  // Edição ativa
  let edicaoId = edicao_id
  if (!edicaoId) {
    const { data: eds } = await sb
      .from('edicoes')
      .select('id, valor_unitario')
      .in('status', ['ativa', 'em_sorteio'])
      .order('data_sorteio', { ascending: true })
      .limit(1)
    if (!eds?.length)
      return NextResponse.json({ erro: 'Nenhuma edição ativa no momento' }, { status: 404 })
    edicaoId = eds[0]!.id
  }

  // Valor unitário da edição
  const { data: edicao } = await sb
    .from('edicoes').select('valor_unitario').eq('id', edicaoId).single()
  const valorUnit: number = edicao?.valor_unitario ?? 10
  const valorTotal = valorUnit * quantidade

  // Cartelas disponíveis (em estoque ou com reserva expirada)
  const now = new Date().toISOString()
  const { data: disponiveis, error: errCart } = await sb
    .from('cartelas')
    .select('id, codigo, dv')
    .eq('edicao_id', edicaoId)
    .eq('status', 'em_estoque_distribuidor')
    .or(`reservada_ate.is.null,reservada_ate.lt.${now}`)
    .limit(quantidade)

  if (errCart) {
    logErro('compra_erro_busca_cartelas', errCart)
    return NextResponse.json({ erro: 'Erro ao buscar cartelas' }, { status: 500 })
  }
  if (!disponiveis?.length || disponiveis.length < quantidade)
    return NextResponse.json(
      { erro: `Apenas ${disponiveis?.length ?? 0} cartela(s) disponível(is) para esta edição` },
      { status: 409 },
    )

  const ids = disponiveis.map(c => c.id)
  const pixId = crypto.randomUUID()
  const reservadaAte = new Date(Date.now() + 15 * 60 * 1000)

  // Reserva as cartelas atomicamente — só atualiza se ainda estiverem disponíveis
  // As condições extras (.eq status + .is cpf_comprador null) evitam dupla venda
  // em caso de requisições concorrentes que passaram pelo SELECT acima ao mesmo tempo
  const { data: reservadas, error: errReserva } = await sb
    .from('cartelas')
    .update({
      status:                     'reservada',
      cpf_comprador:              cpfNumeros,
      nome_comprador:             nome.trim(),
      telefone_comprador:         telefone.replace(/\D/g, ''),
      data_nascimento_comprador:  data_nascimento || null,
      reservada_ate:              reservadaAte.toISOString(),
      pix_id:                     pixId,
    })
    .in('id', ids)
    .eq('status', 'em_estoque_distribuidor')
    .is('cpf_comprador', null)
    .select('codigo, dv')

  if (errReserva) {
    console.error('[comprar] reserva:', errReserva)
    return NextResponse.json({ erro: 'Erro ao reservar cartelas' }, { status: 500 })
  }
  if (!reservadas?.length || reservadas.length < quantidade) {
    return NextResponse.json(
      { erro: 'Títulos indisponíveis no momento. Tente novamente.' },
      { status: 409 },
    )
  }

  // Chave PIX do admin
  const { data: admins } = await sb
    .from('profiles').select('chave_pix')
    .eq('role', 'admin').not('chave_pix', 'is', null).limit(1)
  const chavePix = (admins?.[0] as any)?.chave_pix ?? 'natalcap@gmail.com'

  // Gera QR Code PIX
  const pixPayload = gerarPixPayload(chavePix, valorTotal, pixId)
  const QRCode = (await import('qrcode')).default
  const qrBase64 = await QRCode.toDataURL(pixPayload, { width: 250, margin: 2, color: { dark: '#000', light: '#fff' } })

  const titulos = reservadas.map((c: any) => `${c.codigo}-${c.dv}`)

  logPagamento('compra_iniciada', { cpf: cpfNumeros.slice(0, 3) + '***', quantidade, valor_total: valorTotal, edicao_id: edicaoId })

  return NextResponse.json({
    pix_id:           pixId,
    qr_base64:        qrBase64,
    pix_payload:      pixPayload,
    chave_pix:        chavePix,
    valor_total:      valorTotal,
    quantidade,
    titulos_reservados: titulos,
    expira_em:        reservadaAte.toISOString(),
  })
}
