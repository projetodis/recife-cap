// COORDENADAS: valores em pixels (96dpi).
// Calibrar após receber PNG do designer.

export interface CamposVariaveis {
  numero_titulo:      string
  dv:                 string
  serie:              string       // ex: "A001"
  edicao:             number
  data_sorteio:       string
  dia_semana:         string
  hora_sorteio:       string
  num_bingos:         number       // 4 a 8
  dezenas_por_bingo:  number[][]   // array dinâmico por bingo
  // Compatibilidade
  dezenas_s1:         number[]
  dezenas_s2:         number[]
  dezenas_s3:         number[]
  dezenas_s4:         number[]
  dezenas_s5:         number[]
  dezenas_s6:         number[]
  dezenas_s7:         number[]
  dezenas_s8:         number[]
  giro_da_sorte:      boolean
  numeros_raspadinha: number[]
  codigo_barras:      string
  qr_code_base64:     string
  chave_pix:          string
}

export interface CampoTextoConfig {
  top:         number
  left:        number
  fontSize?:   number
  color?:      string
  fontWeight?: string
  width?:      number
  textAlign?:  string
}

export interface GradeConfig {
  top:   number
  left:  number
  cellW: number
  cellH: number
  gap:   number
  cols:  number  // sempre 5
  rows:  number  // sempre 4
}

export interface QRConfig {
  top:    number
  left:   number
  width:  number
  height: number
}

// Configuração para cada bingo (posição dinâmica baseada em num_bingos)
export interface BingoLayoutConfig {
  // Para cada num_bingos (4, 5, 6, 7, 8), define posição de cada bingo
  [numBingos: number]: GradeConfig[]
}

export interface CartelaConfig {
  // Dimensões A5 portrait: 148mm × 210mm a 96dpi ≈ 559px × 794px
  // Para impressão: usar 300dpi = 1748 × 2480px
  width:  number
  height: number

  campos: {
    numero_titulo: CampoTextoConfig
    dv:            CampoTextoConfig
    serie:         CampoTextoConfig
    edicao:        CampoTextoConfig
    data_sorteio:  CampoTextoConfig
    dia_semana:    CampoTextoConfig
    hora_sorteio:  CampoTextoConfig
    qr_code:       QRConfig
    codigo_barras: CampoTextoConfig
    giro_sorte:    CampoTextoConfig  // posição do campo giro da sorte
  }

  // Layout das grades por quantidade de bingos
  // Coordenadas placeholder — calibrar após receber PNG
  bingosLayout: BingoLayoutConfig
}

