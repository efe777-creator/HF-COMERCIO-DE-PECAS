import { parseMoneyBr } from '@/lib/money'
import { getSupabase } from '@/lib/supabase'
import { toSlug } from '@/lib/slug'
import { FAL_PRINCIPAL_SUPPLIER_CODE } from '@/services/admin/adminCostImportService'
import { getImportContract } from '@/services/import/contracts'
import { decodeImportCsvText } from '@/services/import/decodeImportCsvText'
import { parseCsvToGrid } from '@/services/import/parseCsv'
import { parseXlsxToGrid } from '@/services/import/parseXlsx'
import { validateImportGrid } from '@/services/import/validate'
import {
  calculateSellPrice,
  computeCostTotal,
  effectiveMarginFraction,
  effectiveMarkupFraction,
  toPercent,
  type PricingMethod,
} from '@/services/pricing/pricingFormulas'

/** Custo do fornecedor do produto; se NULL, fallback FAL-SUP-01. */
export function resolveBaseCost(
  productId: string,
  supplierId: string | null | undefined,
  costMap: Map<string, number>,
  falSupplierId: string | null,
): number | null {
  if (supplierId) {
    const direct = costMap.get(`${supplierId}:${productId}`)
    if (direct != null) return direct
  }
  if (falSupplierId) {
    const fal = costMap.get(`${falSupplierId}:${productId}`)
    if (fal != null) return fal
  }
  return null
}

export type PriceListStatus = 'draft' | 'active' | 'inactive'
export type PriceListScope = 'public' | 'assigned'
export type PriceOrigin = 'calculated' | 'imported' | 'manual'

export interface PriceList {
  id: string
  name: string
  slug: string
  description?: string | null
  status: PriceListStatus
  scope: PriceListScope
  priority: number
  validFrom?: string | null
  validUntil?: string | null
  isDefault: boolean
  pricingMethod: PricingMethod
  pricingPercent: number
  roundingMode: string
  /** Placeholder R$ da lista — NÃO remover; fora do cálculo atual. */
  listExtraCost: number
  /**
   * Adicional de custo (%) da lista (campo paralelo a listExtraCost).
   * Persistência/cálculo SQL ativos após migration prepared.
   */
  listExtraCostPercent: number
  itemCount?: number
  createdAt?: string
  updatedAt?: string
}

export interface PriceListItem {
  id: string
  priceListId: string
  productId: string
  price: number
  extraCost: number
  priceOrigin: PriceOrigin
  calculatedPrice: number | null
  /** Custo base: supplier_products.cost do products.supplier_id */
  baseCost: number | null
  /** base + extra_cost (list_extra_cost NÃO entra) */
  costTotal: number | null
  effectiveMarginPct: number | null
  effectiveMarkupPct: number | null
  sku?: string
  productName?: string
  manufacturerCode?: string | null
  supplierId?: string | null
  supplierName?: string | null
  hasOverride?: boolean
  updatedAt?: string
}

export type PriceListItemSortKey =
  | 'sku'
  | 'description'
  | 'cost'
  | 'price'
  | 'margin'
  | 'markup'
  | 'origin'
  | 'updatedAt'

export type PriceListItemFilterInput = {
  /** Busca unificada: SKU, descrição ou código fabricante (F8.2). */
  q?: string
  sku?: string
  description?: string
  origin?: PriceOrigin | ''
  withoutCost?: boolean
  withoutPrice?: boolean
  onlyCalculated?: boolean
  withOverride?: boolean
  supplierId?: string | ''
}

export type PriceListStats = {
  total: number
  calculated: number
  imported: number
  manual: number
  withoutCost: number
  withoutPrice: number
}

/** Linha da home F8.1-I com contagens por lista. */
export type PriceListOverviewRow = PriceList & {
  withPriceCount: number
  withoutPriceCount: number
}

/** Cards + tabela da visão geral `/admin/precos`. */
export type PriceListsOverview = {
  lists: PriceListOverviewRow[]
  activeLists: number
  totalItems: number
  withPrice: number
  withoutPrice: number
}

/** Contagens a partir de linhas brutas de price_list_items (sem tabela paralela). */
export function aggregatePriceListItemCounts(
  rows: Array<{ priceListId: string; price: number }>,
): Map<string, { total: number; withPrice: number; withoutPrice: number }> {
  const map = new Map<string, { total: number; withPrice: number; withoutPrice: number }>()
  for (const row of rows) {
    const cur = map.get(row.priceListId) ?? { total: 0, withPrice: 0, withoutPrice: 0 }
    cur.total += 1
    if (row.price > 0) cur.withPrice += 1
    else cur.withoutPrice += 1
    map.set(row.priceListId, cur)
  }
  return map
}

export function buildPriceListsOverview(
  lists: PriceList[],
  itemRows: Array<{ priceListId: string; price: number }>,
): PriceListsOverview {
  const counts = aggregatePriceListItemCounts(itemRows)
  const overviewLists: PriceListOverviewRow[] = lists.map((list) => {
    const c = counts.get(list.id) ?? { total: 0, withPrice: 0, withoutPrice: 0 }
    return {
      ...list,
      itemCount: c.total,
      withPriceCount: c.withPrice,
      withoutPriceCount: c.withoutPrice,
    }
  })

  let totalItems = 0
  let withPrice = 0
  let withoutPrice = 0
  for (const c of counts.values()) {
    totalItems += c.total
    withPrice += c.withPrice
    withoutPrice += c.withoutPrice
  }

  return {
    lists: overviewLists,
    activeLists: lists.filter((l) => l.status === 'active').length,
    totalItems,
    withPrice,
    withoutPrice,
  }
}

export function priceListStatusLabel(status: PriceListStatus): string {
  if (status === 'active') return 'Ativa'
  if (status === 'inactive') return 'Inativa'
  return 'Rascunho'
}

export function pricingMethodLabel(method: PricingMethod): string {
  if (method === 'margin_on_sell') return 'Margem'
  if (method === 'markup_on_cost') return 'Markup'
  return 'Fixo'
}

