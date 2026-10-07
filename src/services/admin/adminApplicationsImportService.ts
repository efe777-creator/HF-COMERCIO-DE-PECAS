import { getSupabase } from '@/lib/supabase'
import {
  analyzeApplicationMappedRows,
  previewRowToFrozenPayload,
  type ApplicationCatalogs,
  type ApplicationPreviewRow,
} from '@/services/import/applicationImportCore'
import { getImportContract } from '@/services/import/contracts'
import { decodeImportCsvText } from '@/services/import/decodeImportCsvText'
import { parseCsvToGrid } from '@/services/import/parseCsv'
import { parseXlsxToGrid } from '@/services/import/parseXlsx'
import { validateImportGrid } from '@/services/import/validate'
import type { CsvDelimiter, ImportGrid } from '@/services/import/types'

async function parseApplicationsFile(file: File): Promise<ImportGrid> {
  const contract = getImportContract('catalog_applications')
  const lower = file.name.toLowerCase()
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
    return parseXlsxToGrid(await file.arrayBuffer(), { contract })
  }
  return parseCsvToGrid(decodeImportCsvText(await file.arrayBuffer()), { contract })
}

async function loadApplicationCatalogs(skus: string[]): Promise<ApplicationCatalogs> {
  const sb = getSupabase()
  const uniqueSkus = [...new Set(skus.map((s) => s.trim()).filter(Boolean))]

  const productsBySku = new Map<string, { id: string; name: string }>()
  if (uniqueSkus.length) {
    const { data: products, error } = await sb
      .from('products')
      .select('id, sku, name')
      .in('sku', uniqueSkus)
    if (error) throw error
    for (const p of products ?? []) {
      productsBySku.set(String(p.sku).toLowerCase(), {
        id: String(p.id),
        name: String(p.name),
      })
    }
  }

  const [{ data: makers, error: makersErr }, { data: models, error: modelsErr }, { data: versions, error: versionsErr }] =
    await Promise.all([
      sb.from('manufacturers').select('id, name').eq('status', 'active'),
      sb.from('models').select('id, manufacturer_id, name').eq('status', 'active'),
      sb.from('vehicle_versions').select('id, manufacturer_id, model_id, version_name').eq('status', 'active'),
    ])
  if (makersErr) throw makersErr
  if (modelsErr) throw modelsErr
  if (versionsErr) throw versionsErr

  const productIds = [...productsBySku.values()].map((p) => p.id)
  let pvc: ApplicationCatalogs['pvc'] = []
  if (productIds.length) {
    const { data: pvcRows, error: pvcErr } = await sb
      .from('product_vehicle_compatibility')
      .select('product_id, vehicle_version_id, year_start, year_end')
      .in('product_id', productIds)
    if (pvcErr) throw pvcErr
    pvc = (pvcRows ?? []).map((r) => ({
      productId: String(r.product_id),
      vehicleVersionId: String(r.vehicle_version_id),
      yearStart: r.year_start == null ? null : Number(r.year_start),
      yearEnd: r.year_end == null ? null : Number(r.year_end),
    }))
  }

  return {
    productsBySku,
    makers: (makers ?? []).map((m) => ({ id: String(m.id), name: String(m.name) })),
    models: (models ?? []).map((m) => ({
      id: String(m.id),
      manufacturerId: String(m.manufacturer_id),
      name: String(m.name),
    })),
    versions: (versions ?? []).map((v) => ({
      id: String(v.id),
      manufacturerId: String(v.manufacturer_id),
      modelId: String(v.model_id),
      versionName: v.version_name == null ? null : String(v.version_name),
    })),
    pvc,
  }
}

/** Prévia enriquecida com catálogo. Nada é gravado ainda. */
export async function adminPreviewApplicationsImport(file: File): Promise<{
  rows: ApplicationPreviewRow[]
  delimiter: CsvDelimiter | null
  fileErrors: string[]
}> {
  const contract = getImportContract('catalog_applications')
  const grid = await parseApplicationsFile(file)
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
  const catalogs = await loadApplicationCatalogs(skus)
  const preview = analyzeApplicationMappedRows(validation.mapped, catalogs)
  return {
    rows: preview,
    delimiter: grid.delimiter,
    fileErrors: [],
  }
}

/** Staging: congela decisões em import_items. */
export async function adminCreateApplicationsImport(input: {
  filename: string
  createdBy?: string | null
  rows: ApplicationPreviewRow[]
}): Promise<string> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('imports')
    .insert({
      filename: input.filename,
      status: 'preview',
      kind: 'catalog_applications',
      created_by: input.createdBy ?? null,
      report: {
        total: input.rows.length,
        applyable: input.rows.filter((r) => r.applyable).length,
        review: input.rows.filter((r) => r.action === 'review').length,
        error: input.rows.filter((r) => r.action === 'error').length,
        already_covered: input.rows.filter((r) => r.action === 'already_covered').length,
      },
    })
    .select('id')
    .single()
  if (error) throw error
  const importId = String(data.id)

  const items = input.rows.map((r) => {
    const ok = r.action !== 'error'
    return {
      import_id: importId,
      line_number: r.lineNumber,
      errors: r.action === 'error' ? [r.message] : [],
      warnings: r.action === 'review' ? [r.message] : [],
      payload: previewRowToFrozenPayload(r),
      result: ok ? 'ok' : 'error',
    }
  })
  if (items.length) {
    const { error: itemsErr } = await sb.from('import_items').insert(items)
    if (itemsErr) throw itemsErr
  }
  return importId
}

export type ApplicationsImportApplyResult = {
  created_products: number
  existing_products: number
  created_manufacturers: number
  existing_manufacturers: number
  created_models: number
  existing_models: number
  created_versions: number
  existing_versions: number
  created_applications: number
  updated_applications: number
  already_covered: number
  skipped_review: number
  skipped_error: number
  total_processed: number
}

/** Apply: somente import_id — decisões vêm de import_items. */
export async function adminApplyApplicationsImport(
  importId: string,
): Promise<ApplicationsImportApplyResult> {
  const sb = getSupabase()
  const { data, error } = await sb.rpc('apply_catalog_applications_import', {
    p_import_id: importId,
  })
  if (error) throw error
  const r = (data ?? {}) as Record<string, unknown>
  return {
    created_products: Number(r.created_products ?? 0),
    existing_products: Number(r.existing_products ?? 0),
    created_manufacturers: Number(r.created_manufacturers ?? 0),
    existing_manufacturers: Number(r.existing_manufacturers ?? 0),
    created_models: Number(r.created_models ?? 0),
    existing_models: Number(r.existing_models ?? 0),
    created_versions: Number(r.created_versions ?? 0),
    existing_versions: Number(r.existing_versions ?? 0),
    created_applications: Number(r.created_applications ?? 0),
    updated_applications: Number(r.updated_applications ?? 0),
    already_covered: Number(r.already_covered ?? 0),
    skipped_review: Number(r.skipped_review ?? 0),
    skipped_error: Number(r.skipped_error ?? 0),
    total_processed: Number(r.total_processed ?? 0),
  }
}

export type { ApplicationPreviewRow }
