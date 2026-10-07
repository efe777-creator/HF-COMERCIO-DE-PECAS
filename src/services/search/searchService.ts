import { mockProducts } from '@/data/mocks/products'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import {
  attachResolvedPrices,
  displayPrice,
} from '@/services/pricing/priceResolutionService'
import { attachCompatibilitySummaries } from '@/services/products/compatibilitySummary'
import type { Product, ProductSearchParams, ProductSearchResult, ProductSearchSort } from '@/types'

const DEFAULT_PAGE_SIZE = 24

function mapRpcRow(row: Record<string, unknown>): Product {
  return {
    id: String(row.id),
    sku: String(row.sku),
    name: String(row.name),
    slug: String(row.slug),
    description: (row.description as string | null) ?? undefined,
    shortDescription: (row.short_description as string | null) ?? undefined,
    brand: (row.brand_name as string | null) ?? undefined,
    brandId: (row.brand_id as string | null) ?? null,
    supplierId: (row.supplier_id as string | null) ?? null,
    categoryId: (row.category_id as string | null) ?? undefined,
    categoryName: (row.category_name as string | null) ?? undefined,
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

/** Completa posicao/lado da página atual (RPC search ainda não devolve esses campos). */
async function enrichPageProductMeta(products: Product[]): Promise<Product[]> {
  if (!products.length || !isSupabaseConfigured || !supabase) return products
  const ids = products.map((p) => p.id)
  const { data, error } = await supabase
    .from('products')
    .select('id, posicao, lado, manufacturer_code')
    .in('id', ids)
  if (error) throw error
  const meta = new Map(
    (data ?? []).map((r) => [
      String(r.id),
      {
        posicao: (r.posicao as Product['posicao']) ?? null,
        lado: (r.lado as Product['lado']) ?? null,
        manufacturerCode: (r.manufacturer_code as string | null) ?? undefined,
      },
    ]),
  )
  return products.map((p) => {
    const m = meta.get(p.id)
    if (!m) return p
    return {
      ...p,
      posicao: p.posicao ?? m.posicao,
      lado: p.lado ?? m.lado,
      manufacturerCode: p.manufacturerCode ?? m.manufacturerCode,
    }
  })
}

function normalizeSort(sort?: ProductSearchSort | null): ProductSearchSort {
  const allowed: ProductSearchSort[] = [
    'relevance',
    'price_asc',
    'price_desc',
    'name_asc',
    'name_desc',
  ]
  if (sort && allowed.includes(sort)) return sort
  return 'relevance'
}

function mockSearch(params: ProductSearchParams): ProductSearchResult {
  const q = (params.q ?? '').trim()
  const terms = q
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)

  let list = mockProducts.filter((p) => p.status === 'published')

  if (terms.length) {
    list = list.filter((p) => {
      const hay = [p.name, p.brand, p.sku, p.manufacturerCode, p.categoryName, p.compatibilitySummary]
        .filter(Boolean)
        .join(' ')
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .toLowerCase()
      return terms.every((t) => hay.includes(t))
    })
  }

  if (params.brand?.trim()) {
    const b = params.brand.trim().toLowerCase()
    list = list.filter((p) => (p.brand ?? '').toLowerCase() === b)
  }
  if (params.category?.trim()) {
    const c = params.category.trim().toLowerCase()
    list = list.filter(
      (p) =>
        (p.categoryName ?? '').toLowerCase() === c ||
        (p.categoryId ?? '').toLowerCase() === c,
    )
  }

  const sort = normalizeSort(params.sort)
  list = [...list].sort((a, b) => {
    if (sort === 'price_asc') return displayPrice(a) - displayPrice(b)
    if (sort === 'price_desc') return displayPrice(b) - displayPrice(a)
    if (sort === 'name_desc') return b.name.localeCompare(a.name, 'pt-BR')
    return a.name.localeCompare(b.name, 'pt-BR')
  })

  const pageSize = Math.min(Math.max(params.pageSize ?? DEFAULT_PAGE_SIZE, 1), 100)
  const page = Math.max(params.page ?? 1, 1)
  const total = list.length
  const start = (page - 1) * pageSize
  const items = list.slice(start, start + pageSize)

  return {
    items,
    total,
    page,
    pageSize,
    hasMore: start + items.length < total,
  }
}

/**
 * Contrato único do motor de busca (Fase 4).
 * Catálogo público deve chamar somente este service — ranking/filtros/total via RPC.
 */
export async function searchCatalog(params: ProductSearchParams = {}): Promise<ProductSearchResult> {
  const pageSize = Math.min(Math.max(params.pageSize ?? DEFAULT_PAGE_SIZE, 1), 100)
  const page = Math.max(params.page ?? 1, 1)
  const sort = normalizeSort(params.sort)

  if (!isSupabaseConfigured || !supabase) {
    return mockSearch({ ...params, page, pageSize, sort })
  }

  const { data, error } = await supabase.rpc('search_products', {
    p_q: params.q?.trim() || null,
    p_category: params.category?.trim() || null,
    p_brand: params.brand?.trim() || null,
    p_maker: params.maker?.trim() || null,
    p_model: params.model?.trim() || null,
    p_year: params.year?.trim() || null,
    p_engine: params.engine?.trim() || null,
    p_version: params.version?.trim() || null,
    p_sort: sort,
    p_page: page,
    p_page_size: pageSize,
  })

  if (error) throw error

  const rows = (data ?? []) as Record<string, unknown>[]
  const total = rows.length ? Number(rows[0].total_count ?? 0) : 0
  const mapped = rows.map(mapRpcRow)
  const withMeta = await enrichPageProductMeta(mapped)
  const withApps = await attachCompatibilitySummaries(withMeta, {
    compact: true,
    maxEntries: 4,
  })
  let items = await attachResolvedPrices(withApps)

  // Reordena a página pelo preço resolvido (RPC ainda usa preço legado)
  if (sort === 'price_asc' || sort === 'price_desc') {
    items = [...items].sort((a, b) =>
      sort === 'price_asc'
        ? displayPrice(a) - displayPrice(b)
        : displayPrice(b) - displayPrice(a),
    )
  }

  return {
    items,
    total,
    page,
    pageSize,
    hasMore: page * pageSize < total,
  }
}

/** @deprecated Preferir searchCatalog — mantido para compatibilidade pontual. */
export async function searchProductsLegacy(query: string): Promise<Product[]> {
  const result = await searchCatalog({ q: query, page: 1, pageSize: 40, sort: 'relevance' })
  return result.items
}