/** Regra exibida na tabela (não confundir com price_origin). */
export function pricingRuleLabel(method: PricingMethod, percent: number): string {
  if (method === 'fixed') return '—'
  const n = Number(percent)
  if (!Number.isFinite(n)) return '—'
  if (method === 'markup_on_cost') {
    // UI operacional: fator 1,XX quando percent é acréscimo (ex. 50 → 1,50)
    const factor = 1 + n / 100
    return factor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  return `${n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`
}

export function formatDuplicatePriceListName(name: string): string {
  const base = name.trim() || 'Lista'
  if (/\(cópia\)$/i.test(base)) return base
  return `${base} (cópia)`
}

/** Gera slug único a partir do base, evitando colisão com slugs existentes. */
export function buildUniquePriceListSlug(baseSlug: string, existingSlugs: Iterable<string>): string {
  const taken = new Set(
    [...existingSlugs].map((s) => s.trim().toLowerCase()).filter(Boolean),
  )
  const root = (baseSlug.trim() || 'lista').toLowerCase()
  if (!taken.has(root)) return root
  let n = 2
  while (taken.has(`${root}-${n}`)) n += 1
  return `${root}-${n}`
}

export interface PriceChangeHistoryRow {
  id: string
  productId: string
  priceListId: string
  oldPrice: number | null
  newPrice: number
  source: 'manual' | 'import' | 'system' | 'override' | 'bulk_adjust' | 'recalculate'
  importId?: string | null
  createdAt: string
  sku?: string
}

/** Sem % — fallback enquanto prepared 20261006160000 não estiver aplicada. */
const LIST_SELECT_BASE =
  'id, name, slug, description, status, scope, priority, valid_from, valid_until, is_default, pricing_method, pricing_percent, rounding_mode, list_extra_cost, created_at, updated_at'

/** Inclui adicional de custo (%) da lista (Opção A). */
const LIST_SELECT = `${LIST_SELECT_BASE}, list_extra_cost_percent`

function isMissingListExtraCostPercentColumn(error: {
  message?: string
  code?: string
  details?: string
} | null): boolean {
  if (!error) return false
  const msg = `${error.message ?? ''} ${error.code ?? ''} ${error.details ?? ''}`.toLowerCase()
  return (
    msg.includes('list_extra_cost_percent') ||
    msg.includes('schema cache') ||
    msg.includes('pgrst204') ||
    error.code === 'PGRST204' ||
    error.code === '42703'
  )
}

type PgErr = { message?: string; code?: string; details?: string } | null

/**
 * Tenta SELECT com list_extra_cost_percent; se a coluna prepared ainda não existir,
 * repete sem ela (listExtraCostPercent fica 0 via mapList).
 */
async function selectPriceListsWithPercentFallback<T>(
  execute: (columns: string) => PromiseLike<{ data: T; error: PgErr }>,
): Promise<{ data: T; error: PgErr }> {
  const first = await execute(LIST_SELECT)
  if (!first.error || !isMissingListExtraCostPercentColumn(first.error)) {
    return first
  }
  return execute(LIST_SELECT_BASE)
}

function mapList(row: Record<string, unknown>, itemCount?: number): PriceList {
  return {
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    description: (row.description as string | null) ?? null,
    status: row.status as PriceListStatus,
    scope: row.scope as PriceListScope,
    priority: Number(row.priority),
    validFrom: (row.valid_from as string | null) ?? null,
    validUntil: (row.valid_until as string | null) ?? null,
    isDefault: Boolean(row.is_default),
    pricingMethod: (row.pricing_method as PricingMethod) || 'fixed',
    pricingPercent: Number(row.pricing_percent ?? 0),
    roundingMode: String(row.rounding_mode ?? 'two_decimals'),
    listExtraCost: Number(row.list_extra_cost ?? 0),
    listExtraCostPercent: Number(
      (row as { list_extra_cost_percent?: unknown }).list_extra_cost_percent ?? 0,
    ),
    itemCount,
    createdAt: row.created_at as string | undefined,
    updatedAt: row.updated_at as string | undefined,
  }
}

export async function adminListPriceLists(): Promise<PriceList[]> {
  const overview = await adminGetPriceListsOverview()
  return overview.lists
}

/** Visão geral F8.1-I: listas + cards (agrega price_list_items existentes). */
export async function adminGetPriceListsOverview(): Promise<PriceListsOverview> {
  const sb = getSupabase()
  const { data, error } = await selectPriceListsWithPercentFallback((columns) =>
    sb.from('price_lists').select(columns).order('priority', { ascending: false }),
  )
  if (error) throw error

  const lists = (data ?? []).map((r) => mapList(r as unknown as Record<string, unknown>))
  if (!lists.length) {
    return { lists: [], activeLists: 0, totalItems: 0, withPrice: 0, withoutPrice: 0 }
  }

  const { data: itemRows, error: itemsError } = await sb
    .from('price_list_items')
    .select('price_list_id, price')
  if (itemsError) throw itemsError

  const mapped = (itemRows ?? []).map((r) => ({
    priceListId: String((r as { price_list_id: string }).price_list_id),
    price: Number((r as { price: number }).price),
  }))

  return buildPriceListsOverview(lists, mapped)
}

export async function adminGetPriceList(id: string): Promise<PriceList | null> {
  const { data, error } = await selectPriceListsWithPercentFallback((columns) =>
    getSupabase().from('price_lists').select(columns).eq('id', id).maybeSingle(),
  )
  if (error) throw error
  if (!data) return null
  return mapList(data as unknown as Record<string, unknown>)
}

export async function adminUpsertPriceList(input: {
  id?: string
  name: string
  slug?: string
  description?: string | null
  status: PriceListStatus
  scope?: PriceListScope
  priority?: number
  validFrom?: string | null
  validUntil?: string | null
  isDefault?: boolean
  /** Formação (colunas da lista). Não altera price_origin dos itens. */
  pricingMethod?: PricingMethod
  pricingPercent?: number
}): Promise<PriceList> {
  const sb = getSupabase()
  const method = input.pricingMethod ?? 'fixed'
  const percent =
    method === 'fixed' ? 0 : Number.isFinite(Number(input.pricingPercent)) ? Number(input.pricingPercent) : 0

  const payload: Record<string, unknown> = {
    name: input.name.trim(),
    slug: (input.slug?.trim() || toSlug(input.name)).trim(),
    description: input.description?.trim() || null,
    status: input.status,
    scope: input.scope ?? 'public',
    priority: input.priority ?? 0,
    valid_from: input.validFrom || null,
    valid_until: input.validUntil || null,
    is_default: Boolean(input.isDefault),
  }

  if (input.pricingMethod != null || input.id == null) {
    payload.pricing_method = method
    payload.pricing_percent = percent
  }

  if (payload.is_default) {
    await sb.from('price_lists').update({ is_default: false }).neq('id', input.id ?? '00000000-0000-0000-0000-000000000000')
  }

  const { data, error } = await selectPriceListsWithPercentFallback((columns) =>
    input.id
      ? sb.from('price_lists').update(payload).eq('id', input.id).select(columns).single()
      : sb.from('price_lists').insert(payload).select(columns).single(),
  )
  if (error) throw error
  return mapList(data as unknown as Record<string, unknown>)
}

/**
 * Grava adicional de custo (%) da lista (coluna list_extra_cost_percent).
 * Não altera list_extra_cost (R$).
 * Se a migration prepared ainda não foi aplicada, retorna pendingMigration.
 */
export async function adminSaveListExtraCostPercent(
  priceListId: string,
  percent: number,
): Promise<{ saved: boolean; pendingMigration?: boolean }> {
  const n = Number(percent)
  if (!Number.isFinite(n) || n < 0) {
    throw new Error('Adicional de custo (%) inválido')
  }
  const { error } = await getSupabase()
    .from('price_lists')
    .update({ list_extra_cost_percent: n })
    .eq('id', priceListId)
  if (error) {
    const msg = `${error.message ?? ''} ${error.code ?? ''} ${error.details ?? ''}`.toLowerCase()
    if (
      msg.includes('list_extra_cost_percent') ||
      msg.includes('schema cache') ||
      msg.includes('pgrst204') ||
      error.code === 'PGRST204' ||
      error.code === '42703'
    ) {
      return { saved: false, pendingMigration: true }
    }
    throw error
  }
  return { saved: true }
}

/** Exclui a lista; itens seguem ON DELETE CASCADE. */
export async function adminDeletePriceList(id: string): Promise<void> {
  const { error } = await getSupabase().from('price_lists').delete().eq('id', id)
  if (error) throw error
}

/**
 * Duplica lista + itens.
 * - slug único, is_default=false
 * - copia pricing_* e preço/origem dos itens
 * - NÃO recalcula
 */
export async function adminDuplicatePriceList(id: string): Promise<PriceList> {
  const sb = getSupabase()
  const source = await adminGetPriceList(id)
  if (!source) throw new Error('Lista não encontrada')

  const { data: allLists, error: listsError } = await sb.from('price_lists').select('slug')
  if (listsError) throw listsError
  const existingSlugs = (allLists ?? []).map((r) => String((r as { slug: string }).slug))

  const copyName = formatDuplicatePriceListName(source.name)
  const slug = buildUniquePriceListSlug(toSlug(copyName), existingSlugs)

  const { data: created, error: createError } = await selectPriceListsWithPercentFallback((columns) =>
    sb
      .from('price_lists')
      .insert({
        name: copyName,
        slug,
        description: source.description ?? null,
        status: source.status,
        scope: source.scope,
        priority: source.priority,
        valid_from: source.validFrom ?? null,
        valid_until: source.validUntil ?? null,
        is_default: false,
        pricing_method: source.pricingMethod,
        pricing_percent: source.pricingPercent,
        rounding_mode: source.roundingMode,
        list_extra_cost: source.listExtraCost,
      })
      .select(columns)
      .single(),
  )
  if (createError) throw createError

  const newList = mapList(created as unknown as Record<string, unknown>)

  const { data: items, error: itemsError } = await sb
    .from('price_list_items')
    .select('product_id, price, extra_cost, price_origin, calculated_price')
    .eq('price_list_id', id)
  if (itemsError) throw itemsError

  const rows = (items ?? []).map((row) => {
    const r = row as Record<string, unknown>
    return {
      price_list_id: newList.id,
      product_id: String(r.product_id),
      price: Number(r.price),
      extra_cost: Number(r.extra_cost ?? 0),
      price_origin: (r.price_origin as PriceOrigin) || 'manual',
      calculated_price:
        r.calculated_price == null || r.calculated_price === ''
          ? null
          : Number(r.calculated_price),
    }
  })

  if (rows.length) {
    const chunk = 200
    for (let i = 0; i < rows.length; i += chunk) {
      const slice = rows.slice(i, i + chunk)
      const { error: insertError } = await sb.from('price_list_items').insert(slice)
      if (insertError) throw insertError
    }
  }

  return newList
}

export async function adminListPriceListItems(
  priceListId: string,
  q?: string,
): Promise<PriceListItem[]> {
  const { data, error } = await getSupabase()
    .from('price_list_items')
    .select(
      'id, price_list_id, product_id, price, extra_cost, price_origin, calculated_price, updated_at, products ( sku, name, supplier_id, manufacturer_code )',
    )
    .eq('price_list_id', priceListId)
    .order('updated_at', { ascending: false })
    .limit(5000)

  if (error) throw error

  const raw = data ?? []
  const productIds = raw.map((row) => String((row as Record<string, unknown>).product_id))
  const [costMap, falSupplierId] = await Promise.all([
    loadPrincipalCosts(productIds),
    loadFalPrincipalSupplierId(),
  ])

  const { data: listRow } = await getSupabase()
    .from('price_lists')
    .select('list_extra_cost_percent')
    .eq('id', priceListId)
    .maybeSingle()
  const listPct = Number(
    (listRow as { list_extra_cost_percent?: unknown } | null)?.list_extra_cost_percent ?? 0,
  )
  // Opção A: R$ da lista (list_extra_cost) NÃO entra — 3º arg sempre 0
  const listExtraCostRs = 0

  const supplierIds = [
    ...new Set(
      [
        ...raw.map((row) => {
          const r = row as Record<string, unknown>
          const prod = r.products as
            | { supplier_id?: string | null }
            | { supplier_id?: string | null }[]
            | null
          const p = Array.isArray(prod) ? prod[0] : prod
          return p?.supplier_id ?? null
        }),
        falSupplierId,
      ].filter((id): id is string => Boolean(id)),
    ),
  ]
  const supplierNames = await loadSupplierNames(supplierIds)

  let items = raw.map((row) => {
    const r = row as Record<string, unknown>
    const prod = r.products as
      | {
          sku?: string
          name?: string
          supplier_id?: string | null
          manufacturer_code?: string | null
        }
      | {
          sku?: string
          name?: string
          supplier_id?: string | null
          manufacturer_code?: string | null
        }[]
      | null
    const p = Array.isArray(prod) ? prod[0] : prod
    const productId = String(r.product_id)
    const supplierId = p?.supplier_id ?? null
    const baseCost = resolveBaseCost(productId, supplierId, costMap, falSupplierId)
    const effectiveSupplierId =
      supplierId ??
      (falSupplierId && costMap.has(`${falSupplierId}:${productId}`) ? falSupplierId : null)
    const extraCost = Number(r.extra_cost ?? 0)
    const costTotal =
      baseCost == null
        ? null
        : computeCostTotal(baseCost, extraCost, listExtraCostRs, listPct)
    const price = Number(r.price)
    return {
      id: String(r.id),
      priceListId: String(r.price_list_id),
      productId,
      price,
      extraCost,
      priceOrigin: (r.price_origin as PriceOrigin) || 'manual',
      calculatedPrice:
        r.calculated_price == null ? null : Number(r.calculated_price),
      baseCost,
      costTotal,
      effectiveMarginPct:
        costTotal == null ? null : toPercent(effectiveMarginFraction(price, costTotal)),
      effectiveMarkupPct:
        costTotal == null ? null : toPercent(effectiveMarkupFraction(price, costTotal)),
      sku: p?.sku,
      productName: p?.name,
      manufacturerCode: p?.manufacturer_code ?? null,
      supplierId: effectiveSupplierId,
      supplierName: effectiveSupplierId
        ? (supplierNames.get(effectiveSupplierId) ?? null)
        : null,
      updatedAt: r.updated_at as string | undefined,
    } satisfies PriceListItem
  })

  const term = q?.trim().toLowerCase()
  if (term) {
    items = items.filter(
      (i) =>
        i.sku?.toLowerCase().includes(term) ||
        i.productName?.toLowerCase().includes(term),
    )
  }
  return items
}

/** Indicadores da lista (estado real; leve — sem nomes de produto). */
export async function adminGetPriceListStats(priceListId: string): Promise<PriceListStats> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('price_list_items')
    .select('product_id, price, price_origin, products ( supplier_id )')
    .eq('price_list_id', priceListId)
  if (error) throw error

  const raw = data ?? []
  const productIds = raw.map((row) => String((row as Record<string, unknown>).product_id))
  const inList = new Set(productIds)
  const costMap = await loadPrincipalCosts(productIds)

  let calculated = 0
  let imported = 0
  let manual = 0
  let withoutCost = 0
  let withoutPrice = 0

  for (const row of raw) {
    const r = row as Record<string, unknown>
    const origin = (r.price_origin as PriceOrigin) || 'manual'
    if (origin === 'calculated') calculated += 1
    else if (origin === 'imported') imported += 1
    else manual += 1

    const price = Number(r.price)
    if (!(price > 0)) withoutPrice += 1

    const prod = r.products as
      | { supplier_id?: string | null }
      | { supplier_id?: string | null }[]
      | null
    const p = Array.isArray(prod) ? prod[0] : prod
    const supplierId = p?.supplier_id ?? null
    const productId = String(r.product_id)
    const hasCost =
      supplierId != null && costMap.has(`${supplierId}:${productId}`)
    if (!hasCost) withoutCost += 1
  }

  // Published fora da lista = sem preço nesta lista
  const { data: published, error: pubErr } = await sb
    .from('products')
    .select('id')
    .eq('status', 'published')
  if (pubErr) throw pubErr
  for (const row of published ?? []) {
    if (!inList.has(String(row.id))) withoutPrice += 1
  }

  return {
    total: raw.length,
    calculated,
    imported,
    manual,
    withoutCost,
    withoutPrice,
  }
}

