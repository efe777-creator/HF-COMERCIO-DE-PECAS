import { getSupabase } from '@/lib/supabase'
import { toSlug } from '@/lib/slug'
import { features } from '@/config/features'
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
  product_kind?: string | null
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
    productKind: row.product_kind === 'kit' ? 'kit' : 'item',
  }
}

const SELECT = `
  id, sku, name, slug, description, short_description, brand_id, supplier_id,
  category_id, price, promo_price, status, manufacturer_code, is_incomplete,
  is_available, posicao, lado, attrs, product_kind,
  product_brands ( name ),
  product_categories ( id, name )
`

export const ADMIN_PRODUCTS_PAGE_SIZE = 40

export type AdminListProductsParams = {
  q?: string
  status?: string
  /** Status ≠ archived (ativos). Ignorado se `status` explícito. */
  statusNeq?: string
  withoutImage?: boolean
  productKind?: 'item' | 'kit'
  categoryIds?: string[]
  /** Filtro por aplicação / veículo (montadora). */
  manufacturerId?: string
  /** Filtro por aplicação / veículo (modelo). */
  modelId?: string
  /** Filtro por motorização (texto em vehicle_versions.engine). */
  engine?: string
  /**
   * Busca ampla: peça (nome/SKU/ref/search_document) + refs + termos de carro/aplicação.
   * Default true. Desligar só se quiser match estrito nome/SKU.
   */
  broadSearch?: boolean
  limit?: number
  offset?: number
}

