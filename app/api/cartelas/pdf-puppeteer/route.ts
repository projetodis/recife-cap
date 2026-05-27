import { NextResponse } from 'next/server'
import { CARTELA_CONFIG, type CamposVariaveis, type GradeConfig } from '@/lib/cartela-template'
import {
  type CartelaDB,
  validarDezenas,
  prepararCamposCartela,
} from '@/lib/cartela-dados'

export const dynamic = 'force-dynamic'

// ── Tipos do body ─────────────────────────────────────────────────────────────

interface RequestBody {
  cartelas: CartelaDB[]
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

/** 6 números únicos aleatórios entre 1 e 100 para a Raspadinha Giro da Sorte */
function gerarRaspadinha(): number[] {
  const nums = new Set<number>()
  while (nums.size < 6) nums.add(Math.floor(Math.random() * 100) + 1)
  return [...nums]
}

/** Barras verticais determinísticas a partir do código */
function gerarBarras(codigo: string): string {
  const seed = codigo.split('').reduce((s, c) => s + c.charCodeAt(0), 0)
  return Array.from({ length: 110 }, (_, i) => {
    const w = ((seed * (i + 1) * 7 + i * 13) % 5 === 0) ? 2.5 : 1
    return `<span style="display:inline-block;width:${w}px;background:#000;height:100%;flex-shrink:0;"></span>`
  }).join('')
}

/**
 * Renderiza uma grade 5×5 de dezenas posicionada absolutamente.
 * Sempre 25 células — vazia se a dezena não existir.
 * DESIGNER: as cores das células (rgba fundo + #FFD700 texto) são para o placeholder.
 * Ajustar após PNG do designer.
 */
function renderGrade(dezenas: number[], cfg: GradeConfig, titulo: string): string {
  const totalW = cfg.cols * cfg.cellW + (cfg.cols - 1) * cfg.gap
  const rows   = 5
  const totalH = rows * cfg.cellH + (rows - 1) * cfg.gap

  const cells = Array.from({ length: 25 }, (_, i) => {
    const val = dezenas[i] !== undefined ? String(dezenas[i]).padStart(2, '0') : ''
    return `<div class="dz-cell">${val}</div>`
  }).join('')

  // Label do sorteio acima da grade
  return `
<div style="position:absolute;top:${cfg.top - 16}px;left:${cfg.left}px;width:${totalW}px;">
  <div class="sorteio-label">${titulo}</div>
  <div style="
    display:grid;
    grid-template-columns:repeat(${cfg.cols},${cfg.cellW}px);
    grid-template-rows:repeat(${rows},${cfg.cellH}px);
    gap:${cfg.gap}px;
    width:${totalW}px;
    height:${totalH}px;
  ">${cells}</div>
</div>`
}

/**
 * Gera o HTML completo de uma cartela com campos posicionados absolutamente
 * sobre o fundo placeholder (#1B1B8E).
 *
 * DESIGNER: substituir o background-color pelo background-image com o PNG real:
 *   background-image: url('/cartela-base.png');
 *   background-size: cover;
 *   background-color: transparent;
 */
function gerarHTMLCartela(campos: CamposVariaveis): string {
  const cfg = CARTELA_CONFIG.campos

  return `
<div class="cartela">

  <!-- DESIGNER: substituir background-color por background-image: url('/cartela-base.png') -->
  <!-- Fundo placeholder — remover quando o PNG do designer for integrado -->
  <div class="cartela-fundo"></div>

  <!-- ── Dia da semana, hora e data — canto sup. esquerdo ──── -->
  <!-- COORDENADAS: cfg.dia_semana / hora_sorteio / data_topo -->
  ${campos.dia_semana ? `
  <div class="campo" style="top:${cfg.dia_semana.top}px;left:${cfg.dia_semana.left}px;font-size:${cfg.dia_semana.fontSize ?? 9}pt;color:${cfg.dia_semana.color ?? '#FFD700'};font-weight:${cfg.dia_semana.fontWeight ?? 'bold'};">
    ${campos.dia_semana}
  </div>` : ''}

  ${campos.hora_sorteio ? `
  <div class="campo" style="top:${cfg.hora_sorteio.top}px;left:${cfg.hora_sorteio.left}px;font-size:${cfg.hora_sorteio.fontSize ?? 11}pt;color:${cfg.hora_sorteio.color ?? '#FFD700'};font-weight:${cfg.hora_sorteio.fontWeight ?? 'bold'};">
    ${campos.hora_sorteio}
  </div>` : ''}

  <div class="campo" style="top:${cfg.data_topo.top}px;left:${cfg.data_topo.left}px;font-size:${cfg.data_topo.fontSize ?? 9}pt;color:${cfg.data_topo.color ?? '#FFD700'};">
    ${campos.data_sorteio}
  </div>

  <!-- ── Linha de identificação central ─────────────────────── -->
  <!-- COORDENADAS: cfg.numero_titulo / dv / edicao / data_sorteio -->
  <div class="campo" style="top:${cfg.numero_titulo.top}px;left:${cfg.numero_titulo.left}px;font-size:${cfg.numero_titulo.fontSize ?? 14}pt;color:${cfg.numero_titulo.color ?? '#1B1B8E'};font-weight:${cfg.numero_titulo.fontWeight ?? 'bold'};">
    Título:&nbsp;${campos.numero_titulo}
  </div>

  <div class="campo" style="top:${cfg.dv.top}px;left:${cfg.dv.left}px;font-size:${cfg.dv.fontSize ?? 14}pt;color:${cfg.dv.color ?? '#1B1B8E'};">
    -${campos.dv}
  </div>

  <div class="campo" style="top:${cfg.edicao.top}px;left:${cfg.edicao.left}px;font-size:${cfg.edicao.fontSize ?? 14}pt;color:${cfg.edicao.color ?? '#1B1B8E'};">
    Edição:&nbsp;${campos.edicao}
  </div>

  <div class="campo" style="top:${cfg.data_sorteio.top}px;left:${cfg.data_sorteio.left}px;font-size:${cfg.data_sorteio.fontSize ?? 14}pt;color:${cfg.data_sorteio.color ?? '#1B1B8E'};">
    Sorteio:&nbsp;${campos.data_sorteio}
  </div>

  <!-- ── Grades de dezenas — 4 sorteios ─────────────────────── -->
  <!-- COORDENADAS: ajustar cfg.dezenas_s1/s2/s3/s4 no CARTELA_CONFIG -->
  ${renderGrade(campos.dezenas_s1, cfg.dezenas_s1, '1º SORTEIO')}
  ${renderGrade(campos.dezenas_s2, cfg.dezenas_s2, '2º SORTEIO')}
  ${renderGrade(campos.dezenas_s3, cfg.dezenas_s3, '3º SORTEIO')}
  ${renderGrade(campos.dezenas_s4, cfg.dezenas_s4, '4º SORTEIO')}

  <!-- ── QR Code PIX ─────────────────────────────────────────── -->
  <!-- COORDENADAS: cfg.qr_code -->
  <div style="position:absolute;top:${cfg.qr_code.top}px;left:${cfg.qr_code.left}px;">
    <img src="${campos.qr_code_base64}"
         width="${cfg.qr_code.width}"
         height="${cfg.qr_code.height}"
         style="display:block;border:2px solid #fff;border-radius:2px;"
         alt="QR PIX" />
    <div style="color:#fff;font-size:4pt;font-family:monospace;text-align:center;margin-top:2px;max-width:${cfg.qr_code.width}px;word-break:break-all;">
      ${campos.numero_titulo}-${campos.dv}
    </div>
  </div>

  <!-- ── Código de barras ────────────────────────────────────── -->
  <!-- COORDENADAS: cfg.codigo_barras -->
  <div style="position:absolute;top:${cfg.codigo_barras.top - 20}px;left:${cfg.codigo_barras.left}px;width:380px;height:16px;display:flex;align-items:flex-end;gap:0.3px;overflow:hidden;">
    ${gerarBarras(campos.codigo_barras)}
  </div>
  <div class="campo" style="top:${cfg.codigo_barras.top}px;left:${cfg.codigo_barras.left}px;font-size:${cfg.codigo_barras.fontSize ?? 6}pt;color:${cfg.codigo_barras.color ?? '#000'};font-family:monospace;">
    ${campos.codigo_barras}
  </div>

  <!-- ── Edição no rodapé ────────────────────────────────────── -->
  <!-- COORDENADAS: cfg.edicao_rodape -->
  <div class="campo" style="top:${cfg.edicao_rodape.top}px;left:${cfg.edicao_rodape.left}px;font-size:${cfg.edicao_rodape.fontSize ?? 7}pt;color:${cfg.edicao_rodape.color ?? '#FFD700'};">
    Edição ${campos.edicao}
  </div>

</div>`
}

// ── CSS ───────────────────────────────────────────────────────────────────────

const CSS = `
* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  background: #fff;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

/* Página A4 landscape: 2 cartelas empilhadas */
.pagina {
  width: ${CARTELA_CONFIG.width}px;
  height: ${CARTELA_CONFIG.height * 2}px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  break-after: page;
  page-break-after: always;
}
.pagina:last-child {
  break-after: avoid;
  page-break-after: avoid;
}

/* Divisor entre as duas cartelas da mesma página */
.divisor {
  width: 100%;
  height: 2px;
  border-top: 2px dashed #ccc;
  flex-shrink: 0;
}

/* Cartela: posicionamento relativo para os campos absolutos */
.cartela {
  position: relative;
  width: ${CARTELA_CONFIG.width}px;
  height: ${CARTELA_CONFIG.height}px;
  overflow: hidden;
  flex-shrink: 0;
}

/* DESIGNER: este é o fundo placeholder.
   Quando o PNG do designer chegar, substituir background-color por:
     background-image: url('/cartela-base.png');
     background-size: ${CARTELA_CONFIG.width}px ${CARTELA_CONFIG.height}px;
     background-repeat: no-repeat;
   e remover o background-color. */
.cartela-fundo {
  position: absolute;
  inset: 0;
  background-color: #1B1B8E;
  /* TODO: substituir por background-image: url('/cartela-base.png') */
}

/* Todos os campos variáveis usam position: absolute */
.campo {
  position: absolute;
  white-space: nowrap;
  line-height: 1.2;
}

/* Label acima de cada grade de sorteio */
.sorteio-label {
  font-size: 7pt;
  font-weight: 900;
  color: #FFD700;
  letter-spacing: 1px;
  text-transform: uppercase;
  margin-bottom: 3px;
  /* DESIGNER: ajustar cor/estilo após PNG */
}

/* Células das dezenas */
.dz-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: #FFD700;
  font-weight: 900;
  font-size: 7pt;
  border-radius: 2px;
  /* DESIGNER: ajustar cores/bordas após PNG */
}
`

// ── Builder de página ─────────────────────────────────────────────────────────

function gerarPaginaHTML(htmlCartelas: string[]): string {
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
  <style>${CSS}</style>
</head>
<body>${paginas.join('\n')}</body>
</html>`
}

// ── POST handler ──────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  // Importa Puppeteer dinamicamente — não disponível em ambientes serverless
  let puppeteer: any // eslint-disable-line @typescript-eslint/no-explicit-any
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

  const { cartelas } = body

  if (!Array.isArray(cartelas) || cartelas.length === 0) {
    return NextResponse.json({ error: 'Nenhuma cartela enviada' }, { status: 400 })
  }
  if (cartelas.length > 200) {
    return NextResponse.json({ error: 'Maximo 200 cartelas por requisicao' }, { status: 400 })
  }

  // Valida dezenas antes de processar
  const invalidas = cartelas.filter(c => !validarDezenas(c.dezenas))
  if (invalidas.length > 0) {
    return NextResponse.json(
      { error: `${invalidas.length} cartela(s) com dezenas invalidas (esperado 100 numeros)` },
      { status: 400 },
    )
  }

  try {
    // Prepara campos de todas as cartelas em paralelo (gera QR + raspadinha)
    const camposCartelas: CamposVariaveis[] = await Promise.all(
      cartelas.map(async (c) => {
        const qrText   = c.qr_code_pix ?? c.chave_pix ?? `NATALCAP:${c.numero}`
        const qrBase64 = await gerarQRBase64(qrText)
        const raspadinha = gerarRaspadinha()
        return prepararCamposCartela(c, raspadinha, qrBase64)
      }),
    )

    // Gera HTML de cada cartela
    const htmlCartelas = camposCartelas.map(gerarHTMLCartela)

    // Monta documento HTML completo
    const html = gerarPaginaHTML(htmlCartelas)

    // Lança Puppeteer e gera PDF
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
    console.error('[pdf-puppeteer]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
