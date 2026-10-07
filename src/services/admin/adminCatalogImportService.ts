import { getSupabase } from '@/lib/supabase'
import { getImportContract } from '@/services/import/contracts'
import { decodeImportCsvText } from '@/services/import/decodeImportCsvText'
import { normalizeImportText } from '@/services/import/normalizeText'
import { parseCsvToGrid } from '@/services/import/parseCsv'
import { parseXlsxToGrid } from '@/services/import/parseXlsx'
import { adminListCategories } from '@/services/admin/adminCategoryService'
import {
  consolidateProductRows,
  enforceExistingCategories,
  productFrozenPayload,
  type ImportCategoryNode,
  type ProductPreviewRow,
} from '@/services/import/productImportCore'
import { validateImportGrid } from '@/services/import/validate'
import type { ImportGrid } from '@/services/import/types'
import { adminFindProductIdBySku } from '@/services/admin/adminPriceListService'

async function loadPublishedCategoryNodes(): Promise<ImportCategoryNode[]> {
  const all = await adminListCategories()
  return all
    .filter((c) => c.status === 'published')
    .map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      parentId: c.parentId ?? null,
    }))
}

export type CatalogImportPreviewRow = ProductPreviewRow & {
  /** compat UI antiga */
  line: number
  ok: boolean
  errors: string[]
}

export type CatalogImportApplyResult = {
  created: number
  updated: number
  failed: number
  skipped: number
  categories_created: number
}

async function parseCatalogFile(file: File): Promise<ImportGrid> {
  const contract = getImportContract('catalog')
  const lower = file.name.toLowerCase()
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
    return parseXlsxToGrid(await file.arrayBuffer(), { contract })
  }
  return parseCsvToGrid(decodeImportCsvText(await file.arrayBuffer()), { contract })
}

async function loadExistingSkus(
  skus: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  const unique = [...new Set(skus.map((s) => s.trim()).filter(Boolean))]
  for (const sku of unique) {
    const id = await adminFindProductIdBySku(sku)
    if (id) map.set(sku.toLowerCase(), id)
  }
  return map
}

function toUiRow(r: ProductPreviewRow): CatalogImportPreviewRow {
  return {
    ...r,
    line: r.lineNumber,
    ok: r.applyable,
    errors: r.action === 'error' ? [r.message] : [],
  }
}

/** Prévia Frente A — consolida SKU duplicado. */
export async function adminPreviewCatalogImport(file: File): Promise<{
  rows: CatalogImportPreviewRow[]
  delimiter: string | null
  fileErrors: string[]
}> {
  const contract = getImportContract('catalog')
  const grid = await parseCatalogFile(file)
  const validation = validateImportGrid(grid, contract, {
    duplicateKeyField: '__none__',
  })

  const fileErrors = validation.errors
    .filter((e) => e.lineNumber === 0)
    .map((e) => e.message)

  if (fileErrors.length > 0) {
    return { rows: [], delimiter: grid.delimiter, fileErrors }
  }

  const skus = validation.mapped.map((r) => r.values.sku ?? '')
  const [existing, cats] = await Promise.all([
    loadExistingSkus(skus),
    loadPublishedCategoryNodes(),
  ])
  const consolidated = enforceExistingCategories(
    consolidateProductRows(validation.mapped, existing),
    cats,
  )
  return {
    rows: consolidated.map(toUiRow),
    delimiter: grid.delimiter,
    fileErrors: [],
  }
}

export async function adminCreateCatalogImport(input: {
  filename: string
  createdBy?: string | null
  rows: CatalogImportPreviewRow[]
}): Promise<string> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('imports')
    .insert({
      filename: input.filename,
      status: 'preview',
      kind: 'catalog',
      created_by: input.createdBy ?? null,
      report: {
        total: input.rows.length,
        valid: input.rows.filter((r) => r.ok).length,
        invalid: input.rows.filter((r) => !r.ok).length,
      },
    })
    .select('id')
    .single()
  if (error) throw error
  const importId = String(data.id)

  const items = input.rows.map((r) => ({
    import_id: importId,
    line_number: r.lineNumber,
    errors: r.errors,
    warnings: r.warnings,
    payload: productFrozenPayload(r),
    result: r.ok ? 'ok' : 'error',
  }))
  if (items.length) {
    const { error: itemsErr } = await sb.from('import_items').insert(items)
    if (itemsErr) throw itemsErr
  }
  return importId
}

/** Apply via RPC dedicada — só import_id. */
export async function adminApplyCatalogImport(
  importId: string,
): Promise<CatalogImportApplyResult> {
  const sb = getSupabase()
  const { data, error } = await sb.rpc('apply_catalog_products_import', {
    p_import_id: importId,
  })
  if (error) throw error
  const report = (data ?? {}) as Record<string, unknown>

  return {
    created: Number(report.created ?? 0),
    updated: Number(report.updated ?? 0),
    failed: Number(report.failed ?? 0),
    skipped: Number(report.skipped ?? 0),
    categories_created: Number(report.categories_created ?? 0),
  }
}

export { normalizeImportText }
