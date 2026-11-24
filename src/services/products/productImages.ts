import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { Product } from '@/types'

const BUCKET = 'product-images'

type ImageRow = {
  product_id: string
  storage_path: string
  sort_order: number
  is_primary: boolean
}

/** Ordena paths: is_primary primeiro, depois sort_order asc. */
export function sortProductImagePaths(rows: ImageRow[]): string[] {
  if (!rows.length) return []
  return [...rows]
    .filter((r) => Boolean(r.storage_path))
    .sort((a, b) => {
      if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1
      return a.sort_order - b.sort_order
    })
    .map((r) => r.storage_path)
}

/** Escolhe path da imagem primária (is_primary) ou menor sort_order. */
export function pickPrimaryStoragePath(rows: ImageRow[]): string | null {
  const sorted = sortProductImagePaths(rows)
  return sorted[0] ?? null
}

function publicUrl(path: string): string | null {
  if (!supabase) return null
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl || null
}

function pathsToPublicUrls(paths: string[]): string[] {
  const urls: string[] = []
  for (const path of paths) {
    const url = publicUrl(path)
    if (url) urls.push(url)
  }
  return urls
}

/**
 * Anexa `imageUrl` a partir de `product_images` (Storage).
 * Produtos sem linha mantêm imageUrl ausente (placeholder na UI).
 */
export async function attachPrimaryProductImages<T extends Product>(products: T[]): Promise<T[]> {
  if (!products.length || !isSupabaseConfigured || !supabase) return products
  const ids = products.map((p) => p.id)
  const { data, error } = await supabase
    .from('product_images')
    .select('product_id, storage_path, sort_order, is_primary')
    .in('product_id', ids)
  if (error) throw error

  const byProduct = new Map<string, ImageRow[]>()
  for (const row of (data ?? []) as ImageRow[]) {
    const list = byProduct.get(row.product_id) ?? []
    list.push(row)
    byProduct.set(row.product_id, list)
  }

  return products.map((p) => {
    const path = pickPrimaryStoragePath(byProduct.get(p.id) ?? [])
    if (!path) return p
    const url = publicUrl(path)
    if (!url) return p
    return { ...p, imageUrl: url }
  })
}

/**
 * Anexa galeria completa (`images[]` + `imageUrl` primária) para PDP.
 */
export async function attachProductImageGallery<T extends Product>(product: T): Promise<T> {
  if (!isSupabaseConfigured || !supabase) return product
  const { data, error } = await supabase
    .from('product_images')
    .select('product_id, storage_path, sort_order, is_primary')
    .eq('product_id', product.id)
  if (error) throw error

  const paths = sortProductImagePaths((data ?? []) as ImageRow[])
  const urls = pathsToPublicUrls(paths)
  if (!urls.length) return product
  return {
    ...product,
    images: urls,
    imageUrl: urls[0],
  }
}
