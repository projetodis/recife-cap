import { NextResponse } from 'next/server'
import { CARTELA_CONFIG, type CamposVariaveis, type GradeConfig } from '@/lib/cartela-template'
import {
  type CartelaDB,
  prepararCamposCartela,
} from '@/lib/cartela-dados'

export const dynamic = 'force-dynamic'

// ── Tipos do body ─────────────────────────────────────────────────────────────

interface RequestBody {
  cartelas: CartelaDB[]
  template_url: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function gerarQRBase64(texto: string): Promise<string> {
  const QRCode = (await import('qrcode')).default
  return QRCode.toDataURL(texto, {
    width: 200,
    margin: 1,
    color: { dark: '#000000', light: '#ffffff' },
  })
}

function gerarRaspadinha(): number[] {
  const nums = new Set<number>()
  while (nums.size < 6) nums.add(Math.floor(Math.random() * 100) + 1)
  return [...nums]
}

/** Baixa a imagem do template e converte para data URL base64 */
async function templateParaBase64(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Falha ao baixar template: HTTP ${res.status}`)
  const buffer = await res.arrayBuffer()
  const mime   = res.headers.get('content-type') ?? 'image/png'
  const b64    = Buffer.from(buffer).toString('base64')
  return `data:${mime};base64,${b64}`
}

/** Grade dinâmica: cols × rows células posicionadas absolutamente */
function renderGrade(dezenas: number[], cfg: GradeConfig, titulo: string): string {
  const totalCells = cfg.cols * cfg.rows
  const totalW     = cfg.cols * cfg.cellW + (cfg.cols - 1) * cfg.gap
  const totalH     = cfg.rows * cfg.cellH + (cfg.rows - 1) * cfg.gap

  const cells = Array.from({ length: totalCells }, (_, i) => {
    const val = dezenas[i] !== undefined ? String(dezenas[i]).padStart(2, '0') : ''
    return `<div class="dz-cell">${val}</div>`
  }).join('')

  return `
<div style="position:absolute;top:${cfg.top - 14}px;left:${cfg.left}px;width:${totalW}px;z-index:1;">
  <div class="bingo-label">${titulo}</div>
  <div style="
    display:grid;
    grid-template-columns:repeat(${cfg.cols},${cfg.cellW}px);
    grid-template-rows:repeat(${cfg.rows},${cfg.cellH}px);
    gap:${cfg.gap}px;
    width:${totalW}px;
    height:${totalH}px;
  ">${cells}</div>
</div>`
}

function gerarHTMLCartela(campos: CamposVariaveis): string {
  const cfg    = CARTELA_CONFIG.campos
  const grades = CARTELA_CONFIG.bingosLayout[campos.num_bingos] ?? CARTELA_CONFIG.bingosLayout[4]!

  const gradesHTML = campos.dezenas_por_bingo.map((dezenas, i) => {
    const grade = grades[i]
    if (!grade) return ''
    return renderGrade(dezenas, grade, `${i + 1}º BINGO`)
  }).join('')

  return `
<div class="cartela">

  <div class="cartela-fundo"></div>

  <!-- Identificação -->
  <div class="campo" style="top:${cfg.numero_titulo.top}px;left:${cfg.numero_titulo.left}px;font-size:${cfg.numero_titulo.fontSize ?? 9}px;color:${cfg.numero_titulo.color ?? '#1A1A1A'};font-weight:${cfg.numero_titulo.fontWeight ?? 'bold'};">
    Nº ${campos.numero_titulo}-${campos.dv}
  </div>

  ${campos.serie ? `
  <div class="campo" style="top:${cfg.serie.top}px;left:${cfg.serie.left}px;font-size:${cfg.serie.fontSize ?? 9}px;color:${cfg.serie.color ?? '#1A1A1A'};">
    SÉRIE: ${campos.serie}
  </div>` : ''}

  <div class="campo" style="top:${cfg.edicao.top}px;left:${cfg.edicao.left}px;font-size:${cfg.edicao.fontSize ?? 8}px;color:${cfg.edicao.color ?? '#666666'};">
    ED.&nbsp;${campos.edicao}
  </div>

  <div class="campo" style="top:${cfg.data_sorteio.top}px;left:${cfg.data_sorteio.left}px;font-size:${cfg.data_sorteio.fontSize ?? 8}px;color:${cfg.data_sorteio.color ?? '#666666'};">
    ${campos.data_sorteio}
  </div>

  ${campos.dia_semana ? `
  <div class="campo" style="top:${cfg.dia_semana.top}px;left:${cfg.dia_semana.left}px;font-size:${cfg.dia_semana.fontSize ?? 8}px;color:${cfg.dia_semana.color ?? '#2E7D32'};font-weight:${cfg.dia_semana.fontWeight ?? 'bold'};">
    ${campos.dia_semana}
  </div>` : ''}

  ${campos.hora_sorteio ? `
  <div class="campo" style="top:${cfg.hora_sorteio.top}px;left:${cfg.hora_sorteio.left}px;font-size:${cfg.hora_sorteio.fontSize ?? 8}px;color:${cfg.hora_sorteio.color ?? '#2E7D32'};">
    ${campos.hora_sorteio}
  </div>` : ''}

  <!-- Grades de bingos — dinâmico por num_bingos -->
  ${gradesHTML}

  <!-- QR Code PIX -->
  <div style="position:absolute;top:${cfg.qr_code.top}px;left:${cfg.qr_code.left}px;z-index:1;">
    <img src="${campos.qr_code_base64}"
         width="${cfg.qr_code.width}"
         height="${cfg.qr_code.height}"
         style="display:block;border-radius:4px;"
         alt="QR PIX" />
    <div style="font-size:5px;font-family:monospace;text-align:center;margin-top:2px;max-width:${cfg.qr_code.width}px;word-break:break-all;color:#555;">
      ${campos.numero_titulo}-${campos.dv}
    </div>
  </div>

  <!-- Código de barras -->
  <div class="campo" style="top:${cfg.codigo_barras.top}px;left:${cfg.codigo_barras.left}px;font-size:${cfg.codigo_barras.fontSize ?? 6}px;color:${cfg.codigo_barras.color ?? '#333333'};font-family:monospace;">
    ${campos.codigo_barras}
  </div>

  <!-- Giro da Sorte -->
  ${campos.giro_da_sorte ? `
  <div class="campo" style="top:${cfg.giro_sorte.top}px;left:${cfg.giro_sorte.left}px;font-size:${cfg.giro_sorte.fontSize ?? 8}px;color:${cfg.giro_sorte.color ?? '#1A1A1A'};width:${cfg.giro_sorte.width ?? 380}px;font-weight:bold;">
    ★ GIRO DA SORTE
  </div>` : ''}

</div>`
}

// ── CSS — usa background-image do template ────────────────────────────────────

function gerarCSS(templateBase64: string): string {
  return `
* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  background: #fff;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

/* A5 portrait (559 × 794 px) × 2 lado a lado = A4 landscape */
.pagina {
  width: ${CARTELA_CONFIG.width * 2}px;
  height: ${CARTELA_CONFIG.height}px;
  display: flex;
  flex-direction: row;
  overflow: hidden;
  break-after: page;
  page-break-after: always;
}
.pagina:last-child {
  break-after: avoid;
  page-break-after: avoid;
}

.divisor {
  width: 1px;
  height: 100%;
  border-left: 2px dashed #999;
  flex-shrink: 0;
}

.cartela {
  position: relative;
  width: ${CARTELA_CONFIG.width}px;
  height: ${CARTELA_CONFIG.height}px;
  overflow: hidden;
  flex-shrink: 0;
}

.cartela-fundo {
  position: absolute;
  inset: 0;
  background-image: url('${templateBase64}');
  background-size: ${CARTELA_CONFIG.width}px ${CARTELA_CONFIG.height}px;
  background-repeat: no-repeat;
  background-position: top left;
}

.campo {
  position: absolute;
  white-space: nowrap;
  line-height: 1.2;
  z-index: 1;
}

.bingo-label {
  font-size: 6px;
  font-weight: 900;
  color: #2E7D32;
  text-transform: uppercase;
  margin-bottom: 2px;
}

.dz-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(0, 0, 0, 0.15);
  color: #1A1A1A;
  font-weight: 700;
  font-size: 7px;
  border-radius: 2px;
}
`
}

// ── Builder de página ─────────────────────────────────────────────────────────

function gerarPaginaHTML(htmlCartelas: string[], css: string): string {
  const paginas: string[] = []
  for (let i = 0; i < htmlCartelas.length; i += 2) {
    const c1 = htmlCartelas[i]
    const c2 = htmlCartelas[i + 1]
    paginas.push(`
<div class="pagina">
  ${c1}
  ${c2 ? `<div class="divisor"></div>${c2}` : ''}
</div>`)
  }

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <style>${css}</style>
</head>
<body>${paginas.join('\n')}</body>
</html>`
}

