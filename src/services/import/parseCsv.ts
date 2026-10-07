import { detectCsvDelimiter } from './delimiter'
import { splitCsvLine, splitCsvRecords } from './csvSplit'
import type { CsvDelimiter, ImportContract, ImportGrid, ImportGridRow } from './types'
import { normalizeHeader } from './headers'

function looksLikeHeader(cells: string[], contract: ImportContract): boolean {
  const normalized = cells.map(normalizeHeader).filter(Boolean)
  if (normalized.length === 0) return false
  const aliasSet = new Set(
    contract.fields.flatMap((f) => f.aliases.map(normalizeHeader)),
  )
  let hits = 0
  for (const h of normalized) {
    if (aliasSet.has(h)) hits++
  }
  return hits >= 1
}

/**
 * Parse CSV → grade. Delimitador opcional; se omitido, detecta (preferência `;`).
 * Registros respeitam aspas: descrição com quebras de linha permanece um único produto.
 */
export function parseCsvToGrid(
  text: string,
  options: {
    contract: ImportContract
    delimiter?: CsvDelimiter
  },
): ImportGrid {
  const delimiter = options.delimiter ?? detectCsvDelimiter(text)
  const records = splitCsvRecords(text)

  if (records.length === 0) {
    return {
      source: 'csv',
      delimiter,
      hasHeader: false,
      headers: [],
      rows: [],
    }
  }

  const firstCells = splitCsvLine(records[0]!.text, delimiter)
  const hasHeader = looksLikeHeader(firstCells, options.contract)
  const headers = hasHeader ? firstCells.map(normalizeHeader) : []
  const dataStart = hasHeader ? 1 : 0

  const rows: ImportGridRow[] = []
  for (let i = dataStart; i < records.length; i++) {
    const rec = records[i]!
    const cells = splitCsvLine(rec.text, delimiter)
    if (cells.every((c) => !c.trim())) continue
    rows.push({
      lineNumber: rec.lineNumber,
      cells,
    })
  }

  return {
    source: 'csv',
    delimiter,
    hasHeader,
    headers,
    rows,
  }
}
