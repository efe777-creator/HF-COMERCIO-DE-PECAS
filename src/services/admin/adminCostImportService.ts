import { parseMoneyBr } from '@/lib/money'
import { getSupabase } from '@/lib/supabase'
import { getImportContract } from '@/services/import/contracts'
import { decodeImportCsvText } from '@/services/import/decodeImportCsvText'
import { parseCsvToGrid } from '@/services/import/parseCsv'
import { parseXlsxToGrid } from '@/services/import/parseXlsx'
import { validateImportGrid } from '@/services/import/validate'
import type { ImportGrid } from '@/services/import/types'

/** Código do fornecedor próprio FAL — codigo_fornecedor = products.sku. */
export const HF_PRINCIPAL_SUPPLIER_CODE = 'HF-SUP-01'
/** @deprecated use HF_PRINCIPAL_SUPPLIER_CODE */
export const FAL_PRINCIPAL_SUPPLIER_CODE = HF_PRINCIPAL_SUPPLIER_CODE

export type CostImportPreviewRow = {
  line: number
  supplierSku: string
  cost: number | null
  costRaw: string
  oldCost: number | null
  productId: string | null
  productSku: string | null
  action: 'update' | 'create' | null
  errors: string[]
  warnings: string[]
  ok: boolean
}

export type CostImportApplyResult = {
  created: number
  updated: number
  failed: number
  skipped: number
}

type ConversionRow = {
  id: string
  supplier_sku: string | null
  product_id: string
  cost: number | null
  products?: { sku: string } | { sku: string }[] | null
}

async function parseCostFile(file: File): Promise<ImportGrid> {
  const contract = getImportContract('supplier_cost')
  const lower = file.name.toLowerCase()
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
    return parseXlsxToGrid(await file.arrayBuffer(), { contract })
  }
  return parseCsvToGrid(decodeImportCsvText(await file.arrayBuffer()), { contract })
}

function productSkuFromJoin(
  products: ConversionRow['products'],
): string | null {
  if (!products) return null
  const row = Array.isArray(products) ? products[0] : products
  return row?.sku ? String(row.sku) : null
}

export function isHfPrincipalSupplier(code: string | null | undefined): boolean {
  return (code ?? '').trim().toUpperCase() === HF_PRINCIPAL_SUPPLIER_CODE
}
/** @deprecated use isHfPrincipalSupplier */
export const isFalPrincipalSupplier = isHfPrincipalSupplier

async function loadSupplierCode(supplierId: string): Promise<string | null> {
  const { data, error } = await getSupabase()
    .from('suppliers')
    .select('code')
    .eq('id', supplierId)
    .maybeSingle()
  if (error) throw error
  return (data?.code as string | null) ?? null
}

async function loadConversionsBySupplierSku(
  supplierId: string,
  supplierSkus: string[],
): Promise<Map<string, { productId: string; productSku: string | null; cost: number | null }>> {
  const map = new Map<
    string,
    { productId: string; productSku: string | null; cost: number | null }
  >()
  const unique = [...new Set(supplierSkus.map((s) => s.trim()).filter(Boolean))]
  if (!unique.length) return map

  const sb = getSupabase()
  const chunkSize = 200
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize)
    const { data, error } = await sb
      .from('supplier_products')
      .select('id, supplier_sku, product_id, cost, products ( sku )')
      .eq('supplier_id', supplierId)
      .in('supplier_sku', chunk)
    if (error) throw error
    for (const row of (data ?? []) as ConversionRow[]) {
      if (!row.supplier_sku) continue
      map.set(String(row.supplier_sku), {
        productId: String(row.product_id),
        productSku: productSkuFromJoin(row.products),
        cost: row.cost == null ? null : Number(row.cost),
      })
    }
  }
  return map
}

/** Match products.sku = codigo (HF Principal). Inclui custo atual se já houver vínculo. */
async function loadProductsBySkuForFal(
  supplierId: string,
  skus: string[],
): Promise<
  Map<string, { productId: string; productSku: string; cost: number | null; hasLink: boolean }>
> {
  const map = new Map<
    string,
    { productId: string; productSku: string; cost: number | null; hasLink: boolean }
  >()
  const unique = [...new Set(skus.map((s) => s.trim()).filter(Boolean))]
  if (!unique.length) return map

  const sb = getSupabase()
  const chunkSize = 200
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize)
    const { data, error } = await sb.from('products').select('id, sku').in('sku', chunk)
    if (error) throw error
    const productIds = (data ?? []).map((p) => String(p.id))
    const costByProduct = new Map<string, number | null>()
    if (productIds.length) {
      const { data: links, error: linkErr } = await sb
        .from('supplier_products')
        .select('product_id, cost')
        .eq('supplier_id', supplierId)
        .in('product_id', productIds)
      if (linkErr) throw linkErr
      for (const row of links ?? []) {
        costByProduct.set(
          String(row.product_id),
          row.cost == null ? null : Number(row.cost),
        )
      }
    }
    for (const row of data ?? []) {
      const productId = String(row.id)
      const sku = String(row.sku)
      map.set(sku, {
        productId,
        productSku: sku,
        cost: costByProduct.get(productId) ?? null,
        hasLink: costByProduct.has(productId),
      })
    }
  }
  return map
}

/**
 * Preview: resolve conversão por código do fornecedor.
 * HF-SUP-01: codigo = products.sku (sem exigir conversão prévia).
 * Demais: sem conversão = erro.
 */
