import { getSupabase } from '@/lib/supabase'
import { getImportContract } from '@/services/import/contracts'
import { decodeImportCsvText } from '@/services/import/decodeImportCsvText'
import { parseCsvToGrid } from '@/services/import/parseCsv'
import { parseXlsxToGrid } from '@/services/import/parseXlsx'
import { validateImportGrid } from '@/services/import/validate'
import type { ImportGrid } from '@/services/import/types'

export type ConversionImportPreviewRow = {
  line: number
  sku: string
  supplierSku: string
  action: 'create' | 'update' | null
  productId: string | null
  errors: string[]
  warnings: string[]
  ok: boolean
}

export type ConversionImportApplyResult = {
  created: number
  updated: number
  failed: number
  skipped: number
}

async function parseConversionFile(file: File): Promise<ImportGrid> {
  const contract = getImportContract('supplier_conversion')
  const lower = file.name.toLowerCase()
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
    return parseXlsxToGrid(await file.arrayBuffer(), { contract })
  }
  return parseCsvToGrid(decodeImportCsvText(await file.arrayBuffer()), { contract })
}

async function loadSkuMap(skus: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  const unique = [...new Set(skus.map((s) => s.trim()).filter(Boolean))]
  if (unique.length === 0) return map

  // Chunk para evitar URL muito longa no .in()
  const chunkSize = 200
  const sb = getSupabase()
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize)
    const { data, error } = await sb.from('products').select('id, sku').in('sku', chunk)
    if (error) throw error
    for (const row of data ?? []) {
      map.set(String(row.sku), String(row.id))
    }
  }
  return map
}

async function loadExistingConversions(
  supplierId: string,
  supplierSkus: string[],
  productIds: string[],
): Promise<{ bySupplierSku: Map<string, string>; byProductId: Map<string, string> }> {
  const bySupplierSku = new Map<string, string>()
  const byProductId = new Map<string, string>()
  const sb = getSupabase()

  const skuUnique = [...new Set(supplierSkus.map((s) => s.trim()).filter(Boolean))]
  const productUnique = [...new Set(productIds.filter(Boolean))]

  if (skuUnique.length) {
    const chunkSize = 200
    for (let i = 0; i < skuUnique.length; i += chunkSize) {
      const chunk = skuUnique.slice(i, i + chunkSize)
      const { data, error } = await sb
        .from('supplier_products')
        .select('id, supplier_sku, product_id')
        .eq('supplier_id', supplierId)
        .in('supplier_sku', chunk)
      if (error) throw error
      for (const row of data ?? []) {
        if (row.supplier_sku) bySupplierSku.set(String(row.supplier_sku), String(row.product_id))
      }
    }
  }

  if (productUnique.length) {
    const chunkSize = 200
    for (let i = 0; i < productUnique.length; i += chunkSize) {
      const chunk = productUnique.slice(i, i + chunkSize)
      const { data, error } = await sb
        .from('supplier_products')
        .select('id, supplier_sku, product_id')
        .eq('supplier_id', supplierId)
        .in('product_id', chunk)
      if (error) throw error
      for (const row of data ?? []) {
        byProductId.set(String(row.product_id), String(row.supplier_sku ?? ''))
      }
    }
  }

  return { bySupplierSku, byProductId }
}

/**
 * Preview estrutural + lookup SKU FAL.
 * SKU inexistente = erro (não cria produto).
 * Não grava conversões.
 */
export async function adminPreviewConversionImport(input: {
  file: File
  supplierId: string
}): Promise<{
  rows: ConversionImportPreviewRow[]
  delimiter: string | null
  fileErrors: string[]
}> {
  if (!input.supplierId) {
    return { rows: [], delimiter: null, fileErrors: ['Selecione o fornecedor'] }
  }

  const contract = getImportContract('supplier_conversion')
  const grid = await parseConversionFile(input.file)
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

  const skuMap = await loadSkuMap(validation.mapped.map((m) => m.values.sku ?? ''))

  const candidateProductIds: string[] = []
  const candidateSupplierSkus: string[] = []
  for (const mapped of validation.mapped) {
    const sku = (mapped.values.sku ?? '').trim()
    const supplierSku = (mapped.values.supplier_sku ?? '').trim()
    const pid = skuMap.get(sku)
    if (pid) candidateProductIds.push(pid)
    if (supplierSku) candidateSupplierSkus.push(supplierSku)
  }

  const existing = await loadExistingConversions(
    input.supplierId,
    candidateSupplierSkus,
    candidateProductIds,
  )

  const rows: ConversionImportPreviewRow[] = []
  for (const mapped of validation.mapped) {
    const sku = (mapped.values.sku ?? '').trim()
    const supplierSku = (mapped.values.supplier_sku ?? '').trim()
    const lineErrors = [...(errorsByLine.get(mapped.lineNumber) ?? [])]
    let productId: string | null = null
    let action: 'create' | 'update' | null = null
    const warnings: string[] = []

    if (lineErrors.length === 0) {
      productId = skuMap.get(sku) ?? null
      if (!productId) {
        lineErrors.push('Produto não encontrado (SKU FAL inexistente)')
      } else {
        const bySku = existing.bySupplierSku.has(supplierSku)
        const byProduct = existing.byProductId.has(productId)
        action = bySku || byProduct ? 'update' : 'create'
        if (bySku && existing.bySupplierSku.get(supplierSku) !== productId) {
          warnings.push('Código do fornecedor já associado a outro produto — será remapeado')
        }
      }
    }

    rows.push({
      line: mapped.lineNumber,
      sku,
      supplierSku,
      action,
      productId,
      errors: lineErrors,
      warnings,
      ok: lineErrors.length === 0,
    })
  }

  return { rows, delimiter: grid.delimiter, fileErrors: [] }
}

export async function adminCreateConversionImport(input: {
  filename: string
  supplierId: string
  createdBy?: string | null
  rows: ConversionImportPreviewRow[]
}): Promise<string> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('imports')
    .insert({
      filename: input.filename,
      status: 'preview',
      kind: 'supplier_conversion',
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
      sku: r.sku,
      supplier_sku: r.supplierSku,
      product_id: r.productId,
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

export async function adminApplyConversionImport(
  importId: string,
): Promise<ConversionImportApplyResult> {
  const sb = getSupabase()
  const { data, error } = await sb.rpc('apply_supplier_conversion_import', {
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

