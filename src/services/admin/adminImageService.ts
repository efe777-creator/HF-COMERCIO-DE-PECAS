import { getSupabase } from '@/lib/supabase'
import { refreshIncompleteFlag } from '@/services/admin/adminProductService'
import type { ProductImage } from '@/types'

const BUCKET = 'product-images'

type Row = {
  id: string
  product_id: string
  storage_path: string
  alt: string | null
  sort_order: number
  is_primary: boolean
}

function publicUrl(path: string): string {
  const { data } = getSupabase().storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

function map(row: Row): ProductImage {
  return {
    id: row.id,
    productId: row.product_id,
    storagePath: row.storage_path,
    alt: row.alt,
    sortOrder: row.sort_order,
    isPrimary: row.is_primary,
    publicUrl: publicUrl(row.storage_path),
  }
}

export async function adminListImages(productId: string): Promise<ProductImage[]> {
  const { data, error } = await getSupabase()
    .from('product_images')
    .select('id, product_id, storage_path, alt, sort_order, is_primary')
    .eq('product_id', productId)
    .order('sort_order')
  if (error) throw error
  return (data as Row[]).map(map)
}

export async function adminUploadImage(productId: string, file: File, alt?: string) {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${productId}/${crypto.randomUUID()}.${ext}`
  const { error: upErr } = await getSupabase().storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || undefined,
  })
  if (upErr) throw upErr

  const existing = await adminListImages(productId)
  const { data, error } = await getSupabase()
    .from('product_images')
    .insert({
      product_id: productId,
      storage_path: path,
      alt: alt?.trim() || null,
      sort_order: existing.length,
      is_primary: existing.length === 0,
    })
    .select('id, product_id, storage_path, alt, sort_order, is_primary')
    .single()
  if (error) throw error
  await refreshIncompleteFlag(productId)
  return map(data as Row)
}

export async function adminSetPrimaryImage(productId: string, imageId: string) {
  const sb = getSupabase()
  const { error: clearErr } = await sb
    .from('product_images')
    .update({ is_primary: false })
    .eq('product_id', productId)
  if (clearErr) throw clearErr
  const { error } = await sb.from('product_images').update({ is_primary: true }).eq('id', imageId)
  if (error) throw error
}

export async function adminDeleteImage(image: ProductImage) {
  const sb = getSupabase()
  await sb.storage.from(BUCKET).remove([image.storagePath])
  const { error } = await sb.from('product_images').delete().eq('id', image.id)
  if (error) throw error
  await refreshIncompleteFlag(image.productId)
}
