import {
  adminApplyCatalogImport,
  adminCreateCatalogImport,
  type CatalogImportApplyResult,
  type CatalogImportPreviewRow,
} from '@/services/admin/adminCatalogImportService'
import {
  adminApplyApplicationsImport,
  adminCreateApplicationsImport,
  type ApplicationPreviewRow,
  type ApplicationsImportApplyResult,
} from '@/services/admin/adminApplicationsImportService'
import { getHfBundleContract } from '@/services/import/contracts'
import { decodeImportCsvText } from '@/services/import/decodeImportCsvText'
import { parseCsvToGrid } from '@/services/import/parseCsv'
import { parseXlsxToGrid } from '@/services/import/parseXlsx'
import { adminListCategories } from '@/services/admin/adminCategoryService'
import {
  consolidateProductRows,
  enforceExistingCategories,
  splitHfMappedRows,
} from '@/services/import/productImportCore'
import { analyzeApplicationMappedRows } from '@/services/import/applicationImportCore'
import { validateImportGrid } from '@/services/import/validate'
import { getSupabase } from '@/lib/supabase'
import { adminFindProductIdBySku } from '@/services/admin/adminPriceListService'
import type { ApplicationCatalogs } from '@/services/import/applicationImportCore'

export type HfBundlePreview = {
  products: CatalogImportPreviewRow[]
  applications: ApplicationPreviewRow[]
  delimiter: string | null
  fileErrors: string[]
}

async function loadCatalogsForSkus(skus: string[]): Promise<ApplicationCatalogs> {
  const sb = getSupabase()
  const productsBySku = new Map<string, { id: string; name: string }>()
  const unique = [...new Set(skus.map((s) => s.trim()).filter(Boolean))]
  for (const sku of unique) {
    const id = await adminFindProductIdBySku(sku)
    if (id) {
      const { data } = await sb.from('products').select('id, name, sku').eq('id', id).maybeSingle()
      if (data) {
        productsBySku.set(String(data.sku).toLowerCase(), {
          id: String(data.id),
          name: String(data.name),
        })
      }
    }
  }

  const [{ data: makers }, { data: models }, { data: versions }] = await Promise.all([
    sb.from('manufacturers').select('id, name').eq('status', 'active'),
    sb.from('models').select('id, manufacturer_id, name').eq('status', 'active'),
    sb
      .from('vehicle_versions')
      .select('id, manufacturer_id, model_id, version_name')
      .eq('status', 'active'),
  ])

  const productIds = [...productsBySku.values()].map((p) => p.id)
  let pvc: ApplicationCatalogs['pvc'] = []
  if (productIds.length) {
    const { data: pvcRows } = await sb
      .from('product_vehicle_compatibility')
      .select('product_id, vehicle_version_id, year_start, year_end')
      .in('product_id', productIds)
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

/** Prévia HF: 1 produto por SKU + N aplicações. */
export async function adminPreviewHfBundleImport(file: File): Promise<HfBundlePreview> {
  const contract = getHfBundleContract()
  const lower = file.name.toLowerCase()
  const grid = lower.endsWith('.xlsx') || lower.endsWith('.xls')
    ? await parseXlsxToGrid(await file.arrayBuffer(), { contract })
    : parseCsvToGrid(decodeImportCsvText(await file.arrayBuffer()), { contract })

  const validation = validateImportGrid(grid, contract, {
    duplicateKeyField: '__none__',
  })
  const fileErrors = validation.errors
    .filter((e) => e.lineNumber === 0)
    .map((e) => e.message)
  if (fileErrors.length) {
    return { products: [], applications: [], delimiter: grid.delimiter, fileErrors }
  }

  const { productMapped, applicationMapped } = splitHfMappedRows(validation.mapped)

  const existing = new Map<string, string>()
  for (const r of productMapped) {
    const sku = (r.values.sku ?? '').trim()
    if (!sku || existing.has(sku.toLowerCase())) continue
    const id = await adminFindProductIdBySku(sku)
    if (id) existing.set(sku.toLowerCase(), id)
  }

  const publishedCats = (await adminListCategories())
    .filter((c) => c.status === 'published')
    .map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      parentId: c.parentId ?? null,
    }))
  const products = enforceExistingCategories(
    consolidateProductRows(productMapped, existing),
    publishedCats,
  ).map((r) => ({
    ...r,
    line: r.lineNumber,
    ok: r.applyable,
    errors: r.action === 'error' ? [r.message] : [],
  }))

  // Prévia de apps: inclui SKUs que serão criados nesta sessão (ainda não no DB)
  const catalogs = await loadCatalogsForSkus(
    applicationMapped.map((r) => r.values.sku ?? ''),
  )
  for (const p of products) {
    if (p.applyable && !catalogs.productsBySku.has(p.sku.toLowerCase())) {
      catalogs.productsBySku.set(p.sku.toLowerCase(), {
        id: p.productId ?? `pending:${p.sku}`,
        name: p.name,
      })
    }
  }

  const applications = analyzeApplicationMappedRows(applicationMapped, catalogs)

  return {
    products,
    applications,
    delimiter: grid.delimiter,
    fileErrors: [],
  }
}

export async function adminCreateHfBundleImports(input: {
  filename: string
  createdBy?: string | null
  products: CatalogImportPreviewRow[]
  applications: ApplicationPreviewRow[]
}): Promise<{ productImportId: string; applicationImportId: string }> {
  const productImportId = await adminCreateCatalogImport({
    filename: `${input.filename} [produtos]`,
    createdBy: input.createdBy,
    rows: input.products,
  })
  const applicationImportId = await adminCreateApplicationsImport({
    filename: `${input.filename} [aplicacoes]`,
    createdBy: input.createdBy,
    rows: input.applications,
  })
  return { productImportId, applicationImportId }
}

export type HfBundleApplyResult = {
  products: CatalogImportApplyResult
  applications: ApplicationsImportApplyResult | null
  applicationsError: string | null
}

/** Apply sequencial: produtos → aplicações. */
export async function adminApplyHfBundleImport(input: {
  productImportId: string
  applicationImportId: string
}): Promise<HfBundleApplyResult> {
  const products = await adminApplyCatalogImport(input.productImportId)
  try {
    // Payloads de aplicação com product_id null; RPC resolve SKU após produtos gravados.
    const applications = await adminApplyApplicationsImport(input.applicationImportId)
    return { products, applications, applicationsError: null }
  } catch (err) {
    return {
      products,
      applications: null,
      applicationsError:
        err instanceof Error
          ? err.message
          : 'Cadastro gravado; aplicações não aplicadas — reimporte só aplicações.',
    }
  }
}
