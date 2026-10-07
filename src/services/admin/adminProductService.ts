import { getSupabase } from '@/lib/supabase'
import { toSlug } from '@/lib/slug'
import { adminGetActivePriceOverride } from '@/services/admin/adminPriceOverrideService'
import {
  adminEnsureBaseAndPromoPrices,
  adminListProductListPrices,
} from '@/services/admin/adminPriceListService'
import type { Product, ProductReference } from '@/types'

type ProductRow = {
  id: string
  sku: string
  name: string
  slug: string
  description: string | null
  short_description: string | null
  brand_id: string | null
  supplier_id: string | null
  category_id: string | null
  price: number
  promo_price: number | null
  status: string
  manufacturer_code: string | null
  is_incomplete: boolean
  is_available: boolean
  posicao?: string | null
  lado?: string | null
  attrs: Record<string, unknown> | null
  weight_kg?: number | null
  height_cm?: number | null
  width_cm?: number | null
  length_cm?: number | null
  product_brands?: { name: string } | { name: string }[] | null
  product_categories?: { id: string; name: string } | { id: string; name: string }[] | null
}

function asNamed<T extends { name: string }>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function mapProduct(row: ProductRow): Product {
  const brand = asNamed(row.product_brands)
  const category = asNamed(row.product_categories)
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    slug: row.slug,
    description: row.description ?? undefined,
    shortDescription: row.short_description ?? undefined,
    brandId: row.brand_id,
    brand: brand?.name,
    supplierId: row.supplier_id,
    categoryId: category?.id ?? row.category_id ?? undefined,
    categoryName: category?.name,
    price: Number(row.price),
    promoPrice: row.promo_price == null ? null : Number(row.promo_price),
    status: row.status as Product['status'],
    manufacturerCode: row.manufacturer_code ?? undefined,
    available: row.is_available,
    isIncomplete: row.is_incomplete,
    posicao: (row.posicao as Product['posicao']) ?? null,
    lado: (row.lado as Product['lado']) ?? null,
    attrs: row.attrs ?? {},
    weightKg: row.weight_kg == null ? null : Number(row.weight_kg),
    heightCm: row.height_cm == null ? null : Number(row.height_cm),
    widthCm: row.width_cm == null ? null : Number(row.width_cm),
    lengthCm: row.length_cm == null ? null : Number(row.length_cm),
  }
}

const SELECT = `
  id, sku, name, slug, description, short_description, brand_id, supplier_id,
  category_id, price, promo_price, status, manufacturer_code, is_incomplete,
  is_available, posicao, lado, attrs, weight_kg, height_cm, width_cm, length_cm,
  product_brands ( name ),
  product_categories ( id, name )
`

export async function adminListProducts(params?: {
  q?: string
  status?: string
  withoutImage?: boolean
  /** category_id IN (nó + descendentes). */
  categoryIds?: string[]
  /** Montadora: produtos com aplicação em vehicle_versions dessa manufacturer. */
  manufacturerId?: string
}): Promise<Product[]> {
  let productIdsByMaker: string[] | null = null
  if (params?.manufacturerId) {
    const { data: compat, error: compatErr } = await getSupabase()
      .from('product_vehicle_compatibility')
      .select('product_id, vehicle_versions!inner(manufacturer_id)')
      .eq('vehicle_versions.manufacturer_id', params.manufacturerId)
    if (compatErr) throw compatErr
    productIdsByMaker = [
      ...new Set((compat ?? []).map((r) => String((r as { product_id: string }).product_id))),
    ]
    if (productIdsByMaker.length === 0) return []
  }

  let q = getSupabase().from('products').select(SELECT).order('updated_at', { ascending: false })
  if (params?.status) q = q.eq('status', params.status)
  if (params?.categoryIds && params.categoryIds.length > 0) {
    q = q.in('category_id', params.categoryIds)
  }
  if (productIdsByMaker) q = q.in('id', productIdsByMaker)
  if (params?.q?.trim()) {
    const term = params.q.trim()
    q = q.or(`name.ilike.%${term}%,sku.ilike.%${term}%`)
  }
  const { data, error } = await q.limit(200)
  if (error) throw error
  let list = (data as ProductRow[]).map(mapProduct)

  if (params?.withoutImage) {
    const { data: imgs } = await getSupabase().from('product_images').select('product_id')
    const withImg = new Set((imgs ?? []).map((i) => String(i.product_id)))
    list = list.filter((p) => !withImg.has(p.id) || p.isIncomplete)
  }
  return list
}