export function isVirtualPriceListItemId(id: string): boolean {
  return id.startsWith('missing:')
}

export type SyncOntoPriceListResult = {
  created: number
  alreadyOnList: number
  skippedManual: number
  skippedImported: number
}

/**
 * Garante linhas na lista como calculated/price=0.
 * Não sobrescreve imported/manual. Não recalcula venda.
 */
export async function adminSyncProductsOntoPriceList(input: {
  priceListId: string
  productIds: string[]
}): Promise<SyncOntoPriceListResult> {
  const sb = getSupabase()
  const unique = [...new Set(input.productIds.filter(Boolean))]
  const result: SyncOntoPriceListResult = {
    created: 0,
    alreadyOnList: 0,
    skippedManual: 0,
    skippedImported: 0,
  }
  if (!unique.length) return result

  const chunkSize = 200
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize)
    const { data: existing, error } = await sb
      .from('price_list_items')
      .select('product_id, price_origin')
      .eq('price_list_id', input.priceListId)
      .in('product_id', chunk)
    if (error) throw error

    const byProduct = new Map(
      (existing ?? []).map((r) => [
        String(r.product_id),
        (r.price_origin as PriceOrigin) || 'manual',
      ]),
    )

    const toInsert: Array<{
      price_list_id: string
      product_id: string
      price: number
      price_origin: PriceOrigin
      extra_cost: number
    }> = []

    for (const productId of chunk) {
      const origin = byProduct.get(productId)
      if (!origin) {
        toInsert.push({
          price_list_id: input.priceListId,
          product_id: productId,
          price: 0,
          price_origin: 'calculated',
          extra_cost: 0,
        })
        continue
      }
      if (origin === 'manual') result.skippedManual += 1
      else if (origin === 'imported') result.skippedImported += 1
      else result.alreadyOnList += 1
    }

    if (toInsert.length) {
      const { error: insErr } = await sb.from('price_list_items').insert(toInsert)
      if (insErr) throw insErr
      result.created += toInsert.length
    }
  }
  return result
}

