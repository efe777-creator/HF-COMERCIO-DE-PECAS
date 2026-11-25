import { mockProducts } from '@/data/mocks/products'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { attachResolvedPrices } from '@/services/pricing/priceResolutionService'
import { attachCompatibilitySummaries } from '@/services/products/compatibilitySummary'
import {
  attachPrimaryProductImages,
  attachProductImageGallery,
} from '@/services/products/productImages'
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
    productKind: row.product_kind === 'kit' ? 'kit' : 'item',
    stock: undefined,
  }
}

const PRODUCT_SELECT = `
  id, sku, name, slug, description, short_description, price, promo_price, status,
  manufacturer_code, is_available, is_incomplete, category_id, brand_id, supplier_id,
  posicao, lado, attrs, product_kind,
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
  const withImages = await attachPrimaryProductImages(withApps)
  return attachResolvedPrices(withImages)
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

  const withGallery = await attachProductImageGallery(product)
  const [withApps] = await attachCompatibilitySummaries([withGallery], {
    compact: false,
    maxEntries: 40,
  })
  const [resolved] = await attachResolvedPrices([withApps ?? withGallery])
  return resolved ?? withApps ?? withGallery
}

/** @deprecated Preferir `searchCatalog` (Fase 4). Mantido como fachada. */
export async function searchProducts(query: string): Promise<Product[]> {
  const { searchCatalog } = await import('@/services/search/searchService')
  const result = await searchCatalog({ q: query, page: 1, pageSize: 40, sort: 'relevance' })
  return result.items
}
