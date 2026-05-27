// COORDENADAS: todos os valores top/left/fontSize são em pixels (96 dpi).
// Ajustar após receber o PNG do designer e calibrar sobre o fundo real.

export interface CamposVariaveis {
  numero_titulo: string       // ex: "362411"
  dv: string                  // ex: "5"
  edicao: number              // ex: 345
  data_sorteio: string        // ex: "31/05/26"
  dia_semana: string          // ex: "DOMINGO"
  hora_sorteio: string        // ex: "9H00"

  dezenas_s1: number[]        // 25 dezenas — 1º sorteio
  dezenas_s2: number[]        // 25 dezenas — 2º sorteio
  dezenas_s3: number[]        // 25 dezenas — 3º sorteio
  dezenas_s4: number[]        // 25 dezenas — 4º sorteio

  numeros_raspadinha: number[] // 6 números aleatórios ocultos (Giro da Sorte)

  codigo_barras: string        // string exibida abaixo do código de barras
  qr_code_base64: string       // data URL base64 gerada pelo sistema
  chave_pix: string
}

// ── Tipos de configuração de campo ────────────────────────────────────────────

export interface CampoTextoConfig {
  top: number
  left: number
  fontSize?: number   // pt
  color?: string
  fontWeight?: string
  width?: number      // px — limita overflow
}

export interface GradeConfig {
  top: number
  left: number
  cellW: number  // largura de cada célula (px)
  cellH: number  // altura de cada célula (px)
  gap: number    // espaço entre células (px)
  cols: number   // sempre 5 para grade 5×5
}

export interface QRConfig {
  top: number
  left: number
  width: number
  height: number
}

export interface CartelaConfig {
  // Dimensões da cartela = A4 landscape / 2 (duas cartelas por página)
  width: number   // px ≈ 297mm × 3.78
  height: number  // px ≈ 105mm × 3.78

  campos: {
    // Linha de identificação central
    numero_titulo: CampoTextoConfig
    dv:            CampoTextoConfig
    edicao:        CampoTextoConfig
    data_sorteio:  CampoTextoConfig

    // Canto superior esquerdo — data/hora do sorteio
    dia_semana:   CampoTextoConfig
    hora_sorteio: CampoTextoConfig
    data_topo:    CampoTextoConfig

    // Grades de dezenas — 4 sorteios × 5×5 células
    dezenas_s1: GradeConfig  // 1º sorteio — coluna esquerda, topo
    dezenas_s2: GradeConfig  // 2º sorteio — coluna esquerda, base
    dezenas_s3: GradeConfig  // 3º sorteio — coluna direita, topo
    dezenas_s4: GradeConfig  // 4º sorteio — coluna direita, base

    // QR Code e código de barras
    qr_code:       QRConfig
    codigo_barras: CampoTextoConfig

    // Rodapé
    edicao_rodape: CampoTextoConfig
  }
}

// ── Configuração central — editar aqui para calibrar coordenadas ──────────────
// COORDENADAS: os valores abaixo são placeholders para o fundo #1B1B8E.
// Após o designer entregar o PNG, medir cada campo sobre a imagem e ajustar.
export const CARTELA_CONFIG: CartelaConfig = {
  width:  1122,
  height: 397,

  campos: {
    // ── Linha de identificação (área central, sobre o fundo claro) ────────────
    // COORDENADAS: ajustar após PNG
    numero_titulo: { top: 95,  left: 320, fontSize: 14, color: '#1B1B8E', fontWeight: 'bold' },
    dv:            { top: 95,  left: 430, fontSize: 14, color: '#1B1B8E' },
    edicao:        { top: 95,  left: 520, fontSize: 14, color: '#1B1B8E' },
    data_sorteio:  { top: 95,  left: 650, fontSize: 14, color: '#1B1B8E' },

    // ── Canto superior esquerdo ───────────────────────────────────────────────
    // COORDENADAS: ajustar após PNG
    dia_semana:   { top: 18, left: 12, fontSize: 9,  color: '#FFD700', fontWeight: 'bold' },
    hora_sorteio: { top: 30, left: 12, fontSize: 11, color: '#FFD700', fontWeight: 'bold' },
    data_topo:    { top: 44, left: 12, fontSize: 9,  color: '#FFD700' },

    // ── Grades de dezenas ─────────────────────────────────────────────────────
    // COORDENADAS: ajustar após PNG — col esquerda ~left:40, col direita ~left:870
    dezenas_s1: { top: 120, left:  40, cellW: 32, cellH: 22, gap: 4, cols: 5 },
    dezenas_s2: { top: 235, left:  40, cellW: 32, cellH: 22, gap: 4, cols: 5 },
    dezenas_s3: { top: 120, left: 870, cellW: 32, cellH: 22, gap: 4, cols: 5 },
    dezenas_s4: { top: 235, left: 870, cellW: 32, cellH: 22, gap: 4, cols: 5 },

    // ── QR Code ───────────────────────────────────────────────────────────────
    // COORDENADAS: ajustar após PNG
    qr_code: { top: 305, left: 950, width: 72, height: 72 },

    // ── Código de barras e rodapé ─────────────────────────────────────────────
    // COORDENADAS: ajustar após PNG
    codigo_barras: { top: 378, left:  40, fontSize: 6, color: '#000' },
    edicao_rodape: { top: 378, left: 500, fontSize: 7, color: '#FFD700' },
  },
}