/** Published (opcionalmente só com custo principal) ausentes da lista → sync calculated/0. */
export async function adminMaterializePublishedOntoPriceList(input: {
  priceListId: string
  /** Se true, só produtos com custo no fornecedor principal. Default true. */
  onlyWithPrincipalCost?: boolean
}): Promise<SyncOntoPriceListResult> {
  const sb = getSupabase()
  const onlyCost = input.onlyWithPrincipalCost !== false

  const { data: listRows, error: listErr } = await sb
    .from('price_list_items')
    .select('product_id')
    .eq('price_list_id', input.priceListId)
  if (listErr) throw listErr
  const inList = new Set((listRows ?? []).map((r) => String(r.product_id)))

  const { data: published, error: pubErr } = await sb
    .from('products')
    .select('id, supplier_id')
    .eq('status', 'published')
    .limit(5000)
  if (pubErr) throw pubErr

  let candidates = (published ?? [])
    .map((p) => ({
      id: String(p.id),
      supplierId: (p.supplier_id as string | null) ?? null,
    }))
    .filter((p) => !inList.has(p.id))

  if (onlyCost && candidates.length) {
    const costMap = await loadPrincipalCosts(candidates.map((c) => c.id))
    candidates = candidates.filter(
      (c) => c.supplierId != null && costMap.has(`${c.supplierId}:${c.id}`),
    )
  }

  return adminSyncProductsOntoPriceList({
    priceListId: input.priceListId,
    productIds: candidates.map((c) => c.id),
  })
}

async function buildVirtualMissingItems(
  priceListId: string,
  inList: Set<string>,
): Promise<PriceListItem[]> {
  const sb = getSupabase()
  const { data: published, error: pubErr } = await sb
    .from('products')
    .select('id, sku, name, supplier_id, manufacturer_code')
    .eq('status', 'published')
    .order('sku')
    .limit(5000)
  if (pubErr) throw pubErr

  const missing = (published ?? []).filter((p) => !inList.has(String(p.id)))
  if (!missing.length) return []

  const missingIds = missing.map((p) => String(p.id))
  const [costMap, falSupplierId] = await Promise.all([
    loadPrincipalCosts(missingIds),
    loadFalPrincipalSupplierId(),
  ])
  const supplierIds = [
    ...new Set(
      [
        ...missing.map((p) => (p.supplier_id as string | null) ?? null),
        falSupplierId,
      ].filter((id): id is string => Boolean(id)),
    ),
  ]
  const supplierNames = await loadSupplierNames(supplierIds)

  const { data: listRow } = await sb
    .from('price_lists')
    .select('list_extra_cost_percent')
    .eq('id', priceListId)
    .maybeSingle()
  const listPct = Number(
    (listRow as { list_extra_cost_percent?: unknown } | null)?.list_extra_cost_percent ?? 0,
  )

  return missing.map((p) => {
    const productId = String(p.id)
    const supplierId = (p.supplier_id as string | null) ?? null
    const baseCost = resolveBaseCost(productId, supplierId, costMap, falSupplierId)
    const effectiveSupplierId =
      supplierId ??
      (falSupplierId && costMap.has(`${falSupplierId}:${productId}`) ? falSupplierId : null)
    const costTotal =
      baseCost == null ? null : computeCostTotal(baseCost, 0, 0, listPct)
    return {
      id: `missing:${productId}`,
      priceListId,
      productId,
      price: 0,
      extraCost: 0,
      priceOrigin: 'calculated' as PriceOrigin,
      calculatedPrice: null,
      baseCost,
      costTotal,
      effectiveMarginPct: null,
      effectiveMarkupPct: null,
      sku: String(p.sku),
      productName: String(p.name),
      manufacturerCode: (p.manufacturer_code as string | null) ?? null,
      supplierId: effectiveSupplierId,
      supplierName: effectiveSupplierId
        ? (supplierNames.get(effectiveSupplierId) ?? null)
        : null,
      updatedAt: undefined,
    }
  })
}