// ── POST handler ──────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let puppeteer: any
  try {
    puppeteer = (await import('puppeteer')).default
  } catch {
    return NextResponse.json(
      { error: 'Puppeteer nao disponivel neste ambiente.' },
      { status: 503 },
    )
  }

  let body: RequestBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON invalido' }, { status: 400 })
  }

  const { cartelas, template_url } = body

  if (!Array.isArray(cartelas) || cartelas.length === 0) {
    return NextResponse.json({ error: 'Nenhuma cartela enviada' }, { status: 400 })
  }
  if (cartelas.length > 200) {
    return NextResponse.json({ error: 'Maximo 200 cartelas por requisicao' }, { status: 400 })
  }
  if (!template_url || typeof template_url !== 'string') {
    return NextResponse.json({ error: 'template_url obrigatorio' }, { status: 400 })
  }

  try {
    const templateBase64 = await templateParaBase64(template_url)

    const camposCartelas: CamposVariaveis[] = await Promise.all(
      cartelas.map(async (c) => {
        const qrText     = c.qr_code_pix ?? c.chave_pix ?? `NATALCAP:${c.numero}`
        const qrBase64   = await gerarQRBase64(qrText)
        const raspadinha = gerarRaspadinha()
        return prepararCamposCartela(c, raspadinha, qrBase64)
      }),
    )

    const css          = gerarCSS(templateBase64)
    const htmlCartelas = camposCartelas.map(gerarHTMLCartela)
    const html         = gerarPaginaHTML(htmlCartelas, css)

    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--font-render-hinting=none',
      ],
    })

    try {
      const page = await browser.newPage()
      await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30_000 })

      const pdfBuffer = await page.pdf({
        format:          'A4',
        landscape:       true,
        printBackground: true,
        margin:          { top: '0', right: '0', bottom: '0', left: '0' },
      })

      const edicaoNum = cartelas[0]?.edicao ?? 'cartelas'

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return new NextResponse(pdfBuffer as any, {
        headers: {
          'Content-Type':        'application/pdf',
          'Content-Disposition': `attachment; filename="recife-cap-edicao-${edicaoNum}.pdf"`,
        },
      })
    } finally {
      await browser.close()
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro interno ao gerar PDF'
    console.error('[pdf-template]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