export async function adminPreviewCostImport(input: {
  file: File
  supplierId: string
}): Promise<{
  rows: CostImportPreviewRow[]
  delimiter: string | null
  fileErrors: string[]
}> {
  if (!input.supplierId) {
    return { rows: [], delimiter: null, fileErrors: ['Selecione o fornecedor'] }
  }

  const contract = getImportContract('supplier_cost')
  const grid = await parseCostFile(input.file)
  const validation = validateImportGrid(grid, contract, {
    duplicateKeyField: 'supplier_sku',
  })

  const fileErrors = validation.errors
    .filter((e) => e.lineNumber === 0)
    .map((e) => e.message)

  if (fileErrors.length > 0) {
    return { rows: [], delimiter: grid.delimiter, fileErrors }
  }

  const errorsByLine = new Map<number, string[]>()
  for (const e of validation.errors) {
    if (e.lineNumber === 0) continue
    const list = errorsByLine.get(e.lineNumber) ?? []
    list.push(e.message)
    errorsByLine.set(e.lineNumber, list)
  }

  const supplierCode = await loadSupplierCode(input.supplierId)
  const falPrincipal = isHfPrincipalSupplier(supplierCode)
  const skus = validation.mapped.map((m) => m.values.supplier_sku ?? '')

  const conversions = await loadConversionsBySupplierSku(input.supplierId, skus)
  const falBySku = falPrincipal
    ? await loadProductsBySkuForFal(input.supplierId, skus)
    : null

  const rows: CostImportPreviewRow[] = []
  for (const mapped of validation.mapped) {
    const supplierSku = (mapped.values.supplier_sku ?? '').trim()
    const costRaw = (mapped.values.cost ?? '').trim()
    const cost = parseMoneyBr(costRaw)
    const lineErrors = [...(errorsByLine.get(mapped.lineNumber) ?? [])]
    const warnings: string[] = []
    let productId: string | null = null
    let productSku: string | null = null
    let oldCost: number | null = null
    let action: 'update' | 'create' | null = null

    if (lineErrors.length === 0) {
      if (cost == null || cost < 0) {
        lineErrors.push('Custo inválido')
      } else {
        const conv = conversions.get(supplierSku)
        if (conv) {
          productId = conv.productId
          productSku = conv.productSku
          oldCost = conv.cost
          action = 'update'
        } else if (falPrincipal && falBySku) {
          const hit = falBySku.get(supplierSku)
          if (!hit) {
            lineErrors.push('SKU FAL não encontrado (HF Principal)')
          } else {
            productId = hit.productId
            productSku = hit.productSku
            oldCost = hit.cost
            action = hit.hasLink ? 'update' : 'create'
            if (!hit.hasLink) {
              warnings.push('Vínculo FAL será criado (código = SKU)')
            }
          }
        } else {
          lineErrors.push('Sem conversão: código fornecedor não vinculado a produto FAL')
        }
      }
    }

    rows.push({
      line: mapped.lineNumber,
      supplierSku,
      cost,
      costRaw,
      oldCost,
      productId,
      productSku,
      action,
      errors: lineErrors,
      warnings,
      ok: lineErrors.length === 0,
    })
  }

  return { rows, delimiter: grid.delimiter, fileErrors: [] }
}

export async function adminCreateCostImport(input: {
  filename: string
  supplierId: string
  createdBy?: string | null
  rows: CostImportPreviewRow[]
}): Promise<string> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('imports')
    .insert({
      filename: input.filename,
      status: 'preview',
      kind: 'supplier_cost',
      supplier_id: input.supplierId,
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
    line_number: r.line,
    errors: r.errors,
    warnings: r.warnings,
    payload: {
      supplier_sku: r.supplierSku,
      cost: r.cost,
      old_cost: r.oldCost,
      product_id: r.productId,
      product_sku: r.productSku,
      action: r.action,
      supplier_id: input.supplierId,
    },
    result: r.ok ? 'ok' : 'error',
  }))
  if (items.length) {
    const { error: itemsErr } = await sb.from('import_items').insert(items)
    if (itemsErr) throw itemsErr
  }
  return importId
}

export async function adminApplyCostImport(importId: string): Promise<CostImportApplyResult> {
  const sb = getSupabase()
  const { data, error } = await sb.rpc('apply_supplier_cost_import', {
    p_import_id: importId,
  })
  if (error) throw error
  const report = (data ?? {}) as Record<string, unknown>
  return {
    created: Number(report.created ?? 0),
    updated: Number(report.updated ?? 0),
    failed: Number(report.failed ?? 0),
    skipped: Number(report.skipped ?? 0),
  }
}

/**
 * Garante products.supplier_id = HF Principal quando ainda NULL
 * (elo formação / UI de custo). Idempotente.
 */
export async function adminEnsurePrincipalSupplier(productIds: string[]): Promise<number> {
  const unique = [...new Set(productIds.filter(Boolean))]
  if (!unique.length) return 0
  const sb = getSupabase()
  const { data: fal, error: falErr } = await sb
    .from('suppliers')
    .select('id')
    .eq('code', HF_PRINCIPAL_SUPPLIER_CODE)
    .eq('status', 'active')
    .maybeSingle()
  if (falErr) throw falErr
  if (!fal?.id) return 0

  const { data, error } = await sb
    .from('products')
    .update({ supplier_id: fal.id })
    .in('id', unique)
    .is('supplier_id', null)
    .select('id')
  if (error) throw error
  return (data ?? []).length
}

