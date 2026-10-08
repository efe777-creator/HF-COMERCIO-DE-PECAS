import type { ImportPreviewRow } from '@/services/admin/adminPriceListService'

export type PriceImportAction =
  | 'update'
  | 'add'
  | 'unchanged'
  | 'not_found'
  | 'error'

/** Deriva a ação da prévia a partir de ImportPreviewRow (sem campo action no service). */
export function classifyPriceImportAction(row: ImportPreviewRow): PriceImportAction {
  if (!row.ok) return 'error'
  if (!row.productId) return 'not_found'
  if (row.currentPrice == null) return 'add'
  if (row.price != null && Math.abs(row.currentPrice - row.price) < 0.001) return 'unchanged'
  return 'update'
}

export function priceImportActionLabel(action: PriceImportAction): string {
  if (action === 'update') return 'Atualizar'
  if (action === 'add') return 'Adicionar'
  if (action === 'unchanged') return 'Sem alteração'
  if (action === 'not_found') return 'Não encontrado'
  return 'Erro'
}

export type PriceImportMode = 'update' | 'add' | 'both' | 'simulate'

/** Filtra linhas ok conforme modo (client-side; RPC apply inalterada). */
export function filterRowsForImportMode(
  rows: ImportPreviewRow[],
  mode: PriceImportMode,
): ImportPreviewRow[] {
  return rows.map((row) => {
    if (!row.ok) return row
    const action = classifyPriceImportAction(row)
    let keep = false
    if (mode === 'simulate' || mode === 'both') keep = action === 'update' || action === 'add'
    else if (mode === 'update') keep = action === 'update'
    else if (mode === 'add') keep = action === 'add'

    if (keep) return row
    if (action === 'unchanged') {
      return {
        ...row,
        ok: false,
        errors: [...row.errors, 'Ignorado: sem alteração (modo)'],
      }
    }
    return {
      ...row,
      ok: false,
      errors: [...row.errors, `Ignorado pelo modo (${priceImportActionLabel(action)})`],
    }
  })
}

export function summarizePriceImportActions(rows: ImportPreviewRow[]): {
  update: number
  add: number
  unchanged: number
  notFound: number
  error: number
  applyable: number
} {
  const s = { update: 0, add: 0, unchanged: 0, notFound: 0, error: 0, applyable: 0 }
  for (const row of rows) {
    const a = classifyPriceImportAction(row)
    if (a === 'update') {
      s.update += 1
      if (row.ok) s.applyable += 1
    } else if (a === 'add') {
      s.add += 1
      if (row.ok) s.applyable += 1
    } else if (a === 'unchanged') s.unchanged += 1
    else if (a === 'not_found') s.notFound += 1
    else s.error += 1
  }
  return s
}
