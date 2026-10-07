import { parseMoneyBr } from '@/lib/money'
import type {
  ImportContract,
  ImportGrid,
  MappedRow,
  RowIssue,
  StructuralValidationResult,
} from './types'
import { buildColumnMapping, mapGridRows } from './mapColumns'

function issue(
  lineNumber: number,
  code: string,
  message: string,
  field?: string,
): RowIssue {
  return { lineNumber, code, message, field }
}

/** Detecta chaves duplicadas no arquivo (ex.: mesmo SKU em duas linhas). */
export function findDuplicateKeys(
  rows: MappedRow[],
  keyField: string,
): Map<string, number[]> {
  const map = new Map<string, number[]>()
  for (const row of rows) {
    const key = (row.values[keyField] ?? '').trim().toUpperCase()
    if (!key) continue
    const list = map.get(key) ?? []
    list.push(row.lineNumber)
    map.set(key, list)
  }
  const dupes = new Map<string, number[]>()
  for (const [k, lines] of map) {
    if (lines.length > 1) dupes.set(k, lines)
  }
  return dupes
}

/**
 * Validação estrutural (sem lookup no banco).
 * - arquivo vazio
 * - colunas obrigatórias ausentes
 * - limite de linhas
 * - campos required vazios
 * - dinheiro inválido (campos cost/price)
 * - duplicata da chave no arquivo
 */
export function validateImportGrid(
  grid: ImportGrid,
  contract: ImportContract,
  options?: {
    /** Campo usado para detectar duplicata no arquivo. Default: sku ou supplier_sku. */
    duplicateKeyField?: string
    columnOverride?: Partial<Record<string, number>>
  },
): StructuralValidationResult {
  const errors: RowIssue[] = []
  const warnings: RowIssue[] = []

  if (grid.rows.length === 0) {
    errors.push(issue(0, 'empty_file', 'Arquivo vazio'))
    return {
      ok: false,
      errors,
      warnings,
      mapped: [],
      validCount: 0,
      invalidCount: 0,
    }
  }

  if (grid.rows.length > contract.maxRows) {
    errors.push(
      issue(
        0,
        'row_limit',
        `Arquivo excede o limite de ${contract.maxRows} linhas (${grid.rows.length})`,
      ),
    )
    return {
      ok: false,
      errors,
      warnings,
      mapped: [],
      validCount: 0,
      invalidCount: grid.rows.length,
    }
  }

  const { mapping, missingRequired } = buildColumnMapping(
    grid,
    contract,
    options?.columnOverride,
  )

  if (missingRequired.length > 0) {
    errors.push(
      issue(
        0,
        'missing_columns',
        `Colunas obrigatórias ausentes: ${missingRequired.join(', ')}`,
      ),
    )
    return {
      ok: false,
      errors,
      warnings,
      mapped: [],
      validCount: 0,
      invalidCount: grid.rows.length,
    }
  }

  const mapped = mapGridRows(grid, mapping)
  const dupField =
    options?.duplicateKeyField ??
    (mapping.sku != null ? 'sku' : mapping.supplier_sku != null ? 'supplier_sku' : 'sku')
  const skipDupes = dupField === '__none__' || dupField === ''
  const dupes = skipDupes ? new Map<string, number[]>() : findDuplicateKeys(mapped, dupField)
  const dupeLines = new Set<number>()
  for (const [key, lines] of dupes) {
    for (const ln of lines) {
      dupeLines.add(ln)
      errors.push(
        issue(
          ln,
          'duplicate_in_file',
          `Valor duplicado no arquivo (${dupField}=${key})`,
          dupField,
        ),
      )
    }
  }

  const moneyFields = new Set(
    contract.fields.filter((f) => f.key === 'price' || f.key === 'cost').map((f) => f.key),
  )

  let validCount = 0
  let invalidCount = 0

  for (const row of mapped) {
    const rowErrors: RowIssue[] = []

    for (const field of contract.fields) {
      if (!field.required) continue
      const val = (row.values[field.key] ?? '').trim()
      if (!val) {
        rowErrors.push(
          issue(row.lineNumber, 'required_empty', `Campo obrigatório vazio: ${field.key}`, field.key),
        )
      }
    }

    for (const mf of moneyFields) {
      const raw = (row.values[mf] ?? '').trim()
      if (!raw) continue // already covered by required
      const n = parseMoneyBr(raw)
      if (n == null || Number.isNaN(n)) {
        rowErrors.push(
          issue(row.lineNumber, 'invalid_money', `Valor inválido em ${mf}: "${raw}"`, mf),
        )
      } else if (n < 0) {
        rowErrors.push(
          issue(row.lineNumber, 'negative_money', `Valor negativo em ${mf}`, mf),
        )
      }
    }

    if (dupeLines.has(row.lineNumber)) {
      // already pushed duplicate errors
    }

    const hasErr =
      rowErrors.length > 0 || dupeLines.has(row.lineNumber)
    if (hasErr) {
      invalidCount++
      errors.push(...rowErrors)
    } else {
      validCount++
    }
  }

  // File-level ok = has at least mapping success; rows may still have errors
  const fileBlocking = errors.some((e) => e.lineNumber === 0)
  return {
    ok: !fileBlocking && invalidCount === 0,
    errors,
    warnings,
    mapped,
    validCount,
    invalidCount,
  }
}
