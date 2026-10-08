import { mockProducts } from '@/data/mocks/products'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { attachResolvedPrices } from '@/services/pricing/priceResolutionService'
import { attachCompatibilitySummaries } from '@/services/products/compatibilitySummary'
import type { Product } from '@/types'

type Named = { name: string; id?: string; slug?: string }

function asNamed(value: unknown): Named | null {
  if (!value) return null
  if (Array.isArray(value)) {
    const first = value[0] as Named | undefined
    return first?.name ? first : null
  }
  const obj = value as Named
  return obj.name ? obj : null
}

function mapProduct(row: Record<string, unknown>): Product {
  const brand = asNamed(row.product_brands)
  const category = asNamed(row.product_categories)

  return {
    id: String(row.id),
    sku: String(row.sku),
    name: String(row.name),
    slug: String(row.slug),
    description: (row.description as string | null) ?? undefined,
    shortDescription: (row.short_description as string | null) ?? undefined,
    brand: brand?.name,
    brandId: (row.brand_id as string | null) ?? null,
    supplierId: (row.supplier_id as string | null) ?? null,
    categoryId: category?.id ?? (row.category_id as string | undefined),
    categoryName: category?.name,
    categorySlug: category?.slug,
    price: Number(row.price),
    promoPrice: row.promo_price == null ? null : Number(row.promo_price),
    status: row.status as Product['status'],
    manufacturerCode: (row.manufacturer_code as string | null) ?? undefined,
    available: Boolean(row.is_available),
    isIncomplete: Boolean(row.is_incomplete),
    posicao: (row.posicao as Product['posicao']) ?? null,
    lado: (row.lado as Product['lado']) ?? null,
    attrs: (row.attrs as Record<string, unknown> | null) ?? {},
    stock: undefined,
  }
}

const PRODUCT_SELECT = `
  id, sku, name, slug, description, short_description, price, promo_price, status,
  manufacturer_code, is_available, is_incomplete, category_id, brand_id, supplier_id,
  posicao, lado, attrs,
  product_brands ( name ),
  product_categories ( id, name, slug )
`

/**
 * Produtos published via Supabase + RLS.
 * Fallback mock só sem configuração Supabase.
 */
export async function listFeaturedProducts(limit = 8): Promise<Product[]> {
  return listPublishedProducts(limit)
}

export async function listPublishedProducts(limit = 40): Promise<Product[]> {
  if (!isSupabaseConfigured || !supabase) {
    return mockProducts.filter((p) => p.status === 'published').slice(0, limit)
  }

  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  const products = (data ?? []).map((row) => mapProduct(row as Record<string, unknown>))
  const withApps = await attachCompatibilitySummaries(products, {
    compact: true,
    maxEntries: 4,
  })
  return attachResolvedPrices(withApps)
}

/** IDs de produtos compatíveis com filtros parciais de veículo. */
export async function filterProductIdsByVehicle(filter: {
  maker?: string | null
  model?: string | null
  year?: string | null
  engine?: string | null
  version?: string | null
}): Promise<string[] | null> {
  const maker = filter.maker?.trim()
  const model = filter.model?.trim()
  const year = filter.year?.trim()
  const engine = filter.engine?.trim()
  const version = filter.version?.trim()
  if (!maker && !model && !year && !engine && !version) return null

  if (!isSupabaseConfigured || !supabase) {
    return mockProducts
      .filter((p) => {
        const hay = (p.compatibilitySummary ?? '').toLowerCase()
        return (
          (!maker || hay.includes(maker.toLowerCase())) &&
          (!model || hay.includes(model.toLowerCase())) &&
          (!year || hay.includes(year)) &&
          (!engine || hay.includes(engine.toLowerCase())) &&
          (!version || hay.includes(version.toLowerCase()))
        )
      })
      .map((p) => p.id)
  }

  // NULL estrito: eq('year', 2012) NÃO inclui year NULL (evita falso positivo).
  let versionQuery = supabase
    .from('vehicle_versions')
    .select('id, year, engine, version_name, manufacturers!inner(name), models!inner(name)')
    .eq('status', 'active')

  if (year) versionQuery = versionQuery.eq('year', Number(year))
  if (engine) versionQuery = versionQuery.eq('engine', engine)
  if (version) versionQuery = versionQuery.eq('version_name', version)

  const { data: versions, error: vErr } = await versionQuery
  if (vErr) throw vErr

  const versionIds = (versions ?? [])
    .filter((v) => {
      const makerName = asNamed(v.manufacturers)?.name
      const modelName = asNamed(v.models)?.name
      if (maker && makerName?.toLowerCase() !== maker.toLowerCase()) return false
      if (model && modelName?.toLowerCase() !== model.toLowerCase()) return false
      return true
    })
    .map((v) => String(v.id))

  if (!versionIds.length) return []

  const { data: apps, error: aErr } = await supabase
    .from('product_vehicle_compatibility')
    .select('product_id')
    .in('vehicle_version_id', versionIds)

  if (aErr) throw aErr
  return [...new Set((apps ?? []).map((a) => String(a.product_id)))]
}

export async function getProductById(id: string): Promise<Product | null> {
  if (!isSupabaseConfigured || !supabase) {
    return mockProducts.find((p) => p.id === id) ?? null
  }

  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('id', id)
    .eq('status', 'published')
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const product = mapProduct(data as Record<string, unknown>)

  const { data: refs } = await supabase
    .from('product_references')
    .select('code, ref_type, brand_label')
    .eq('product_id', id)

  if (refs?.length) {
    product.references = refs.map((r) => ({
      code: String(r.code),
      type: String(r.ref_type),
      brandId: null,
      brandLabel: (r.brand_label as string | null) ?? undefined,
      status: 'active' as const,
    }))
  }

  const [withApps] = await attachCompatibilitySummaries([product], {
    compact: false,
    maxEntries: 40,
  })
  const [resolved] = await attachResolvedPrices([withApps ?? product])
  return resolved ?? withApps ?? product
}

/** @deprecated Preferir `searchCatalog` (Fase 4). Mantido como fachada. */
export async function searchProducts(query: string): Promise<Product[]> {
  const { searchCatalog } = await import('@/services/search/searchService')
  const result = await searchCatalog({ q: query, page: 1, pageSize: 40, sort: 'relevance' })
  return result.items
}
