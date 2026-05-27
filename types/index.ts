export type UserRole = 'admin' | 'distribuidor' | 'pdv' | 'cliente' | 'motoboy' | 'operador_sorteio' | 'financeiro' | 'suporte'

export type StatusPix = 'pendente' | 'aguardando_validacao' | 'validado' | 'rejeitado'

export type StatusDistribuidor = 'ativo' | 'bloqueado' | 'inativo'

export type StatusPDV = 'ativo' | 'inativo' | 'sem_estoque'

export type StatusEdicao = 'rascunho' | 'ativa' | 'em_sorteio' | 'encerrada'

export type StatusCartela =
  | 'em_estoque_distribuidor'
  | 'em_estoque_pdv'
  | 'vendida'
  | 'paga'
  | 'cancelada'

export type FormaPagamento = 'pix' | 'dinheiro' | 'cartao'

export type StatusPagamento =
  | 'pendente'
  | 'aguardando_confirmacao'
  | 'confirmado'
  | 'expirado'
  | 'cancelado'

export interface Profile {
  id: string
  role: UserRole
  nome: string
  cpf?: string
  telefone?: string
  chave_pix?: string
  status_pix: StatusPix
  avatar_url?: string
  created_at: string
  updated_at: string
}

export interface Distribuidor {
  id: string
  user_id: string
  nivel: number
  status: StatusDistribuidor
  comissao_pct: number
  meta_mensal?: number
  created_at: string
  profile?: Profile
}

export interface PontoDeVenda {
  id: string
  distribuidor_id: string
  responsavel_id?: string
  nome: string
  responsavel_nome: string
  telefone?: string
  cidade?: string
  bairro?: string
  endereco?: string
  status: StatusPDV
  comissao_pct: number
  created_at: string
}

export interface Edicao {
  id: string
  numero: number
  descricao?: string
  data_sorteio: string
  hora_sorteio: string
  valor_unitario: number
  total_cartelas: number
  status: StatusEdicao
  premio_principal: number
  created_at: string
}

export interface Cartela {
  id: string
  edicao_id: string
  codigo: string
  dv?: string
  dezenas_sorteio_1: string[]
  dezenas_sorteio_2?: string[]
  qr_code_url?: string
  distribuidor_id?: string
  pdv_id?: string
  cliente_id?: string
  status: StatusCartela
  vendida_em?: string
  paga_em?: string
  created_at: string
}

export interface Venda {
  id: string
  cartela_id: string
  pdv_id: string
  cliente_id?: string
  valor: number
  forma_pagamento: FormaPagamento
  status_pagamento: StatusPagamento
  txid_pix?: string
  qr_code_pix?: string
  pix_expira_em?: string
  pago_em?: string
  comprovante_url?: string
  created_at: string
}

export interface Sorteio {
  id: string
  edicao_id: string
  numero_sorteio: number
  dezenas_sorteadas: string[]
  cartela_vencedora?: string
  valor_premio: number
  status: 'aguardando' | 'realizado'
  realizado_em?: string
}

export interface Comissao {
  id: string
  venda_id: string
  beneficiario_id: string
  tipo: 'distribuidor' | 'pdv'
  valor: number
  percentual: number
  status: 'pendente' | 'pago'
  pago_em?: string
  created_at: string
}