export async function adminGetProduct(id: string): Promise<Product | null> {
  const { data, error } = await getSupabase()
    .from('products')
    .select(SELECT)
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return mapProduct(data as ProductRow)
}

export async function adminUpsertProduct(input: {
  id?: string
  name: string
  sku: string
  slug?: string
  categoryId?: string | null
  brandId?: string | null
  supplierId?: string | null
  price: number
  promoPrice?: number | null
  status?: Product['status']
  shortDescription?: string
  description?: string
  posicao?: Product['posicao']
  lado?: Product['lado']
  attrs?: Record<string, unknown>
  isAvailable?: boolean
  weightKg?: number | null
  heightCm?: number | null
  widthCm?: number | null
  lengthCm?: number | null
  /** Quando false, o caller sincroniza as listas (modo listas no formulário). */
  syncBasePromoLists?: boolean
}): Promise<Product> {
  const payload = {
    name: input.name.trim(),
    sku: input.sku.trim(),
    slug: (input.slug?.trim() || toSlug(input.name)) || toSlug(input.sku),
    category_id: input.categoryId || null,
    brand_id: input.brandId || null,
    supplier_id: input.supplierId || null,
    price: input.price,
    promo_price: input.promoPrice ?? null,
    status: input.status ?? 'draft',
    short_description: input.shortDescription?.trim() || null,
    description: input.description?.trim() || null,
    posicao: input.posicao || null,
    lado: input.lado || null,
    attrs: input.attrs ?? {},
    is_available: input.isAvailable ?? false,
    weight_kg: input.weightKg ?? null,
    height_cm: input.heightCm ?? null,
    width_cm: input.widthCm ?? null,
    length_cm: input.lengthCm ?? null,
    search_document: [
      input.name,
      input.sku,
      input.shortDescription,
      input.description,
      input.posicao,
      input.lado,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase(),
  }

  const q = getSupabase().from('products')
  const { data, error } = input.id
    ? await q.update(payload).eq('id', input.id).select(SELECT).single()
    : await q.insert(payload).select(SELECT).single()
  if (error) throw error

  const product = mapProduct(data as ProductRow)
  if (input.syncBasePromoLists !== false) {
    await adminEnsureBaseAndPromoPrices(product.id, input.price, input.promoPrice ?? null)
  }
  await refreshIncompleteFlag(product.id)
  return (await adminGetProduct(product.id)) ?? product
}

export async function adminSetProductStatus(id: string, status: NonNullable<Product['status']>) {
  const { error } = await getSupabase().from('products').update({ status }).eq('id', id)
  if (error) throw error
}

export type ReleaseToStoreResult =
  | { ok: true; productId: string; publishedNow: boolean }
  | { ok: false; productId: string; reason: string }

/**
 * Liberar na loja: published + preço > 0 (override ativo, lista padrão/ativa ou espelho) + is_available.
 * Não publica automaticamente em imports — só via esta ação explícita.
 */
export async function adminReleaseProductToStore(input: {
  productId: string
  /** Se true e status ≠ published, publica neste passo. */
  publishIfNeeded?: boolean
}): Promise<ReleaseToStoreResult> {
  const product = await adminGetProduct(input.productId)
  if (!product) {
    return { ok: false, productId: input.productId, reason: 'Produto não encontrado' }
  }

  let publishedNow = false
  if (product.status !== 'published') {
    if (!input.publishIfNeeded) {
      return {
        ok: false,
        productId: product.id,
        reason: 'Produto precisa estar Publicado (ou marque publicar neste passo)',
      }
    }
    await adminSetProductStatus(product.id, 'published')
    publishedNow = true
  }

  const override = await adminGetActivePriceOverride(product.id)
  const listRows = await adminListProductListPrices(product.id)
  const defaultOrActive = listRows.find(
    (r) =>
      r.isDefault &&
      r.status === 'active' &&
      r.price != null &&
      Number(r.price) > 0,
  )
  const anyActivePriced = listRows.find(
    (r) => r.status === 'active' && r.price != null && Number(r.price) > 0,
  )
  const resolved =
    (override && override.amount > 0 ? override.amount : null) ??
    (defaultOrActive?.price != null ? Number(defaultOrActive.price) : null) ??
    (anyActivePriced?.price != null ? Number(anyActivePriced.price) : null) ??
    (product.price > 0 ? product.price : null)

  if (resolved == null || resolved <= 0) {
    return {
      ok: false,
      productId: product.id,
      reason: 'Sem preço > 0 na lista padrão/ativa (nem preço avulso)',
    }
  }

  const { error } = await getSupabase()
    .from('products')
    .update({ is_available: true, status: 'published' })
    .eq('id', product.id)
  if (error) throw error

  return { ok: true, productId: product.id, publishedNow }
}

export async function adminReleaseProductsToStore(input: {
  productIds: string[]
  publishIfNeeded?: boolean
}): Promise<{ released: number; failed: ReleaseToStoreResult[] }> {
  const failed: ReleaseToStoreResult[] = []
  let released = 0
  for (const productId of input.productIds) {
    const r = await adminReleaseProductToStore({
      productId,
      publishIfNeeded: input.publishIfNeeded,
    })
    if (r.ok) released += 1
    else failed.push(r)
  }
  return { released, failed }
}

export async function adminDeleteProduct(id: string) {
  const { error } = await getSupabase().from('products').delete().eq('id', id)
  if (error) throw error
}

export async function adminListReferences(productId: string): Promise<ProductReference[]> {
  const { data, error } = await getSupabase()
    .from('product_references')
    .select('id, code, ref_type, brand_id, brand_label, status')
    .eq('product_id', productId)
    .order('code')
  if (error) throw error
  return (data ?? []).map((r) => ({
    id: String(r.id),
    code: String(r.code),
    type: String(r.ref_type),
    brandId: (r.brand_id as string | null) ?? null,
    brandLabel: (r.brand_label as string | null) ?? undefined,
    status: (r.status as ProductReference['status']) ?? 'active',
  }))
}

export async function adminUpsertReference(input: {
  id?: string
  productId: string
  code: string
  type: string
  brandId?: string | null
  brandLabel?: string
  status?: ProductReference['status']
}): Promise<void> {
  const payload = {
    product_id: input.productId,
    code: input.code.trim(),
    ref_type: input.type,
    brand_id: input.brandId || null,
    brand_label: input.brandLabel?.trim() || null,
    status: input.status ?? 'active',
  }
  const q = getSupabase().from('product_references')
  const { error } = input.id
    ? await q.update(payload).eq('id', input.id)
    : await q.insert(payload)
  if (error) throw error
}

export async function adminDeleteReference(id: string) {
  const { error } = await getSupabase().from('product_references').delete().eq('id', id)
  if (error) throw error
}

export async function adminListApplications(productId: string) {
  const { data, error } = await getSupabase()
    .from('product_vehicle_compatibility')
    .select(
      `
      id, notes, vehicle_version_id,
      vehicle_versions (
        id, year, engine, version_name,
        manufacturers ( name ),
        models ( name )
      )
    `,
    )
    .eq('product_id', productId)
  if (error) throw error
  return data ?? []
}

export async function adminAddApplication(productId: string, vehicleVersionId: string, notes?: string) {
  const { error } = await getSupabase().from('product_vehicle_compatibility').insert({
    product_id: productId,
    vehicle_version_id: vehicleVersionId,
    notes: notes?.trim() || null,
  })
  if (error) throw error
}

export async function adminRemoveApplication(id: string) {
  const { error } = await getSupabase().from('product_vehicle_compatibility').delete().eq('id', id)
  if (error) throw error
}

export async function refreshIncompleteFlag(productId: string) {
  const { count, error } = await getSupabase()
    .from('product_images')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', productId)
  if (error) throw error
  const incomplete = !count || count < 1
  const { error: uErr } = await getSupabase()
    .from('products')
    .update({ is_incomplete: incomplete })
    .eq('id', productId)
  if (uErr) throw uErr
}
