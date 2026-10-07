import { normalizeHeader } from './headers'
import type { ColumnMapping, ImportContract, ImportGrid, MappedRow } from './types'

/**
 * Mapeia campos do contrato → índice de coluna.
 * Com cabeçalho: por alias. Sem cabeçalho: ordem dos campos do contrato.
 */
export function buildColumnMapping(
  grid: ImportGrid,
  contract: ImportContract,
  override?: Partial<ColumnMapping>,
): { mapping: ColumnMapping; missingRequired: string[] } {
  const mapping: ColumnMapping = {}

  if (grid.hasHeader && grid.headers.length > 0) {
    const headerIndex = new Map<string, number>()
    grid.headers.forEach((h, i) => {
      const n = normalizeHeader(h)
      if (n && !headerIndex.has(n)) headerIndex.set(n, i)
    })

    for (const field of contract.fields) {
      for (const alias of field.aliases) {
        const idx = headerIndex.get(normalizeHeader(alias))
        if (idx != null) {
          mapping[field.key] = idx
          break
        }
      }
    }
  } else {
    // Sem cabeçalho: posição sequencial dos campos do contrato
    contract.fields.forEach((field, i) => {
      mapping[field.key] = i
    })
  }

  if (override) {
    for (const [key, idx] of Object.entries(override)) {
      if (typeof idx === 'number' && idx >= 0) mapping[key] = idx
    }
  }

  const missingRequired = contract.fields
    .filter((f) => f.required && mapping[f.key] == null)
    .map((f) => f.key)

  return { mapping, missingRequired }
}

export function mapGridRows(grid: ImportGrid, mapping: ColumnMapping): MappedRow[] {
  return grid.rows.map((row) => {
    const values: Record<string, string> = {}
    for (const [key, idx] of Object.entries(mapping)) {
      values[key] = (row.cells[idx] ?? '').trim()
    }
    return { lineNumber: row.lineNumber, values }
  })
}
