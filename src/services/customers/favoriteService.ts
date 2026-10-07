import { getSupabase } from '@/lib/supabase'
import { attachResolvedPrices } from '@/services/pricing/priceResolutionService'
import type { Product } from '@/types'

const PRODUCT_SELECT = `
  id, sku, name, slug, price, promo_price, status, brand_id, category_id, is_available,
  product_brands ( name )
`

function mapProduct(row: Record<string, unknown>): Product {
  const brandRaw = row.product_brands as { name?: string } | { name?: string }[] | null
  const brand = Array.isArray(brandRaw) ? brandRaw[0]?.name : brandRaw?.name
  return {
    id: String(row.id),
    sku: String(row.sku),
    name: String(row.name),
    slug: String(row.slug),
    price: Number(row.price),
    promoPrice: row.promo_price == null ? null : Number(row.promo_price),
    status: row.status as Product['status'],
    brand,
    brandId: (row.brand_id as string | null) ?? null,
    categoryId: (row.category_id as string | null) ?? undefined,
    available: Boolean(row.is_available),
  }
}

export async function listFavoriteProducts(): Promise<Product[]> {
  const sb = getSupabase()
  const { data: auth } = await sb.auth.getUser()
  const uid = auth.user?.id
  if (!uid) return []

  const { data, error } = await sb
    .from('favorites')
    .select(`product_id, products ( ${PRODUCT_SELECT} )`)
    .eq('user_id', uid)
    .order('created_at', { ascending: false })
  if (error) throw error

  const products = (data ?? [])
    .map((row) => {
      const raw = row.products as unknown
      const p = (Array.isArray(raw) ? raw[0] : raw) as Record<string, unknown> | null
      return p ? mapProduct(p) : null
    })
    .filter((p): p is Product => Boolean(p))
  return attachResolvedPrices(products)
}

export async function isFavorite(productId: string): Promise<boolean> {
  const sb = getSupabase()
  const { data: auth } = await sb.auth.getUser()
  const uid = auth.user?.id
  if (!uid) return false
  const { data, error } = await sb
    .from('favorites')
    .select('product_id')
    .eq('user_id', uid)
    .eq('product_id', productId)
    .maybeSingle()
  if (error) throw error
  return Boolean(data)
}

export async function addFavorite(productId: string): Promise<void> {
  const sb = getSupabase()
  const { data: auth } = await sb.auth.getUser()
  const uid = auth.user?.id
  if (!uid) throw new Error('Faça login para favoritar')
  const { error } = await sb.from('favorites').upsert({ user_id: uid, product_id: productId })
  if (error) throw error
}

export async function removeFavorite(productId: string): Promise<void> {
  const sb = getSupabase()
  const { data: auth } = await sb.auth.getUser()
  const uid = auth.user?.id
  if (!uid) return
  const { error } = await sb.from('favorites').delete().eq('user_id', uid).eq('product_id', productId)
  if (error) throw error
}

export async function toggleFavorite(productId: string): Promise<boolean> {
  const liked = await isFavorite(productId)
  if (liked) {
    await removeFavorite(productId)
    return false
  }
  await addFavorite(productId)
  return true
}