/** IDs extras para q ampla: refs tipadas + PVC (montadora/modelo/motor/combustível/versão). */
async function resolveBroadSearchProductIds(term: string): Promise<string[]> {
  const t = term.trim().replace(/[,()"]/g, ' ').trim()
  if (!t || t.length < 2) return []
  const sb = getSupabase()
  const like = `%${t}%`
  const ids = new Set<string>()

  const [{ data: refs }, { data: makers }, { data: models }, { data: versions }] =
    await Promise.all([
      sb.from('product_references').select('product_id').ilike('code', like).limit(80),
      sb.from('manufacturers').select('id').ilike('name', like).limit(40),
      sb.from('models').select('id').ilike('name', like).limit(40),
      sb
        .from('vehicle_versions')
        .select('id')
        .or(`engine.ilike."${like}",fuel.ilike."${like}",version_name.ilike."${like}"`)
        .limit(80),
    ])

  for (const r of refs ?? []) ids.add(String(r.product_id))

  const makerIds = (makers ?? []).map((m) => String(m.id))
  const modelIds = (models ?? []).map((m) => String(m.id))
  const versionIds = (versions ?? []).map((v) => String(v.id))

  if (makerIds.length) {
    const { data } = await sb
      .from('product_vehicle_compatibility')
      .select('product_id, vehicle_versions!inner(manufacturer_id)')
      .in('vehicle_versions.manufacturer_id', makerIds)
      .limit(120)
    for (const row of data ?? []) ids.add(String((row as { product_id: string }).product_id))
  }
  if (modelIds.length) {
    const { data } = await sb
      .from('product_vehicle_compatibility')
      .select('product_id, vehicle_versions!inner(model_id)')
      .in('vehicle_versions.model_id', modelIds)
      .limit(120)
    for (const row of data ?? []) ids.add(String((row as { product_id: string }).product_id))
  }
  if (versionIds.length) {
    const { data } = await sb
      .from('product_vehicle_compatibility')
      .select('product_id')
      .in('vehicle_version_id', versionIds)
      .limit(120)
    for (const row of data ?? []) ids.add(String((row as { product_id: string }).product_id))
  }

  return [...ids]
}

async function resolveProductIdsByVehicle(params: {
  manufacturerId?: string
  modelId?: string
  engine?: string
}): Promise<string[] | null> {
  const hasVehicle =
    Boolean(params.manufacturerId) || Boolean(params.modelId) || Boolean(params.engine?.trim())
  if (!hasVehicle) return null

  let q = getSupabase()
    .from('product_vehicle_compatibility')
    .select('product_id, vehicle_versions!inner(manufacturer_id, model_id, engine)')

  if (params.manufacturerId) {
    q = q.eq('vehicle_versions.manufacturer_id', params.manufacturerId)
  }
  if (params.modelId) {
    q = q.eq('vehicle_versions.model_id', params.modelId)
  }
  if (params.engine?.trim()) {
    q = q.ilike('vehicle_versions.engine', params.engine.trim())
  }

  const { data, error } = await q.limit(500)
  if (error) throw error
  return [...new Set((data ?? []).map((r) => String(r.product_id)))]
}

async function queryProducts(params?: AdminListProductsParams): Promise<Product[]> {
  const vehicleIds = await resolveProductIdsByVehicle({
    manufacturerId: params?.manufacturerId,
    modelId: params?.modelId,
    engine: params?.engine,
  })
  if (vehicleIds && vehicleIds.length === 0) return []

  let broadIds: string[] = []
  const broad = params?.broadSearch !== false
  if (broad && params?.q?.trim()) {
    broadIds = await resolveBroadSearchProductIds(params.q)
  }

  let q = getSupabase().from('products').select(SELECT).order('updated_at', { ascending: false })
  if (params?.status) q = q.eq('status', params.status)
  else if (params?.statusNeq) q = q.neq('status', params.statusNeq)
  if (params?.productKind) q = q.eq('product_kind', params.productKind)
  if (params?.categoryIds && params.categoryIds.length > 0) {
    q = q.in('category_id', params.categoryIds)
  }
  if (vehicleIds) q = q.in('id', vehicleIds)

  if (params?.q?.trim()) {
    const safe = params.q.trim().replace(/[,()"]/g, ' ').trim()
    if (safe) {
      const like = `%${safe}%`
      const parts = [
        `name.ilike."${like}"`,
        `sku.ilike."${like}"`,
        `manufacturer_code.ilike."${like}"`,
        `search_document.ilike."${like}"`,
      ]
      if (broadIds.length) {
        parts.push(`id.in.(${broadIds.join(',')})`)
      }
      q = q.or(parts.join(','))
    }
  }

  const limit = params?.limit ?? 200
  const offset = params?.offset ?? 0
  q = q.range(offset, offset + limit - 1)
  const { data, error } = await q
  if (error) throw error
  let list = (data as ProductRow[]).map(mapProduct)

  if (params?.withoutImage) {
    const { data: imgs } = await getSupabase().from('product_images').select('product_id')
    const withImg = new Set((imgs ?? []).map((i) => String(i.product_id)))
    list = list.filter((p) => !withImg.has(p.id) || p.isIncomplete)
  }
  return list
}

export async function adminListProducts(params?: AdminListProductsParams): Promise<Product[]> {
  return queryProducts({ ...params, limit: params?.limit ?? 200, offset: params?.offset ?? 0 })
}

export async function adminListProductsPage(
  params?: AdminListProductsParams,
): Promise<{ items: Product[]; hasMore: boolean }> {
  const limit = params?.limit ?? ADMIN_PRODUCTS_PAGE_SIZE
  const offset = params?.offset ?? 0
  const rows = await queryProducts({ ...params, limit: limit + 1, offset })
  const hasMore = rows.length > limit
  return { items: hasMore ? rows.slice(0, limit) : rows, hasMore }
}

export async function adminSetProductAvailable(id: string, available: boolean): Promise<void> {
  const { error } = await getSupabase()
    .from('products')
    .update({ is_available: available })
    .eq('id', id)
  if (error) throw error
}

/** Kits que usam este item como componente. */
export async function adminListKitsUsingProduct(
  componentProductId: string,
): Promise<
  {
    linkId: string
    kitId: string
    kitSku: string
    kitName: string
    quantity: number
  }[]
> {
  const { data, error } = await getSupabase()
    .from('product_kit_components')
    .select(
      `
      id,
      quantity,
      products!product_kit_components_kit_product_id_fkey ( id, sku, name )
    `,
    )
    .eq('component_product_id', componentProductId)
  if (error) throw error
  return (data ?? []).map((row) => {
    const p = row.products as
      | { id?: string; sku?: string; name?: string }
      | { id?: string; sku?: string; name?: string }[]
      | null
    const prod = Array.isArray(p) ? p[0] : p
    return {
      linkId: String(row.id),
      kitId: String(prod?.id ?? ''),
      kitSku: String(prod?.sku ?? ''),
      kitName: String(prod?.name ?? ''),
      quantity: Number(row.quantity),
    }
  })
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
  /** Dimensões não existem no schema HF F1 — aceitas e ignoradas (compat UI). */
  weightKg?: number | null
  heightCm?: number | null
  widthCm?: number | null
  lengthCm?: number | null
  /** Mantido por compatibilidade; listas de preço desligadas no MVP B2B. */
  syncBasePromoLists?: boolean
  productKind?: 'item' | 'kit'
}): Promise<Product> {
  void input.weightKg
  void input.heightCm
  void input.widthCm
  void input.lengthCm
  const payload: Record<string, unknown> = {
    name: input.name.trim(),
    sku: input.sku.trim(),
    slug: (input.slug?.trim() || toSlug(input.name)) || toSlug(input.sku),
    category_id: input.categoryId || null,
    brand_id: input.brandId || null,
    supplier_id: input.supplierId || null,
    price: features.price_enabled ? input.price : (input.price ?? 0),
    promo_price: features.price_enabled ? (input.promoPrice ?? null) : null,
    status: input.status ?? 'draft',
    short_description: input.shortDescription?.trim() || null,
    description: input.description?.trim() || null,
    posicao: input.posicao || null,
    lado: input.lado || null,
    attrs: input.attrs ?? {},
    is_available: input.isAvailable ?? false,
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
  if (input.productKind) payload.product_kind = input.productKind

  const q = getSupabase().from('products')
  const { data, error } = input.id
    ? await q.update(payload).eq('id', input.id).select(SELECT).single()
    : await q.insert(payload).select(SELECT).single()
  if (error) throw error

  const product = mapProduct(data as ProductRow)
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
 * Publicar no catálogo (status=published) e marcar disponível.
 * Preço NÃO é requisito no MVP B2B.
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
    publishedNow = true
  }

  const { error } = await getSupabase()
    .from('products')
    .update({ status: 'published', is_available: true })
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
    .select('id, code, ref_type, brand_label')
    .eq('product_id', productId)
    .order('code')
  if (error) throw error
  return (data ?? []).map((r) => ({
    id: String(r.id),
    code: String(r.code),
    type: String(r.ref_type),
    brandId: null,
    brandLabel: (r.brand_label as string | null) ?? undefined,
    status: 'active' as ProductReference['status'],
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
    brand_label: input.brandLabel?.trim() || null,
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

export type PvcApplicationPosition = {
  lado?: 'ESQUERDO' | 'DIREITO' | 'AMBOS' | null
  posicaoLong?: 'DIANTEIRA' | 'TRASEIRA' | null
  posicaoVert?: 'SUPERIOR' | 'INFERIOR' | null
}

export type PvcValidationStatus = 'draft' | 'validated' | 'rejected'

export type AdminApplicationPatch = PvcApplicationPosition & {
  notes?: string | null
  yearStart?: number | null
  yearEnd?: number | null
  validationStatus?: PvcValidationStatus
  vehicleVersionId?: string
}

export type AdminApplicationHubRow = {
  id: string
  productId: string
  productSku: string
  productName: string
  yearStart: number | null
  yearEnd: number | null
  notes: string | null
  lado: string | null
  posicaoLong: string | null
  posicaoVert: string | null
  validationStatus: string
  makerName: string | null
  modelName: string | null
  engine: string | null
  fuel: string | null
  versionName: string | null
  versionYear: number | null
}

function mapApplicationHubRow(raw: Record<string, unknown>): AdminApplicationHubRow {
  const product = raw.products as
    | { sku?: string; name?: string; id?: string }
    | { sku?: string; name?: string; id?: string }[]
    | null
  const p = Array.isArray(product) ? product[0] : product
  const vv = raw.vehicle_versions as
    | {
        year?: number | null
        engine?: string | null
        fuel?: string | null
        version_name?: string | null
        manufacturers?: { name?: string } | { name?: string }[]
        models?: { name?: string } | { name?: string }[]
      }
    | null
    | undefined
  const maker = vv?.manufacturers
  const model = vv?.models
  const makerName = Array.isArray(maker) ? maker[0]?.name : maker?.name
  const modelName = Array.isArray(model) ? model[0]?.name : model?.name
  return {
    id: String(raw.id),
    productId: String(raw.product_id ?? p?.id ?? ''),
    productSku: String(p?.sku ?? ''),
    productName: String(p?.name ?? ''),
    yearStart: raw.year_start == null ? null : Number(raw.year_start),
    yearEnd: raw.year_end == null ? null : Number(raw.year_end),
    notes: raw.notes == null ? null : String(raw.notes),
    lado: raw.lado == null ? null : String(raw.lado),
    posicaoLong: raw.posicao_long == null ? null : String(raw.posicao_long),
    posicaoVert: raw.posicao_vert == null ? null : String(raw.posicao_vert),
    validationStatus: String(raw.validation_status ?? 'draft'),
    makerName: makerName ?? null,
    modelName: modelName ?? null,
    engine: vv?.engine ?? null,
    fuel: vv?.fuel ?? null,
    versionName: vv?.version_name ?? null,
    versionYear: vv?.year ?? null,
  }
}

const PVC_SELECT = `
  id, notes, vehicle_version_id, product_id,
  year_start, year_end, lado, posicao_long, posicao_vert, validation_status,
  vehicle_versions (
    id, year, year_start, year_end, engine, fuel, version_name, generation, manufacturer_id, model_id,
    manufacturers ( id, name ),
    models ( id, name, production_year_start, production_year_end )
  )
`

export async function adminListApplications(productId: string) {
  const { data, error } = await getSupabase()
    .from('product_vehicle_compatibility')
    .select(PVC_SELECT)
    .eq('product_id', productId)
  if (error) throw error
  return data ?? []
}

export async function adminListAllApplications(params?: {
  q?: string
  limit?: number
}): Promise<AdminApplicationHubRow[]> {
  const limit = params?.limit ?? 200
  let productIds: string[] | null = null
  if (params?.q?.trim()) {
    const term = params.q.trim()
    const { data: prods, error: prodErr } = await getSupabase()
      .from('products')
      .select('id')
      .or(`name.ilike.%${term}%,sku.ilike.%${term}%`)
      .limit(80)
    if (prodErr) throw prodErr
    productIds = (prods ?? []).map((p) => String(p.id))
    if (productIds.length === 0) return []
  }

  let q = getSupabase()
    .from('product_vehicle_compatibility')
    .select(
      `
      ${PVC_SELECT},
      products ( id, sku, name )
    `,
    )
    .order('id', { ascending: false })
    .limit(limit)

  if (productIds) q = q.in('product_id', productIds)

  const { data, error } = await q
  if (error) throw error
  return (data ?? []).map((row) => mapApplicationHubRow(row as Record<string, unknown>))
}

export async function adminAddApplication(
  productId: string,
  vehicleVersionId: string,
  input?: {
    notes?: string
    yearStart?: number | null
    yearEnd?: number | null
    validationStatus?: PvcValidationStatus
  } & PvcApplicationPosition,
) {
  const { error } = await getSupabase().from('product_vehicle_compatibility').upsert(
    {
      product_id: productId,
      vehicle_version_id: vehicleVersionId,
      notes: input?.notes?.trim() || null,
      year_start: input?.yearStart ?? null,
      year_end: input?.yearEnd ?? null,
      lado: input?.lado ?? null,
      posicao_long: input?.posicaoLong ?? null,
      posicao_vert: input?.posicaoVert ?? null,
      validation_status: input?.validationStatus ?? 'draft',
    },
    { onConflict: 'product_id,vehicle_version_id' },
  )
  if (error) throw error
}

export async function adminUpdateApplication(id: string, patch: AdminApplicationPatch): Promise<void> {
  const payload: Record<string, unknown> = {}
  if (patch.notes !== undefined) payload.notes = patch.notes?.trim() || null
  if (patch.yearStart !== undefined) payload.year_start = patch.yearStart
  if (patch.yearEnd !== undefined) payload.year_end = patch.yearEnd
  if (patch.lado !== undefined) payload.lado = patch.lado
  if (patch.posicaoLong !== undefined) payload.posicao_long = patch.posicaoLong
  if (patch.posicaoVert !== undefined) payload.posicao_vert = patch.posicaoVert
  if (patch.validationStatus !== undefined) payload.validation_status = patch.validationStatus
  if (patch.vehicleVersionId !== undefined) {
    payload.vehicle_version_id = patch.vehicleVersionId.trim()
  }
  if (!Object.keys(payload).length) return
  const { error } = await getSupabase()
    .from('product_vehicle_compatibility')
    .update(payload)
    .eq('id', id)
  if (error) {
    if (error.code === '23505') {
      throw new Error('Este produto já possui aplicação para essa configuração veicular')
    }
    throw error
  }
}

export async function adminRemoveApplication(id: string) {
  const { error } = await getSupabase().from('product_vehicle_compatibility').delete().eq('id', id)
  if (error) throw error
}

export type AdminKitComponentRow = {
  id: string
  kitProductId: string
  componentProductId: string
  quantity: number
  sortOrder: number
  componentSku: string
  componentName: string
}

export async function adminListKitComponents(kitProductId: string): Promise<AdminKitComponentRow[]> {
  const { data, error } = await getSupabase()
    .from('product_kit_components')
    .select(
      `
      id, kit_product_id, component_product_id, quantity, sort_order,
      products!product_kit_components_component_product_id_fkey ( sku, name )
    `,
    )
    .eq('kit_product_id', kitProductId)
    .order('sort_order')
  if (error) throw error
  return (data ?? []).map((row) => {
    const p = row.products as { sku?: string; name?: string } | { sku?: string; name?: string }[] | null
    const prod = Array.isArray(p) ? p[0] : p
    return {
      id: String(row.id),
      kitProductId: String(row.kit_product_id),
      componentProductId: String(row.component_product_id),
      quantity: Number(row.quantity),
      sortOrder: Number(row.sort_order ?? 0),
      componentSku: String(prod?.sku ?? ''),
      componentName: String(prod?.name ?? ''),
    }
  })
}

async function syncKitPhotosAfterBom(kitProductId: string): Promise<void> {
  const rows = await adminListKitComponents(kitProductId)
  const { adminEnsureKitImageFromComponents } = await import('@/services/admin/adminImageService')
  await adminEnsureKitImageFromComponents(
    kitProductId,
    rows.map((r) => r.componentProductId),
  )
}

export async function adminAddKitComponent(
  kitProductId: string,
  componentProductId: string,
  quantity = 1,
): Promise<void> {
  if (kitProductId === componentProductId) throw new Error('Kit não pode incluir a si mesmo')
  const qty = Math.max(0.001, Number(quantity) || 1)
  const existing = await adminListKitComponents(kitProductId)
  const dup = existing.find((r) => r.componentProductId === componentProductId)
  if (dup) {
    await adminUpdateKitComponentQuantity(dup.id, dup.quantity + qty)
    return
  }
  const nextSort =
    existing.length > 0 ? Math.max(...existing.map((r) => r.sortOrder), -1) + 1 : 0
  const { error } = await getSupabase().from('product_kit_components').insert({
    kit_product_id: kitProductId,
    component_product_id: componentProductId,
    quantity: qty,
    sort_order: nextSort,
  })
  if (error) throw error
  await syncKitPhotosAfterBom(kitProductId)
}

export async function adminUpdateKitComponentQuantity(id: string, quantity: number): Promise<void> {
  const qty = Math.max(0.001, Number(quantity) || 1)
  const { data, error } = await getSupabase()
    .from('product_kit_components')
    .update({ quantity: qty })
    .eq('id', id)
    .select('kit_product_id')
    .single()
  if (error) throw error
  if (data?.kit_product_id) await syncKitPhotosAfterBom(String(data.kit_product_id))
}

export async function adminRemoveKitComponent(id: string): Promise<void> {
  const { data, error: getErr } = await getSupabase()
    .from('product_kit_components')
    .select('kit_product_id')
    .eq('id', id)
    .maybeSingle()
  if (getErr) throw getErr
  const { error } = await getSupabase().from('product_kit_components').delete().eq('id', id)
  if (error) throw error
  if (data?.kit_product_id) await syncKitPhotosAfterBom(String(data.kit_product_id))
}

export async function adminSetProductKind(
  productId: string,
  productKind: 'item' | 'kit',
): Promise<void> {
  const { error } = await getSupabase()
    .from('products')
    .update({ product_kind: productKind })
    .eq('id', productId)
  if (error) throw error
}

/** Regra de publicação: ≥2 linhas BOM, ou 1 linha com qty ≥ 2. */
export function isKitCompositionPublishable(rows: AdminKitComponentRow[]): boolean {
  if (rows.length >= 2) return true
  if (rows.length === 1 && rows[0]!.quantity >= 2) return true
  return false
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