/**
 * Visão operacional: itens da lista + published ausentes (virtuais, preço 0).
 */
export async function adminListPriceListOperationalItems(
  priceListId: string,
): Promise<PriceListItem[]> {
  const onList = await adminListPriceListItems(priceListId)
  const inList = new Set(onList.map((i) => i.productId))
  const virtual = await buildVirtualMissingItems(priceListId, inList)
  return [...onList, ...virtual]
}

/**
 * Produtos sem preço nesta lista: itens com price<=0 + published ausentes.
 */
export async function adminListProductsWithoutPriceOnList(
  priceListId: string,
): Promise<PriceListItem[]> {
  const all = await adminListPriceListOperationalItems(priceListId)
  return all.filter((i) => !(i.price > 0))
}

export function filterPriceListItems(
  items: PriceListItem[],
  filters: PriceListItemFilterInput,
): PriceListItem[] {
  const qTerm = filters.q?.trim().toLowerCase() ?? ''
  const skuTerm = filters.sku?.trim().toLowerCase() ?? ''
  const descTerm = filters.description?.trim().toLowerCase() ?? ''

  return items.filter((item) => {
    if (qTerm) {
      const hay = [
        item.sku ?? '',
        item.productName ?? '',
        item.manufacturerCode ?? '',
      ]
        .join(' ')
        .toLowerCase()
      if (!hay.includes(qTerm)) return false
    }
    if (skuTerm && !(item.sku ?? '').toLowerCase().includes(skuTerm)) return false
    if (descTerm && !(item.productName ?? '').toLowerCase().includes(descTerm)) return false
    if (filters.origin && item.priceOrigin !== filters.origin) return false
    if (filters.onlyCalculated && item.priceOrigin !== 'calculated') return false
    if (filters.withoutCost && item.baseCost != null) return false
    if (filters.withoutPrice && item.price > 0) return false
    if (filters.withOverride && !item.hasOverride) return false
    if (filters.supplierId && item.supplierId !== filters.supplierId) return false
    return true
  })
}

export function sortPriceListItems(
  items: PriceListItem[],
  sortKey: PriceListItemSortKey,
  ascending: boolean,
): PriceListItem[] {
  const dir = ascending ? 1 : -1
  const originOrder: Record<PriceOrigin, number> = {
    calculated: 0,
    imported: 1,
    manual: 2,
  }
  const sorted = [...items]
  sorted.sort((a, b) => {
    let cmp = 0
    switch (sortKey) {
      case 'sku':
        cmp = (a.sku ?? '').localeCompare(b.sku ?? '', 'pt-BR', { sensitivity: 'base' })
        break
      case 'description':
        cmp = (a.productName ?? '').localeCompare(b.productName ?? '', 'pt-BR', {
          sensitivity: 'base',
        })
        break
      case 'cost':
        cmp = (a.costTotal ?? -1) - (b.costTotal ?? -1)
        break
      case 'price':
        cmp = a.price - b.price
        break
      case 'margin':
        cmp = (a.effectiveMarginPct ?? -999) - (b.effectiveMarginPct ?? -999)
        break
      case 'markup':
        cmp = (a.effectiveMarkupPct ?? -999) - (b.effectiveMarkupPct ?? -999)
        break
      case 'origin':
        cmp = originOrder[a.priceOrigin] - originOrder[b.priceOrigin]
        break
      case 'updatedAt':
        cmp = (a.updatedAt ?? '').localeCompare(b.updatedAt ?? '')
        break
      default:
        cmp = 0
    }
    return cmp * dir
  })
  return sorted
}

/** Exporta visão filtrada (CSV). Não altera preços. */
export function buildPriceListItemsCsv(items: PriceListItem[]): string {
  const header = [
    'sku',
    'descricao',
    'fornecedor',
    'custo_base',
    'extra_cost',
    'custo_total',
    'preco_venda',
    'margem_pct',
    'markup_pct',
    'origem',
    'atualizado_em',
    'override_avulso',
  ]
  const lines = [header.join(';')]
  for (const item of items) {
    lines.push(
      [
        csvCell(item.sku ?? ''),
        csvCell(item.productName ?? ''),
        csvCell(item.supplierName ?? ''),
        csvNum(item.baseCost),
        csvNum(item.extraCost),
        csvNum(item.costTotal),
        csvNum(item.price),
        csvNum(item.effectiveMarginPct),
        csvNum(item.effectiveMarkupPct),
        item.priceOrigin,
        item.updatedAt ?? '',
        item.hasOverride ? 'sim' : 'nao',
      ].join(';'),
    )
  }
  return lines.join('\n')
}

function csvCell(value: string): string {
  if (/[;"\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

function csvNum(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return ''
  return String(value).replace('.', ',')
}

async function loadSupplierNames(ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  const unique = [...new Set(ids.filter(Boolean))]
  if (!unique.length) return map
  const sb = getSupabase()
  const chunkSize = 200
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize)
    const { data, error } = await sb.from('suppliers').select('id, name').in('id', chunk)
    if (error) throw error
    for (const row of data ?? []) {
      map.set(String(row.id), String(row.name))
    }
  }
  return map
}

async function loadPrincipalCosts(
  productIds: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  const unique = [...new Set(productIds.filter(Boolean))]
  if (!unique.length) return map

  const sb = getSupabase()
  const chunkSize = 200
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize)
    const { data, error } = await sb
      .from('supplier_products')
      .select('supplier_id, product_id, cost')
      .in('product_id', chunk)
      .not('cost', 'is', null)
    if (error) throw error
    for (const row of data ?? []) {
      if (row.cost == null) continue
      map.set(`${row.supplier_id}:${row.product_id}`, Number(row.cost))
    }
  }
  return map
}

let falPrincipalSupplierIdCache: string | null | undefined

