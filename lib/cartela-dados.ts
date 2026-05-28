import type { CamposVariaveis } from './cartela-template'

export interface CartelaDB {
  numero: string
  serie?: string
  edicao: number
  data_sorteio: string
  dezenas: number[]
  qr_code_pix?: string
  chave_pix?: string
  hora_sorteio?: string
  dia_semana?: string
  num_bingos?: number        // 4, 5, 6, 7 ou 8
  giro_da_sorte?: boolean
}

const DIAS_PT: Readonly<Record<number, string>> = {
  0: 'DOMINGO', 1: 'SEGUNDA', 2: 'TERÇA', 3: 'QUARTA',
  4: 'QUINTA', 5: 'SEXTA', 6: 'SÁBADO',
}

function derivarDiaSemana(data: string): string {
  const partes = data.split('/')
  if (partes.length !== 3) return ''
  const [d, m, y] = partes.map(Number)
  const fullYear = (y ?? 0) < 50 ? 2000 + (y ?? 0) : 1900 + (y ?? 0)
  const dt = new Date(fullYear, (m ?? 1) - 1, d ?? 1)
  return DIAS_PT[dt.getDay()] ?? ''
}

export function validarDezenas(dezenas: number[], numBingos = 4): boolean {
  const esperado = numBingos * 20 // cada bingo tem 20 dezenas (5 cols × 4 linhas)
  return Array.isArray(dezenas) && dezenas.length >= esperado
}

export function prepararCamposCartela(
  cartelaDB: CartelaDB,
  raspadinha: number[],
  qrBase64: string,
): CamposVariaveis {
  const [numeroParte = '', dvParte = ''] = cartelaDB.numero.split('-')
  const numBingos = cartelaDB.num_bingos || 4
  const dezenasPerBingo = 20 // 5 colunas × 4 linhas
  const d: number[] = Array.isArray(cartelaDB.dezenas) ? cartelaDB.dezenas : []

  // Dividir dezenas em grupos por bingo
  const dezenasPorBingo: number[][] = []
  for (let i = 0; i < numBingos; i++) {
    dezenasPorBingo.push(d.slice(i * dezenasPerBingo, (i + 1) * dezenasPerBingo))
  }

  return {
    numero_titulo:      numeroParte,
    dv:                 dvParte,
    serie:              cartelaDB.serie || '',
    edicao:             cartelaDB.edicao,
    data_sorteio:       cartelaDB.data_sorteio,
    dia_semana:         cartelaDB.dia_semana ?? derivarDiaSemana(cartelaDB.data_sorteio),
    hora_sorteio:       cartelaDB.hora_sorteio ?? '',
    num_bingos:         numBingos,
    dezenas_por_bingo:  dezenasPorBingo,
    // Manter compatibilidade com s1-s4
    dezenas_s1:         dezenasPorBingo[0] || [],
    dezenas_s2:         dezenasPorBingo[1] || [],
    dezenas_s3:         dezenasPorBingo[2] || [],
    dezenas_s4:         dezenasPorBingo[3] || [],
    dezenas_s5:         dezenasPorBingo[4] || [],
    dezenas_s6:         dezenasPorBingo[5] || [],
    dezenas_s7:         dezenasPorBingo[6] || [],
    dezenas_s8:         dezenasPorBingo[7] || [],
    giro_da_sorte:      cartelaDB.giro_da_sorte || false,
    numeros_raspadinha: raspadinha,
    codigo_barras:      cartelaDB.qr_code_pix ?? cartelaDB.chave_pix ?? cartelaDB.numero,
    qr_code_base64:     qrBase64,
    chave_pix:          cartelaDB.chave_pix ?? cartelaDB.qr_code_pix ?? '',
  }
}
