import { getSupabase, isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { Product } from '@/types'
import { getProductById } from '@/services/products/productService'

/** IDs de equivalentes técnicos ativos. */
export async function listEquivalentProductIds(productId: string): Promise<string[]> {
  if (!isSupabaseConfigured || !supabase) return []
  const { data, error } = await getSupabase()
    .from('product_equivalences')
    .select('equivalent_product_id')
    .eq('product_id', productId)
    .eq('active', true)
  if (error) throw error
  return (data ?? []).map((r) => String(r.equivalent_product_id))
}

/** Mapa productId → SKUs equivalentes (vitrine / busca). */
export async function mapEquivalentSkus(
  productIds: string[],
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>()
  if (!isSupabaseConfigured || !supabase) return map
  const ids = [...new Set(productIds.filter(Boolean))]
  if (!ids.length) return map

  const { data, error } = await getSupabase()
    .from('product_equivalences')
    .select(
      `
      product_id,
      products!equivalent_product_id ( sku, status )
    `,
    )
    .in('product_id', ids)
    .eq('active', true)
  if (error) throw error

  for (const row of data ?? []) {
    const pid = String((row as { product_id: string }).product_id)
    const prod = (
      row as {
        products:
          | { sku?: string; status?: string }
          | { sku?: string; status?: string }[]
          | null
      }
    ).products
    const p = Array.isArray(prod) ? prod[0] : prod
    if (!p?.sku) continue
    if (p.status && p.status !== 'published') continue
    const list = map.get(pid) ?? []
    list.push(String(p.sku))
    map.set(pid, list)
  }
  return map
}

/** Produtos equivalentes publicados (PDP / busca). */
export async function listEquivalentProducts(
  productId: string,
  limit = 12,
): Promise<Product[]> {
  const ids = await listEquivalentProductIds(productId)
  if (!ids.length) return []
  const out: Product[] = []
  for (const id of ids.slice(0, limit)) {
    try {
      const p = await getProductById(id)
      if (p) out.push(p)
    } catch {
      /* skip invisible */
    }
  }
  return out
}