async function loadFalPrincipalSupplierId(): Promise<string | null> {
  if (falPrincipalSupplierIdCache !== undefined) return falPrincipalSupplierIdCache
  const { data, error } = await getSupabase()
    .from('suppliers')
    .select('id')
    .eq('code', FAL_PRINCIPAL_SUPPLIER_CODE)
    .eq('status', 'active')
    .maybeSingle()
  if (error) throw error
  falPrincipalSupplierIdCache = data?.id ? String(data.id) : null
  return falPrincipalSupplierIdCache
}

/** Preview do preço pela regra da lista (client-side, espelha SQL). */
export function previewCalculatedPrice(input: {
  baseCost: number | null
  extraCost: number
  method: PricingMethod
  percent: number
  /** Opção A: % da lista. R$ da lista não entra. */
  listExtraCostPercent?: number
}): { costTotal: number | null; price: number | null; error: string | null } {
  if (input.method === 'fixed') {
    return { costTotal: null, price: null, error: 'Lista em modo fixo' }
  }
  if (input.baseCost == null) {
    return {
      costTotal: null,
      price: null,
      error: 'Custo ausente (products.supplier_id + supplier_products.cost)',
    }
  }
  if (input.baseCost < 0 || input.extraCost < 0) {
    return { costTotal: null, price: null, error: 'Custo negativo' }
  }
  if (input.method === 'margin_on_sell' && input.percent >= 100) {
    return { costTotal: null, price: null, error: 'Margem deve ser < 100%' }
  }
  const costTotal = computeCostTotal(
    input.baseCost,
    input.extraCost,
    0,
    input.listExtraCostPercent ?? 0,
  )
  const price = calculateSellPrice(costTotal, input.method, input.percent)
  if (price == null) {
    return { costTotal, price: null, error: 'Não foi possível calcular o preço' }
  }
  return { costTotal, price, error: null }
}

export async function adminSetPriceListPricingRule(input: {
  priceListId: string
  pricingMethod: PricingMethod
  pricingPercent: number
  roundingMode?: string
  recalculate?: boolean
}): Promise<Record<string, unknown>> {
  const { data, error } = await getSupabase().rpc('set_price_list_pricing_rule', {
    p_price_list_id: input.priceListId,
    p_pricing_method: input.pricingMethod,
    p_pricing_percent: input.pricingPercent,
    p_rounding_mode: input.roundingMode ?? 'two_decimals',
    p_recalculate: input.recalculate ?? true,
  })
  if (error) throw error
  return (data ?? {}) as Record<string, unknown>
}

export async function adminRecalculatePriceListItems(input: {
  priceListId: string
  dryRun?: boolean
}): Promise<{
  dryRun: boolean
  wouldUpdate: number
  updated: number
  skippedManual: number
  skippedImported: number
  skippedNoCost: number
  skippedUnchanged: number
  errors: number
  sample: Array<Record<string, unknown>>
  message?: string
}> {
  const { data, error } = await getSupabase().rpc('recalculate_price_list_items', {
    p_price_list_id: input.priceListId,
    p_dry_run: input.dryRun ?? false,
  })
  if (error) throw error
  const r = (data ?? {}) as Record<string, unknown>
  return {
    dryRun: Boolean(r.dry_run),
    wouldUpdate: Number(r.would_update ?? 0),
    updated: Number(r.updated ?? 0),
    skippedManual: Number(r.skipped_manual ?? 0),
    skippedImported: Number(r.skipped_imported ?? 0),
    skippedNoCost: Number(r.skipped_no_cost ?? 0),
    skippedUnchanged: Number(r.skipped_unchanged ?? 0),
    errors: Number(r.errors ?? 0),
    sample: Array.isArray(r.sample) ? (r.sample as Array<Record<string, unknown>>) : [],
    message: r.message as string | undefined,
  }
}

export async function adminSetPriceListItemPricing(input: {
  itemId: string
  mode: 'manual' | 'apply_rule'
  price?: number | null
  extraCost?: number | null
}): Promise<Record<string, unknown>> {
  const { data, error } = await getSupabase().rpc('set_price_list_item_pricing', {
    p_item_id: input.itemId,
    p_mode: input.mode,
    p_price: input.price ?? null,
    p_extra_cost: input.extraCost ?? null,
  })
  if (error) throw error
  return (data ?? {}) as Record<string, unknown>
}

/** Define preço formado (origem calculated) sem passar pela regra % da lista. */
export async function adminSetCalculatedListPrice(input: {
  priceListId: string
  productId: string
  price: number
}): Promise<void> {
  if (!(input.price >= 0) || Number.isNaN(input.price)) {
    throw new Error('Preço inválido')
  }
  const { error } = await getSupabase()
    .from('price_list_items')
    .upsert(
      {
        price_list_id: input.priceListId,
        product_id: input.productId,
        price: input.price,
        price_origin: 'calculated',
        calculated_price: input.price,
      },
      { onConflict: 'price_list_id,product_id' },
    )
  if (error) throw error
}

export async function adminUpsertPriceListItem(input: {
  priceListId: string
  productId: string
  price: number
  source?: 'manual' | 'import' | 'system'
  importId?: string | null
  changedBy?: string | null
  extraCost?: number
}): Promise<void> {
  if (input.price < 0 || Number.isNaN(input.price)) {
    throw new Error('Preço inválido')
  }
  const sb = getSupabase()

  const { data: existing } = await sb
    .from('price_list_items')
    .select('id, price')
    .eq('price_list_id', input.priceListId)
    .eq('product_id', input.productId)
    .maybeSingle()

  const oldPrice = existing ? Number(existing.price) : null
  const origin = input.source === 'import' ? 'imported' : 'manual'

  const { error } = await sb.from('price_list_items').upsert(
    {
      price_list_id: input.priceListId,
      product_id: input.productId,
      price: input.price,
      price_origin: origin,
      ...(input.extraCost != null ? { extra_cost: input.extraCost } : {}),
    },
    { onConflict: 'price_list_id,product_id' },
  )
  if (error) throw error

  if (oldPrice === null || Math.abs(oldPrice - input.price) > 0.001) {
    await sb.from('price_change_history').insert({
      product_id: input.productId,
      price_list_id: input.priceListId,
      old_price: oldPrice,
      new_price: input.price,
      source: input.source ?? 'manual',
      import_id: input.importId ?? null,
      changed_by: input.changedBy ?? null,
    })
  }
}

export async function adminDeletePriceListItem(id: string): Promise<void> {
  const { error } = await getSupabase().from('price_list_items').delete().eq('id', id)
  if (error) throw error
}

export async function adminFindProductIdBySku(sku: string): Promise<string | null> {
  const { data, error } = await getSupabase()
    .from('products')
    .select('id')
    .eq('sku', sku.trim())
    .maybeSingle()
  if (error) throw error
  return data?.id ? String(data.id) : null
}

/** IDs seed das listas Base e Promocional (F6B). */
export const PRICE_LIST_BASE_ID = 'a1111111-1111-1111-1111-111111111101'
export const PRICE_LIST_PROMO_ID = 'a1111111-1111-1111-1111-111111111102'

export type PriceAdjustMode = 'percent' | 'fixed'