// ── CONFIGURAÇÃO CENTRAL ──────────────────────────────────────────────────────
// Dimensões: A5 portrait a 96dpi
// ⚠️ CALIBRAR após receber PNG do designer
export const CARTELA_CONFIG: CartelaConfig = {
  width:  559,
  height: 794,

  campos: {
    // Identificação — topo da cartela
    numero_titulo: { top: 18,  left: 80,  fontSize: 9,  color: '#1A1A1A', fontWeight: 'bold' },
    dv:            { top: 18,  left: 175, fontSize: 9,  color: '#1A1A1A' },
    serie:         { top: 18,  left: 210, fontSize: 9,  color: '#1A1A1A' },
    edicao:        { top: 18,  left: 260, fontSize: 8,  color: '#666666' },
    data_sorteio:  { top: 18,  left: 350, fontSize: 8,  color: '#666666' },
    dia_semana:    { top: 30,  left: 80,  fontSize: 8,  color: '#2E7D32', fontWeight: 'bold' },
    hora_sorteio:  { top: 40,  left: 80,  fontSize: 8,  color: '#2E7D32' },

    // QR Code PIX — canto inferior direito
    qr_code:       { top: 680, left: 420, width: 100, height: 100 },

    // Código de barras — rodapé
    codigo_barras: { top: 770, left: 20,  fontSize: 6,  color: '#333333' },

    // Giro da Sorte — área central inferior
    giro_sorte:    { top: 650, left: 20,  fontSize: 8,  color: '#1A1A1A', width: 380 },
  },

  // Layout das grades de dezenas por num_bingos
  // Cada bingo: 5 colunas × 4 linhas = 20 dezenas
  // ⚠️ CALIBRAR após receber PNG
  bingosLayout: {
    4: [
      { top:  60, left:  20, cellW: 34, cellH: 24, gap: 2, cols: 5, rows: 4 }, // Bingo 1
      { top: 180, left:  20, cellW: 34, cellH: 24, gap: 2, cols: 5, rows: 4 }, // Bingo 2
      { top:  60, left: 300, cellW: 34, cellH: 24, gap: 2, cols: 5, rows: 4 }, // Bingo 3
      { top: 180, left: 300, cellW: 34, cellH: 24, gap: 2, cols: 5, rows: 4 }, // Bingo 4
    ],
    5: [
      { top:  55, left:  20, cellW: 34, cellH: 22, gap: 2, cols: 5, rows: 4 }, // Bingo 1
      { top: 165, left:  20, cellW: 34, cellH: 22, gap: 2, cols: 5, rows: 4 }, // Bingo 2
      { top: 275, left:  20, cellW: 34, cellH: 22, gap: 2, cols: 5, rows: 4 }, // Bingo 3
      { top:  55, left: 300, cellW: 34, cellH: 22, gap: 2, cols: 5, rows: 4 }, // Bingo 4
      { top: 165, left: 300, cellW: 34, cellH: 22, gap: 2, cols: 5, rows: 4 }, // Bingo 5
    ],
    6: [
      { top:  55, left:  20, cellW: 34, cellH: 20, gap: 2, cols: 5, rows: 4 }, // Bingo 1
      { top: 160, left:  20, cellW: 34, cellH: 20, gap: 2, cols: 5, rows: 4 }, // Bingo 2
      { top: 265, left:  20, cellW: 34, cellH: 20, gap: 2, cols: 5, rows: 4 }, // Bingo 3
      { top:  55, left: 300, cellW: 34, cellH: 20, gap: 2, cols: 5, rows: 4 }, // Bingo 4
      { top: 160, left: 300, cellW: 34, cellH: 20, gap: 2, cols: 5, rows: 4 }, // Bingo 5
      { top: 265, left: 300, cellW: 34, cellH: 20, gap: 2, cols: 5, rows: 4 }, // Bingo 6
    ],
    7: [
      { top:  52, left:  20, cellW: 34, cellH: 18, gap: 2, cols: 5, rows: 4 }, // Bingo 1
      { top: 150, left:  20, cellW: 34, cellH: 18, gap: 2, cols: 5, rows: 4 }, // Bingo 2
      { top: 248, left:  20, cellW: 34, cellH: 18, gap: 2, cols: 5, rows: 4 }, // Bingo 3
      { top: 346, left:  20, cellW: 34, cellH: 18, gap: 2, cols: 5, rows: 4 }, // Bingo 4
      { top:  52, left: 300, cellW: 34, cellH: 18, gap: 2, cols: 5, rows: 4 }, // Bingo 5
      { top: 150, left: 300, cellW: 34, cellH: 18, gap: 2, cols: 5, rows: 4 }, // Bingo 6
      { top: 248, left: 300, cellW: 34, cellH: 18, gap: 2, cols: 5, rows: 4 }, // Bingo 7
    ],
    8: [
      { top:  52, left:  20, cellW: 34, cellH: 18, gap: 2, cols: 5, rows: 4 }, // Bingo 1
      { top: 150, left:  20, cellW: 34, cellH: 18, gap: 2, cols: 5, rows: 4 }, // Bingo 2
      { top: 248, left:  20, cellW: 34, cellH: 18, gap: 2, cols: 5, rows: 4 }, // Bingo 3
      { top: 346, left:  20, cellW: 34, cellH: 18, gap: 2, cols: 5, rows: 4 }, // Bingo 4
      { top:  52, left: 300, cellW: 34, cellH: 18, gap: 2, cols: 5, rows: 4 }, // Bingo 5
      { top: 150, left: 300, cellW: 34, cellH: 18, gap: 2, cols: 5, rows: 4 }, // Bingo 6
      { top: 248, left: 300, cellW: 34, cellH: 18, gap: 2, cols: 5, rows: 4 }, // Bingo 7
      { top: 346, left: 300, cellW: 34, cellH: 18, gap: 2, cols: 5, rows: 4 }, // Bingo 8
    ],
  },
}
