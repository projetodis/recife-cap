import { NextResponse, NextRequest } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function adminSB() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function brl(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function dataBR(iso: string): string {
  if (!iso) return ''
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR')
}

const ABAS_FALLBACK = ['1º Prêmio', '2º Prêmio', '3º Prêmio', '4º Prêmio', 'Giro da Sorte']

export async function GET(req: NextRequest) {
  const sb       = adminSB()
  const edicaoId = req.nextUrl.searchParams.get('edicao')

  if (!edicaoId) return NextResponse.json({ error: 'edicao obrigatória' }, { status: 400 })

  const { data: edicao } = await sb
    .from('edicoes')
    .select('id, numero, data_sorteio, status')
    .eq('id', edicaoId)
    .single()

  if (!edicao) return NextResponse.json({ error: 'Edição não encontrada' }, { status: 404 })

  const { data: sorteiosRaw } = await sb
    .from('sorteios')
    .select('id, numero_sorteio, valor_premio, dezenas_sorteadas, realizado_em')
    .eq('edicao_id', edicaoId)
    .order('numero_sorteio', { ascending: true })

  const sorteioIds    = (sorteiosRaw ?? []).map((s: any) => s.id)
  const sorteioNumMap = Object.fromEntries((sorteiosRaw ?? []).map((s: any) => [s.id, s.numero_sorteio]))

  let ganhadores: any[] = []
  if (sorteioIds.length > 0) {
    const { data: ganhadoresRaw } = await sb
      .from('ganhadores')
      .select('sorteio_id, cartela:cartelas(codigo, dv, nome_comprador, pdv:pontos_de_venda(nome))')
      .in('sorteio_id', sorteioIds)

    ganhadores = (ganhadoresRaw ?? []).map((g: any) => {
      const cartela = Array.isArray(g.cartela) ? g.cartela[0] : g.cartela
      const pdv     = cartela ? (Array.isArray(cartela.pdv) ? cartela.pdv[0] : cartela.pdv) : null
      return {
        sorteio_numero: (sorteioNumMap as Record<string, number>)[g.sorteio_id] ?? 0,
        titulo:         cartela ? `${cartela.codigo ?? ''}${cartela.dv ? '-' + cartela.dv : ''}` : '—',
        nome:           cartela?.nome_comprador ?? 'Ganhador',
        pdv_nome:       pdv?.nome ?? null,
      }
    })
  }

  const { data: premios } = await sb
    .from('premios_edicao')
    .select('ordem, nome, valor')
    .eq('edicao_id', edicaoId)
    .eq('ativo', true)
    .order('ordem', { ascending: true })

  const { data: configs } = await sb
    .from('configuracoes')
    .select('chave, valor')
    .in('chave', ['nome_sistema', 'logo_url'])

  const cfgMap: Record<string, string> = {}
  for (const c of configs ?? []) cfgMap[c.chave] = c.valor

  const nomeSistema = cfgMap['nome_sistema'] || 'Recife Cap'

  function nomeAba(idx: number): string {
    const p = (premios ?? []).find((p: any) => p.ordem === idx + 1)
    return p?.nome ?? ABAS_FALLBACK[idx] ?? `${idx + 1}º Prêmio`
  }

  const sorteiosSections = Array.from({ length: 5 }, (_, i) => {
    const s  = (sorteiosRaw ?? []).find((s: any) => s.numero_sorteio === i + 1)
    const gs = ganhadores.filter(g => g.sorteio_numero === i + 1)
    const dezenas: string[] = s?.dezenas_sorteadas ?? []
    const valor             = s ? parseFloat(s.valor_premio ?? 0) : 0

    const dezenasHtml = dezenas.length > 0
      ? dezenas.map(d =>
          `<span style="display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;background:#f3f4f6;border:2px solid #e5e7eb;font-weight:700;font-size:13px;color:#374151;margin:3px;">${String(d).padStart(2, '0')}</span>`
        ).join('')
      : '<span style="color:#9ca3af;font-size:13px;">Sem dezenas registradas</span>'

    const ganhadoresRows = gs.length > 0
      ? gs.map((g, j) => `
          <tr style="background:${j % 2 === 0 ? '#fff' : '#f9fafb'};">
            <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-weight:700;font-family:monospace;font-size:13px;">${g.titulo}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;">${g.nome}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#6b7280;">${g.pdv_nome ?? '—'}</td>
          </tr>`).join('')
      : `<tr><td colspan="3" style="padding:16px;text-align:center;color:#9ca3af;font-size:13px;">Sem contemplados registrados</td></tr>`

    return `
      <div style="margin-bottom:28px;break-inside:avoid;">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 16px;background:#1B5E20;border-radius:10px 10px 0 0;">
          <span style="font-weight:900;color:#fff;font-size:14px;">${nomeAba(i)}</span>
          <span style="font-weight:700;color:#FFC107;font-size:14px;">${valor > 0 ? brl(valor) : '—'}</span>
        </div>
        <div style="padding:12px 16px;background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 0 0;">
          <p style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 8px;">Dezenas Sorteadas (${dezenas.length})</p>
          <div style="display:flex;flex-wrap:wrap;gap:2px;">${dezenasHtml}</div>
        </div>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:#e8f5e9;">
              <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;color:#2E7D32;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #c8e6c9;">Título</th>
              <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;color:#2E7D32;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #c8e6c9;">Nome</th>
              <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;color:#2E7D32;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #c8e6c9;">PDV</th>
            </tr>
          </thead>
          <tbody>${ganhadoresRows}</tbody>
        </table>
      </div>`
  }).join('')

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #111; padding: 32px; }
    @page { size: A4; margin: 20mm; }
  </style>
</head>
<body>
  <!-- Header -->
  <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:16px;border-bottom:3px solid #2E7D32;margin-bottom:24px;">
    <div>
      <h1 style="font-size:22px;font-weight:900;color:#1B5E20;line-height:1.1;">${nomeSistema}</h1>
      <p style="font-size:13px;color:#6b7280;margin-top:3px;">Resultado Oficial — Edição ${edicao.numero}</p>
    </div>
    <div style="text-align:right;">
      <p style="font-size:13px;font-weight:700;color:#374151;">Data do Sorteio</p>
      <p style="font-size:15px;font-weight:900;color:#2E7D32;">${dataBR(edicao.data_sorteio)}</p>
    </div>
  </div>

  <!-- Sorteios -->
  ${sorteiosSections}

  <!-- Rodapé -->
  <div style="margin-top:24px;padding-top:12px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;">
    <p style="font-size:11px;color:#9ca3af;">Documento gerado automaticamente por ${nomeSistema}</p>
    <p style="font-size:11px;color:#9ca3af;">Edição ${edicao.numero} · ${dataBR(edicao.data_sorteio)}</p>
  </div>
</body>
</html>`

  try {
    const puppeteer = (await import('puppeteer')).default
    const browser   = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    })
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'load', timeout: 30_000 })
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' } })
    await browser.close()

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `attachment; filename="resultado-edicao-${edicao.numero}.pdf"`,
      },
    })
  } catch (err) {
    console.error('[historico/pdf]', err)
    return NextResponse.json({ error: 'Falha ao gerar PDF' }, { status: 500 })
  }
}