function roundMoney2(n: number): number {
  return Math.round(n * 100) / 100
}

export type PriceAdjustSample = { sku: string; old: number; new: number }

/**
 * Ajuste global atômico (RPC).
 * - percent: value = 10 → +10%; value = -5 → -5%
 * - fixed: value em R$ somado (negativo reduz)
 * Não altera preço avulso. Base/Promo sincronizam via trigger.
 */
export async function adminAdjustAllPriceListItems(input: {
  priceListId: string
  mode: PriceAdjustMode
  value: number
  changedBy?: string | null
}): Promise<{ updated: number; skipped: number; sample: PriceAdjustSample[] }> {
  if (!Number.isFinite(input.value) || input.value === 0) {
    throw new Error('Informe um valor de ajuste diferente de zero.')
  }
  if (input.mode === 'percent' && Math.abs(input.value) > 100) {
    throw new Error('Percentual deve estar entre -100 e 100.')
  }
  if (input.mode === 'percent' && input.value <= -100) {
    throw new Error('Redução de 100% zera a lista e foi bloqueada.')
  }

  const { data, error } = await getSupabase().rpc('adjust_price_list_items', {
    p_price_list_id: input.priceListId,
    p_mode: input.mode,
    p_value: input.value,
    p_changed_by: input.changedBy ?? null,
  })
  if (error) throw error

  const row = (data ?? {}) as {
    updated?: number
    skipped?: number
    sample?: { sku?: string; old?: number; new?: number }[]
  }
  const sample = (row.sample ?? []).map((s) => ({
    sku: String(s.sku ?? ''),
    old: Number(s.old),
    new: Number(s.new),
  }))
  return {
    updated: Number(row.updated ?? 0),
    skipped: Number(row.skipped ?? 0),
    sample,
  }
}

/** Calcula próximo preço (mesma regra da RPC). */
export function computeAdjustedPrice(
  oldPrice: number,
  mode: PriceAdjustMode,
  value: number,
): number {
  let next = mode === 'percent' ? oldPrice * (1 + value / 100) : oldPrice + value
  next = roundMoney2(next)
  if (next < 0) next = 0
  return next
}

export type ProductListPriceRow = {
  priceListId: string
  listName: string
  listSlug: string
  status: PriceListStatus
  priority: number
  isDefault: boolean
  itemId: string | null
  price: number | null
}

/** Todas as listas + preço do produto em cada uma (se houver). */
export async function adminListProductListPrices(productId: string): Promise<ProductListPriceRow[]> {
  const sb = getSupabase()
  const [{ data: lists, error: lErr }, { data: items, error: iErr }] = await Promise.all([
    selectPriceListsWithPercentFallback((columns) =>
      sb.from('price_lists').select(columns).order('priority', { ascending: false }),
    ),
    sb
      .from('price_list_items')
      .select('id, price_list_id, price')
      .eq('product_id', productId),
  ])
  if (lErr) throw lErr
  if (iErr) throw iErr

  const byList = new Map<string, { id: string; price: number }>()
  for (const row of items ?? []) {
    byList.set(String(row.price_list_id), {
      id: String(row.id),
      price: Number(row.price),
    })
  }

  return (lists ?? []).map((raw) => {
    const list = mapList(raw as unknown as Record<string, unknown>)
    const hit = byList.get(list.id)
    return {
      priceListId: list.id,
      listName: list.name,
      listSlug: list.slug,
      status: list.status,
      priority: list.priority,
      isDefault: list.isDefault,
      itemId: hit?.id ?? null,
      price: hit?.price ?? null,
    }
  })
}

/**
 * Sincroniza o produto nas listas: preço definido = upsert; null = remove da lista.
 * A lista Base deve sempre receber preço (≥ 0) quando o modo for listas.
 */
export async function adminSyncProductListPrices(input: {
  productId: string
  entries: { priceListId: string; price: number | null }[]
  changedBy?: string | null
}): Promise<void> {
  for (const entry of input.entries) {
    if (entry.price == null) {
      const { data: existing } = await getSupabase()
        .from('price_list_items')
        .select('id')
        .eq('price_list_id', entry.priceListId)
        .eq('product_id', input.productId)
        .maybeSingle()
      if (existing?.id) {
        await adminDeletePriceListItem(String(existing.id))
      }
      continue
    }
    await adminUpsertPriceListItem({
      priceListId: entry.priceListId,
      productId: input.productId,
      price: entry.price,
      source: 'manual',
      changedBy: input.changedBy ?? null,
    })
  }
}

export async function adminEnsureBaseAndPromoPrices(productId: string, price: number, promoPrice?: number | null) {
  const BASE = PRICE_LIST_BASE_ID
  const PROMO = PRICE_LIST_PROMO_ID
  await adminUpsertPriceListItem({
    priceListId: BASE,
    productId,
    price,
    source: 'manual',
  })
  if (promoPrice != null && !Number.isNaN(promoPrice)) {
    await adminUpsertPriceListItem({
      priceListId: PROMO,
      productId,
      price: promoPrice,
      source: 'manual',
    })
  } else {
    const sb = getSupabase()
    const { data: existing } = await sb
      .from('price_list_items')
      .select('id')
      .eq('price_list_id', PROMO)
      .eq('product_id', productId)
      .maybeSingle()
    if (existing?.id) {
      await sb.from('price_list_items').delete().eq('id', existing.id)
    }
  }
}

export type ImportPreviewRow = {
  line: number
  sku: string
  price: number | null
  currentPrice: number | null
  currentOrigin: PriceOrigin | null
  productId: string | null
  errors: string[]
  warnings: string[]
  ok: boolean
}

/**
 * Preview estrutural + lookup SKU + preço atual na lista.
 * SKU inexistente / duplicata / preço inválido = erro (não cria produto).
 */
