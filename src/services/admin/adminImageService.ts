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

/** Mapa productId → URL da imagem principal (ou primeira). */
export async function adminPrimaryImageUrlMap(
  productIds: string[],
): Promise<Record<string, string>> {
  const ids = [...new Set(productIds.map((id) => String(id).trim()).filter(Boolean))]
  if (!ids.length) return {}
  const { data, error } = await getSupabase()
    .from('product_images')
    .select('product_id, storage_path, is_primary, sort_order')
    .in('product_id', ids)
    .order('sort_order')
  if (error) throw error
  const best = new Map<string, { path: string; primary: boolean; sort: number }>()
  for (const row of data ?? []) {
    const pid = String(row.product_id)
    const path = String(row.storage_path)
    const primary = Boolean(row.is_primary)
    const sort = Number(row.sort_order ?? 0)
    const cur = best.get(pid)
    if (!cur) {
      best.set(pid, { path, primary, sort })
      continue
    }
    if (primary && !cur.primary) {
      best.set(pid, { path, primary, sort })
      continue
    }
    if (primary === cur.primary && sort < cur.sort) {
      best.set(pid, { path, primary, sort })
    }
  }
  const out: Record<string, string> = {}
  for (const [pid, v] of best) out[pid] = publicUrl(v.path)
  return out
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
  // Só remove do Storage se o path for “próprio” deste produto.
  // Espelhos de kit reutilizam storage_path do item — apagar o arquivo quebraria o item.
  const kitOwned = image.storagePath.startsWith(`${image.productId}/`)
  if (kitOwned) {
    await sb.storage.from(BUCKET).remove([image.storagePath])
  }
  const { error } = await sb.from('product_images').delete().eq('id', image.id)
  if (error) throw error
  await refreshIncompleteFlag(image.productId)
}

/**
 * Copia a imagem principal de um produto para outro (reusa storage_path).
 * @returns true se copiou; false se origem sem imagem.
 */
export async function adminCopyPrimaryImageToProduct(input: {
  sourceProductId: string
  targetProductId: string
  /** Se true, remove imagens atuais do destino antes de copiar (só metadado). */
  replace?: boolean
}): Promise<boolean> {
  if (input.sourceProductId === input.targetProductId) return false
  const sourceImages = await adminListImages(input.sourceProductId)
  const primary = sourceImages.find((i) => i.isPrimary) ?? sourceImages[0] ?? null
  if (!primary) return false

  const targetImages = await adminListImages(input.targetProductId)
  if (input.replace && targetImages.length) {
    for (const img of targetImages) {
      const { error } = await getSupabase().from('product_images').delete().eq('id', img.id)
      if (error) throw error
    }
  } else if (targetImages.length && !input.replace) {
    return false
  }

  const { error } = await getSupabase().from('product_images').insert({
    product_id: input.targetProductId,
    storage_path: primary.storagePath,
    alt: primary.alt,
    sort_order: 0,
    is_primary: true,
  })
  if (error) throw error
  await refreshIncompleteFlag(input.targetProductId)
  return true
}

/**
 * Sincroniza fotos dos componentes no kit (padrão FAL):
 * - se kit sem foto → primeira vira capa;
 * - demais entram na galeria sem duplicar storage_path;
 * - remove espelhos de itens que saíram do BOM (não apaga uploads `${kitId}/`).
 */
export async function adminEnsureKitImageFromComponents(
  kitProductId: string,
  componentProductIds: string[],
): Promise<boolean> {
  const sb = getSupabase()
  const ids = [...new Set(componentProductIds.filter((id) => id && id !== kitProductId))]
  const desiredComponentPaths = new Set<string>()
  const componentPrimaries: Array<{ storagePath: string; alt: string | null }> = []

  for (const componentId of ids) {
    const sourceImages = await adminListImages(componentId)
    const primary = sourceImages.find((i) => i.isPrimary) ?? sourceImages[0] ?? null
    if (!primary) continue
    if (desiredComponentPaths.has(primary.storagePath)) continue
    desiredComponentPaths.add(primary.storagePath)
    componentPrimaries.push({ storagePath: primary.storagePath, alt: primary.alt ?? null })
  }

  let existing = await adminListImages(kitProductId)
  const kitOwnedPrefix = `${kitProductId}/`
  let changed = false

  for (const img of existing) {
    const isKitOwned = img.storagePath.startsWith(kitOwnedPrefix)
    if (isKitOwned) continue
    if (desiredComponentPaths.has(img.storagePath)) continue
    const { error } = await sb.from('product_images').delete().eq('id', img.id)
    if (error) throw error
    changed = true
  }

  if (changed) {
    existing = await adminListImages(kitProductId)
    if (existing.length && !existing.some((i) => i.isPrimary)) {
      await adminSetPrimaryImage(kitProductId, existing[0]!.id)
      existing = await adminListImages(kitProductId)
    }
  }

  const paths = new Set(existing.map((i) => i.storagePath))
  let nextSort =
    existing.length > 0 ? Math.max(...existing.map((i) => i.sortOrder), -1) + 1 : 0
  let makePrimary = existing.length === 0

  for (const primary of componentPrimaries) {
    if (paths.has(primary.storagePath)) continue
    const { error } = await sb.from('product_images').insert({
      product_id: kitProductId,
      storage_path: primary.storagePath,
      alt: primary.alt,
      sort_order: nextSort,
      is_primary: makePrimary,
    })
    if (error) throw error
    paths.add(primary.storagePath)
    nextSort += 1
    makePrimary = false
    changed = true
  }

  if (changed) await refreshIncompleteFlag(kitProductId)
  return changed
}
