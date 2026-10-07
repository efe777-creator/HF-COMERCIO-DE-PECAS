/** Kinds de importação F8.1 + aplicações (Importação Inteligente). */
export type ImportKind =
  | 'catalog'
  | 'catalog_applications'
  | 'supplier_conversion'
  | 'supplier_cost'
  | 'price_list'

export type CsvDelimiter = ';' | ',' | '\t'

export type ImportFieldDef = {
  /** Chave canônica do campo (ex.: sku, name, price). */
  key: string
  /** Cabeçalhos aceitos (normalizados). */
  aliases: string[]
  required: boolean
}

export type ImportContract = {
  kind: ImportKind
  fields: ImportFieldDef[]
  /** Limite MVP F8.1. */
  maxRows: number
}

/** Grade tabular após parse (CSV ou XLSX). */
export type ImportGrid = {
  source: 'csv' | 'xlsx'
  delimiter: CsvDelimiter | null
  /** true se a 1ª linha foi tratada como cabeçalho. */
  hasHeader: boolean
  headers: string[]
  /** Linhas de dados (sem cabeçalho). Índices 0-based na grade; `lineNumber` 1-based no arquivo. */
  rows: ImportGridRow[]
}

export type ImportGridRow = {
  /** Número da linha no arquivo (1-based, inclui cabeçalho se houver). */
  lineNumber: number
  cells: string[]
}

export type ColumnMapping = Record<string, number>

export type MappedRow = {
  lineNumber: number
  values: Record<string, string>
}

export type RowIssue = {
  lineNumber: number
  field?: string
  code: string
  message: string
}

export type StructuralValidationResult = {
  ok: boolean
  errors: RowIssue[]
  warnings: RowIssue[]
  mapped: MappedRow[]
  /** Linhas estruturalmente válidas (sem erro). */
  validCount: number
  invalidCount: number
}
