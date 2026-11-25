import { isSupabaseConfigured, supabase } from '@/lib/supabase'

const BUCKET = 'product-images'

export type StoreKitCompositionLine = {
  componentProductId: string
  sku: string
  name: string
  slug: string
  quantity: number
  sortOrder: number
  imageUrl?: string
}

export type StoreKitComposition = {
  kitProductId: string
  lines: StoreKitCompositionLine[]
}

function publicUrl(path: string): string {
  if (!supabase) return ''
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

/** BOM público do kit (só se kit publicado; RLS). */
export async function loadStoreKitComposition(
  kitProductId: string,
): Promise<StoreKitComposition | null> {
  if (!isSupabaseConfigured || !supabase) return null

  const { data, error } = await supabase
    .from('product_kit_components')
    .select(
      `
      quantity, sort_order, component_product_id,
      products!product_kit_components_component_product_id_fkey (
        id, sku, name, slug, status
      )
    `,
    )
    .eq('kit_product_id', kitProductId)
    .order('sort_order')

  if (error) throw error
  if (!data?.length) return { kitProductId, lines: [] }

  const lines: StoreKitCompositionLine[] = []
  for (const row of data) {
    const p = row.products as
      | { id?: string; sku?: string; name?: string; slug?: string; status?: string }
      | { id?: string; sku?: string; name?: string; slug?: string; status?: string }[]
      | null
    const prod = Array.isArray(p) ? p[0] : p
    if (!prod?.id) continue
    lines.push({
      componentProductId: String(prod.id),
      sku: String(prod.sku ?? ''),
      name: String(prod.name ?? ''),
      slug: String(prod.slug ?? ''),
      quantity: Number(row.quantity),
      sortOrder: Number(row.sort_order ?? 0),
    })
  }

  const ids = lines.map((l) => l.componentProductId)
  const byId = new Map<string, string>()
  if (ids.length) {
    const { data: imgs } = await supabase
      .from('product_images')
      .select('product_id, storage_path, sort_order, is_primary')
      .in('product_id', ids)
    const grouped = new Map<string, { storage_path: string; sort_order: number; is_primary: boolean }[]>()
    for (const row of imgs ?? []) {
      const list = grouped.get(String(row.product_id)) ?? []
      list.push({
        storage_path: String(row.storage_path),
        sort_order: Number(row.sort_order ?? 0),
        is_primary: Boolean(row.is_primary),
      })
      grouped.set(String(row.product_id), list)
    }
    for (const [pid, list] of grouped) {
      const primary =
        list.find((i) => i.is_primary) ??
        [...list].sort((a, b) => a.sort_order - b.sort_order)[0]
      if (primary) byId.set(pid, publicUrl(primary.storage_path))
    }
  }

  return {
    kitProductId,
    lines: lines.map((l) => ({ ...l, imageUrl: byId.get(l.componentProductId) })),
  }
}
