import type { CamposVariaveis } from './cartela-template'

// Formato que a rota recebe via GeradorPDF.tsx (não modificar o componente)
export interface CartelaDB {
  numero: string        // ex: "362411-5"  (codigo + "-" + dv)
  edicao: number
  data_sorteio: string  // ex: "31/05/26"  (já formatado pelo componente)
  dezenas: number[]     // 100 números: dezenas_sorteio_1[50] ++ dezenas_sorteio_2[50]
  qr_code_pix?: string
  chave_pix?: string
  hora_sorteio?: string // opcional — pode ser adicionado ao payload futuramente
  dia_semana?: string   // opcional — pode ser adicionado ao payload futuramente
}

const DIAS_PT: Readonly<Record<number, string>> = {
  0: 'DOMINGO',
  1: 'SEGUNDA',
  2: 'TERÇA',
  3: 'QUARTA',
  4: 'QUINTA',
  5: 'SEXTA',
  6: 'SÁBADO',
}

// Deriva dia da semana a partir de "DD/MM/YY"
function derivarDiaSemana(data: string): string {
  const partes = data.split('/')
  if (partes.length !== 3) return ''
  const [d, m, y] = partes.map(Number)
  const fullYear = (y ?? 0) < 50 ? 2000 + (y ?? 0) : 1900 + (y ?? 0)
  const dt = new Date(fullYear, (m ?? 1) - 1, d ?? 1)
  return DIAS_PT[dt.getDay()] ?? ''
}

/**
 * Valida que o array de dezenas contém exatamente 100 números.
 * 4 sorteios × 25 dezenas = 100.
 */
export function validarDezenas(dezenas: number[]): boolean {
  return Array.isArray(dezenas) && dezenas.length === 100
}

/**
 * Converte os dados recebidos do banco (via GeradorPDF.tsx) para CamposVariaveis.
 * Divide o array flat de 100 dezenas em 4 grupos de 25, um por sorteio.
 *
 * @param cartelaDB     Payload recebido pela rota POST
 * @param raspadinha    6 números aleatórios gerados pelo servidor
 * @param qrBase64      Data URL base64 do QR Code gerado por qrcode
 */
export function prepararCamposCartela(
  cartelaDB: CartelaDB,
  raspadinha: number[],
  qrBase64: string,
): CamposVariaveis {
  const [numeroParte = '', dvParte = ''] = cartelaDB.numero.split('-')

  // Garante 100 elementos mesmo que o dado chegue incompleto
  const d: number[] = Array.isArray(cartelaDB.dezenas) ? cartelaDB.dezenas : []

  return {
    numero_titulo:      numeroParte,
    dv:                 dvParte,
    edicao:             cartelaDB.edicao,
    data_sorteio:       cartelaDB.data_sorteio,
    dia_semana:         cartelaDB.dia_semana ?? derivarDiaSemana(cartelaDB.data_sorteio),
    hora_sorteio:       cartelaDB.hora_sorteio ?? '',

    // Flat[100] → 4 grupos de 25, na ordem dos sorteios
    dezenas_s1: d.slice(0,  25),
    dezenas_s2: d.slice(25, 50),
    dezenas_s3: d.slice(50, 75),
    dezenas_s4: d.slice(75, 100),

    numeros_raspadinha: raspadinha,

    codigo_barras: cartelaDB.qr_code_pix ?? cartelaDB.chave_pix ?? cartelaDB.numero,
    qr_code_base64: qrBase64,
    chave_pix:      cartelaDB.chave_pix ?? cartelaDB.qr_code_pix ?? '',
  }
}
