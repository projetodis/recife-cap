import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

interface PDFRequestBody {
  tipo:    string   // 'visao-geral' | 'distribuidores' | 'cartelas' | 'sorteios'
  titulo:  string
  periodo: string   // ex: 'Mai/26' (label já formatado)
  rows:    Record<string, unknown>[]
  colunas: string[]
}

function moeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function gerarHTML(body: PDFRequestBody): string {
  const { titulo, periodo, rows, colunas } = body

  const theadCells = colunas.map(c => `<th>${c}</th>`).join('')
  const tbodyRows  = rows.map(row =>
    `<tr>${colunas.map(c => `<td>${row[c] ?? '—'}</td>`).join('')}</tr>`,
  ).join('')

  const emptyMsg = rows.length === 0
    ? '<tr><td colspan="' + colunas.length + '" class="empty">Nenhum dado encontrado</td></tr>'
    : ''

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 9pt;
      color: #1f2937;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .header {
      background: #1B1B8E;
      color: #fff;
      padding: 12mm 15mm 8mm;
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
    }
    .logo { font-size: 20pt; font-weight: 900; letter-spacing: 3px; color: #FFD700; }
    .logo-sub { font-size: 7pt; color: rgba(255,255,255,0.7); margin-top: 2px; }
    .titulo-relatorio { font-size: 13pt; font-weight: 700; text-align: right; }
    .periodo-label { font-size: 8pt; color: rgba(255,255,255,0.7); text-align: right; margin-top: 2px; }
    .faixa {
      background: #FFD700;
      height: 3mm;
    }
    .content { padding: 8mm 15mm; }
    .meta {
      font-size: 7pt;
      color: #6b7280;
      margin-bottom: 6mm;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 7.5pt;
    }
    thead tr {
      background: #1B1B8E;
      color: #fff;
    }
    thead th {
      padding: 4px 6px;
      text-align: left;
      font-weight: 600;
      white-space: nowrap;
    }
    tbody tr:nth-child(even) { background: #f3f4f6; }
    tbody td {
      padding: 3.5px 6px;
      border-bottom: 1px solid #e5e7eb;
      white-space: nowrap;
    }
    .empty {
      text-align: center;
      padding: 20px;
      color: #9ca3af;
    }
    .footer {
      position: fixed;
      bottom: 8mm;
      left: 15mm;
      right: 15mm;
      font-size: 6pt;
      color: #9ca3af;
      border-top: 1px solid #e5e7eb;
      padding-top: 2mm;
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">RECIFE CAP</div>
      <div class="logo-sub">Filantropia Premiável — Recife Cap</div>
    </div>
    <div>
      <div class="titulo-relatorio">${titulo}</div>
      <div class="periodo-label">${periodo || 'Todos os períodos'}</div>
    </div>
  </div>
  <div class="faixa"></div>
  <div class="content">
    <p class="meta">Gerado em ${new Date().toLocaleString('pt-BR')} · ${rows.length} registro(s)</p>
    <table>
      <thead><tr>${theadCells}</tr></thead>
      <tbody>${tbodyRows}${emptyMsg}</tbody>
    </table>
  </div>
  <div class="footer">
    <span>Recife Cap — Relatório confidencial</span>
    <span>Gerado em ${new Date().toLocaleDateString('pt-BR')}</span>
  </div>
</body>
</html>`
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  let body: PDFRequestBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON invalido' }, { status: 400 })
  }

  let puppeteer: any // eslint-disable-line @typescript-eslint/no-explicit-any
  try {
    puppeteer = (await import('puppeteer')).default
  } catch {
    return NextResponse.json({ error: 'Puppeteer nao disponivel' }, { status: 503 })
  }

  try {
    const html    = gerarHTML(body)
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    })

    try {
      const page = await browser.newPage()
      await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30_000 })
      const pdfBuffer = await page.pdf({
        format:          'A4',
        landscape:       false,
        printBackground: true,
        margin:          { top: '0', right: '0', bottom: '15mm', left: '0' },
      })

      const slug = body.tipo.replace(/[^a-z0-9]/g, '-')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return new NextResponse(pdfBuffer as any, {
        headers: {
          'Content-Type':        'application/pdf',
          'Content-Disposition': `attachment; filename="recife-cap-${slug}.pdf"`,
        },
      })
    } finally {
      await browser.close()
    }
  } catch (e: unknown) {
    console.error('[relatorios/pdf]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erro interno' },
      { status: 500 },
    )
  }
}
