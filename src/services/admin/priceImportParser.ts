import { parseMoneyBr } from '@/lib/money'
import { getImportContract } from '@/services/import/contracts'
import { parseCsvToGrid } from '@/services/import/parseCsv'
import { parseXlsxToGrid } from '@/services/import/parseXlsx'
import { validateImportGrid } from '@/services/import/validate'

export type ParsedPriceRow = {
  line: number
  sku: string
  priceRaw: string
  price: number | null
}

/**
 * Parse CSV SKU;PRECO — compat F6B.
 * Delega ao parser genérico F8.1 (detecção de delimitador + contrato price_list).
 */
export function parsePriceCsv(text: string): ParsedPriceRow[] {
  const contract = getImportContract('price_list')
  const grid = parseCsvToGrid(text, { contract })
  const result = validateImportGrid(grid, contract)

  // Mesmo com erros estruturais por linha, devolvemos todas as linhas mapeadas
  // para o preview legado montar erros de negócio (SKU inexistente etc.).
  if (result.mapped.length === 0 && grid.rows.length === 0) return []

  const mapped =
    result.mapped.length > 0
      ? result.mapped
      : grid.rows.map((r) => ({
          lineNumber: r.lineNumber,
          values: {
            sku: (r.cells[0] ?? '').trim(),
            price: (r.cells[1] ?? '').trim(),
          },
        }))

  return mapped.map((row) => {
    const sku = row.values.sku ?? ''
    const priceRaw = row.values.price ?? ''
    return {
      line: row.lineNumber,
      sku,
      priceRaw,
      price: parseMoneyBr(priceRaw),
    }
  })
}

/** Parse XLSX first sheet — compat F6B via grade F8.1. */
export async function parsePriceXlsx(file: ArrayBuffer): Promise<ParsedPriceRow[]> {
  const contract = getImportContract('price_list')
  const grid = await parseXlsxToGrid(file, { contract })
  const result = validateImportGrid(grid, contract)

  const mapped =
    result.mapped.length > 0
      ? result.mapped
      : grid.rows.map((r) => ({
          lineNumber: r.lineNumber,
          values: {
            sku: (r.cells[0] ?? '').trim(),
            price: (r.cells[1] ?? '').trim(),
          },
        }))

  return mapped.map((row) => {
    const sku = row.values.sku ?? ''
    const priceRaw = row.values.price ?? ''
    // XLSX pode ter entregue número já stringificado; parseMoneyBr cobre ambos
    const price = parseMoneyBr(priceRaw)
    return {
      line: row.lineNumber,
      sku,
      priceRaw,
      price,
    }
  })
}
