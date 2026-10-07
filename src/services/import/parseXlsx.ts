import type { ImportContract, ImportGrid, ImportGridRow } from './types'
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

function cellToString(cell: unknown): string {
  if (cell == null || cell === '') return ''
  if (typeof cell === 'number') {
    if (!Number.isFinite(cell)) return ''
    // Evitar notação científica; preservar decimais úteis
    return String(cell)
  }
  return String(cell).trim()
}

/** Parse XLSX — primeira planilha (MVP). */
export async function parseXlsxToGrid(
  file: ArrayBuffer,
  options: { contract: ImportContract },
): Promise<ImportGrid> {
  const XLSX = await import('xlsx')
  const wb = XLSX.read(file, { type: 'array' })
  const sheetName = wb.SheetNames[0]
  if (!sheetName) {
    return {
      source: 'xlsx',
      delimiter: null,
      hasHeader: false,
      headers: [],
      rows: [],
    }
  }
  const sheet = wb.Sheets[sheetName]
  const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    raw: true,
  })

  if (data.length === 0) {
    return {
      source: 'xlsx',
      delimiter: null,
      hasHeader: false,
      headers: [],
      rows: [],
    }
  }

  const first = (data[0] ?? []).map(cellToString)
  const hasHeader = looksLikeHeader(first, options.contract)
  const headers = hasHeader ? first.map(normalizeHeader) : []
  const dataStart = hasHeader ? 1 : 0

  const rows: ImportGridRow[] = []
  for (let i = dataStart; i < data.length; i++) {
    const raw = data[i] ?? []
    const cells = raw.map(cellToString)
    if (cells.every((c) => !c.trim())) continue
    rows.push({
      lineNumber: i + 1,
      cells,
    })
  }

  return {
    source: 'xlsx',
    delimiter: null,
    hasHeader,
    headers,
    rows,
  }
}
