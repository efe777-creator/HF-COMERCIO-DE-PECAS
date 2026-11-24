/**
 * Extrai a chave de match (SKU / código referência) do nome do arquivo.
 * Aceita variantes de galeria: `SKU_1.jpg`, `SKU_2.png`.
 */
export function skuKeyFromImageFilename(filename: string): string | null {
  const leaf = filename.replace(/^.*[/\\]/, '').trim()
  if (!leaf) return null
  const dot = leaf.lastIndexOf('.')
  if (dot === 0) return null
  const base = (dot > 0 ? leaf.slice(0, dot) : leaf).trim()
  if (!base) return null
  const cleaned = base.replace(/_\d+$/, '').trim()
  return cleaned || null
}

export function isLikelyImageFile(file: Pick<File, 'name' | 'type'>): boolean {
  if (file.type.startsWith('image/')) return true
  return /\.(jpe?g|png|webp|gif|bmp|avif)$/i.test(file.name)
}