export async function adminPreviewPriceImport(input: {
  file: File
  priceListId: string
}): Promise<{
  rows: ImportPreviewRow[]
  delimiter: string | null
  fileErrors: string[]
}> {
  const contract = getImportContract('price_list')
  const lower = input.file.name.toLowerCase()
  const grid =
    lower.endsWith('.xlsx') || lower.endsWith('.xls')
      ? await parseXlsxToGrid(await input.file.arrayBuffer(), { contract })
      : parseCsvToGrid(decodeImportCsvText(await input.file.arrayBuffer()), { contract })

  const validation = validateImportGrid(grid, contract, {
    duplicateKeyField: 'sku',
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

  const skus = validation.mapped.map((m) => (m.values.sku ?? '').trim()).filter(Boolean)
  const skuToProduct = new Map<string, string>()
  const uniqueSkus = [...new Set(skus)]
  const sb = getSupabase()
  const chunkSize = 200
  for (let i = 0; i < uniqueSkus.length; i += chunkSize) {
    const chunk = uniqueSkus.slice(i, i + chunkSize)
    const { data, error } = await sb.from('products').select('id, sku').in('sku', chunk)
    if (error) throw error
    for (const row of data ?? []) {
      skuToProduct.set(String(row.sku), String(row.id))
    }
  }

  const productIds = [...skuToProduct.values()]
  const currentByProduct = new Map<string, { price: number; origin: PriceOrigin }>()
  if (productIds.length) {
    for (let i = 0; i < productIds.length; i += chunkSize) {
      const chunk = productIds.slice(i, i + chunkSize)
      const { data, error } = await sb
        .from('price_list_items')
        .select('product_id, price, price_origin')
        .eq('price_list_id', input.priceListId)
        .in('product_id', chunk)
      if (error) throw error
      for (const row of data ?? []) {
        currentByProduct.set(String(row.product_id), {
          price: Number(row.price),
          origin: (row.price_origin as PriceOrigin) || 'manual',
        })
      }
    }
  }

  const rows: ImportPreviewRow[] = []
  for (const mapped of validation.mapped) {
    const sku = (mapped.values.sku ?? '').trim()
    const priceRaw = (mapped.values.price ?? '').trim()
    const price = parseMoneyBr(priceRaw)
    const lineErrors = [...(errorsByLine.get(mapped.lineNumber) ?? [])]
    let productId: string | null = null
    let currentPrice: number | null = null
    let currentOrigin: PriceOrigin | null = null
    const warnings: string[] = []

    if (lineErrors.length === 0) {
      if (!sku) lineErrors.push('SKU vazio')
      if (price == null || Number.isNaN(price)) lineErrors.push('Preço inválido')
      else if (price < 0) lineErrors.push('Preço negativo')

      if (sku && lineErrors.length === 0) {
        productId = skuToProduct.get(sku) ?? null
        if (!productId) {
          lineErrors.push('SKU não encontrado')
        } else {
          const cur = currentByProduct.get(productId)
          if (cur) {
            currentPrice = cur.price
            currentOrigin = cur.origin
            if (cur.origin === 'calculated') {
              warnings.push('Item calculado passará a Importado (não recalculará por custo/regra)')
            } else if (cur.origin === 'manual') {
              warnings.push('Item manual passará a Importado')
            }
          }
        }
      }
    }

    rows.push({
      line: mapped.lineNumber,
      sku,
      price: price == null || Number.isNaN(price) ? null : price,
      currentPrice,
      currentOrigin,
      productId,
      errors: lineErrors,
      warnings,
      ok: lineErrors.length === 0,
    })
  }

  return { rows, delimiter: grid.delimiter, fileErrors: [] }
}

export async function adminCreatePriceImport(input: {
  filename: string
  priceListId: string
  createdBy?: string | null
  rows: ImportPreviewRow[]
}): Promise<string> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('imports')
    .insert({
      filename: input.filename,
      status: 'preview',
      kind: 'price_list',
      price_list_id: input.priceListId,
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
      price: r.price,
      product_id: r.productId,
      current_price: r.currentPrice,
      current_origin: r.currentOrigin,
    },
    result: r.ok ? 'ok' : 'error',
  }))
  if (items.length) {
    const { error: itemsErr } = await sb.from('import_items').insert(items)
    if (itemsErr) throw itemsErr
  }
  return importId
}

/** Apply via RPC — price_origin=imported; sem recalc. */
export async function adminApplyPriceImport(importId: string): Promise<{
  applied: number
  updated: number
  inserted: number
  failed: number
  skipped: number
}> {
  const { data, error } = await getSupabase().rpc('apply_price_list_import', {
    p_import_id: importId,
  })
  if (error) throw error
  const r = (data ?? {}) as Record<string, unknown>
  return {
    applied: Number(r.applied ?? 0),
    updated: Number(r.updated ?? 0),
    inserted: Number(r.inserted ?? 0),
    failed: Number(r.failed ?? 0),
    skipped: Number(r.skipped ?? 0),
  }
}

export type PriceListImportSummary = {
  id: string
  filename: string
  status: string
  createdAt: string
  createdBy: string | null
  report: Record<string, unknown> | null
  totalItems: number
  errorItems: number
}

export async function adminListPriceListImports(
  priceListId: string,
): Promise<PriceListImportSummary[]> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('imports')
    .select('id, filename, status, created_at, created_by, report')
    .eq('kind', 'price_list')
    .eq('price_list_id', priceListId)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw error

  const imports = data ?? []
  if (!imports.length) return []

  const ids = imports.map((r) => String(r.id))
  const { data: items, error: itemsError } = await sb
    .from('import_items')
    .select('import_id, result')
    .in('import_id', ids)
  if (itemsError) throw itemsError

  const totals = new Map<string, { total: number; errors: number }>()
  for (const it of items ?? []) {
    const iid = String(it.import_id)
    const cur = totals.get(iid) ?? { total: 0, errors: 0 }
    cur.total += 1
    if (it.result === 'error' || it.result === 'failed') cur.errors += 1
    totals.set(iid, cur)
  }

  return imports.map((r) => {
    const t = totals.get(String(r.id)) ?? { total: 0, errors: 0 }
    return {
      id: String(r.id),
      filename: String(r.filename),
      status: String(r.status),
      createdAt: String(r.created_at),
      createdBy: r.created_by ? String(r.created_by) : null,
      report: (r.report as Record<string, unknown> | null) ?? null,
      totalItems: t.total,
      errorItems: t.errors,
    }
  })
}

export type PriceListImportDetail = PriceListImportSummary & {
  items: Array<{
    id: string
    lineNumber: number | null
    result: string | null
    errors: string[]
    warnings: string[]
    payload: Record<string, unknown>
  }>
}

export async function adminGetImportDetail(importId: string): Promise<PriceListImportDetail | null> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('imports')
    .select('id, filename, status, created_at, created_by, report, kind, price_list_id')
    .eq('id', importId)
    .maybeSingle()
  if (error) throw error
  if (!data) return null

  const { data: items, error: itemsError } = await sb
    .from('import_items')
    .select('id, line_number, result, errors, warnings, payload')
    .eq('import_id', importId)
    .order('line_number', { ascending: true })
  if (itemsError) throw itemsError

  return {
    id: String(data.id),
    filename: String(data.filename),
    status: String(data.status),
    createdAt: String(data.created_at),
    createdBy: data.created_by ? String(data.created_by) : null,
    report: (data.report as Record<string, unknown> | null) ?? null,
    totalItems: (items ?? []).length,
    errorItems: (items ?? []).filter((i) => i.result === 'error' || i.result === 'failed').length,
    items: (items ?? []).map((i) => ({
      id: String(i.id),
      lineNumber: i.line_number == null ? null : Number(i.line_number),
      result: i.result == null ? null : String(i.result),
      errors: Array.isArray(i.errors) ? (i.errors as string[]) : [],
      warnings: Array.isArray(i.warnings) ? (i.warnings as string[]) : [],
      payload: (i.payload as Record<string, unknown>) ?? {},
    })),
  }
}
