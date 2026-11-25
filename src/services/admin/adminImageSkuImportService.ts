import { isLikelyImageFile, skuKeyFromImageFilename } from '@/lib/skuFromImageFilename'
import { getSupabase } from '@/lib/supabase'
import { toUserMessage } from '@/lib/toUserMessage'
import { adminUploadImage } from '@/services/admin/adminImageService'

export type ImageSkuMatchStatus = 'ok' | 'skip' | 'error'

export type ImageSkuMatchRow = {
  fileName: string
  key: string | null
  productId: string | null
  productLabel: string | null
  status: ImageSkuMatchStatus
  message: string
}

type ProductHit = {
  id: string
  sku: string
  manufacturer_code: string | null
  name: string
}

function norm(s: string): string {
  return s.trim().toLowerCase()
}

/** Variantes de caixa para `.in()` (Postgres text é case-sensitive). */
function keyCaseVariants(keys: string[]): string[] {
  const out = new Set<string>()
  for (const k of keys) {
    const t = k.trim()
    if (!t) continue
    out.add(t)
    out.add(t.toUpperCase())
    out.add(t.toLowerCase())
  }
  return [...out]
}

async function loadProductsByKeys(keys: string[]): Promise<Map<string, ProductHit[]>> {
  const map = new Map<string, ProductHit[]>()
  const unique = [...new Set(keys.map((k) => k.trim()).filter(Boolean))]
  if (!unique.length) return map

  const sb = getSupabase()
  const chunkSize = 80
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize)
    const variants = keyCaseVariants(chunk)
    const [{ data: bySku, error: e1 }, { data: byMfr, error: e2 }, { data: byRef, error: e3 }] =
      await Promise.all([
        sb.from('products').select('id, sku, manufacturer_code, name').in('sku', variants),
        sb
          .from('products')
          .select('id, sku, manufacturer_code, name')
          .in('manufacturer_code', variants),
        sb.from('product_references').select('code, product_id').in('code', variants),
      ])
    if (e1) throw e1
    if (e2) throw e2
    if (e3) throw e3

    const fromDirect = [...(bySku ?? []), ...(byMfr ?? [])] as ProductHit[]
    for (const row of fromDirect) {
      const keysFor = new Set<string>()
      keysFor.add(norm(row.sku))
      if (row.manufacturer_code?.trim()) keysFor.add(norm(row.manufacturer_code))
      for (const k of keysFor) {
        const list = map.get(k) ?? []
        if (!list.some((p) => p.id === row.id)) list.push(row)
        map.set(k, list)
      }
    }

    const refRows = (byRef ?? []) as Array<{ code: string; product_id: string }>
    const missingIds = [
      ...new Set(
        refRows
          .map((r) => r.product_id)
          .filter((id) => !fromDirect.some((p) => p.id === id)),
      ),
    ]
    if (missingIds.length) {
      const { data: byId, error: e4 } = await sb
        .from('products')
        .select('id, sku, manufacturer_code, name')
        .in('id', missingIds)
      if (e4) throw e4
      const byIdMap = new Map((byId ?? []).map((r) => [String(r.id), r as ProductHit]))
      for (const ref of refRows) {
        const p = byIdMap.get(ref.product_id) ?? fromDirect.find((x) => x.id === ref.product_id)
        if (!p) continue
        const k = norm(ref.code)
        const list = map.get(k) ?? []
        if (!list.some((x) => x.id === p.id)) list.push(p)
        map.set(k, list)
      }
    } else {
      for (const ref of refRows) {
        const p = fromDirect.find((x) => x.id === ref.product_id)
        if (!p) continue
        const k = norm(ref.code)
        const list = map.get(k) ?? []
        if (!list.some((x) => x.id === p.id)) list.push(p)
        map.set(k, list)
      }
    }
  }
  return map
}

async function productsWithAnyImage(productIds: string[]): Promise<Set<string>> {
  const out = new Set<string>()
  if (!productIds.length) return out
  const sb = getSupabase()
  const chunkSize = 100
  for (let i = 0; i < productIds.length; i += chunkSize) {
    const chunk = productIds.slice(i, i + chunkSize)
    const { data, error } = await sb.from('product_images').select('product_id').in('product_id', chunk)
    if (error) throw error
    for (const row of data ?? []) out.add(String((row as { product_id: string }).product_id))
  }
  return out
}

/** Prévia: casa arquivo → produto (SKU, manufacturer_code ou referência). */
export async function adminPreviewImageSkuImport(
  files: File[],
  opts?: { skipIfHasImage?: boolean },
): Promise<ImageSkuMatchRow[]> {
  const skipIfHasImage = opts?.skipIfHasImage ?? false
  const rows: ImageSkuMatchRow[] = []
  const keys: string[] = []

  for (const file of files) {
    if (!isLikelyImageFile(file)) {
      rows.push({
        fileName: file.name,
        key: null,
        productId: null,
        productLabel: null,
        status: 'error',
        message: 'Arquivo não é imagem',
      })
      continue
    }
    const key = skuKeyFromImageFilename(file.name)
    if (!key) {
      rows.push({
        fileName: file.name,
        key: null,
        productId: null,
        productLabel: null,
        status: 'error',
        message: 'Nome sem código reconhecível',
      })
      continue
    }
    keys.push(key)
    rows.push({
      fileName: file.name,
      key,
      productId: null,
      productLabel: null,
      status: 'ok',
      message: '—',
    })
  }

  const productMap = await loadProductsByKeys(keys)
  const pendingIds: string[] = []

  for (const row of rows) {
    if (row.status === 'error' || !row.key) continue
    const hits = productMap.get(norm(row.key)) ?? []
    if (hits.length === 0) {
      row.status = 'error'
      row.message = 'Código não encontrado'
      continue
    }
    if (hits.length > 1) {
      row.status = 'error'
      row.message = `Ambíguo (${hits.length} produtos)`
      continue
    }
    const p = hits[0]!
    row.productId = p.id
    row.productLabel = `${p.sku} · ${p.name}`
    row.message = 'Pronto'
    pendingIds.push(p.id)
  }

  if (skipIfHasImage && pendingIds.length) {
    const withImg = await productsWithAnyImage(pendingIds)
    for (const row of rows) {
      if (row.status !== 'ok' || !row.productId) continue
      if (withImg.has(row.productId)) {
        row.status = 'skip'
        row.message = 'Já tem imagem — pulado'
      }
    }
  }

  return rows
}

export type ImageSkuApplyProgress = {
  done: number
  total: number
  currentFile: string | null
}

export type ImageSkuApplyResult = {
  ok: number
  skip: number
  error: number
  rows: ImageSkuMatchRow[]
}

/** Aplica uploads na ordem; reporta progresso. */
export async function adminApplyImageSkuImport(
  files: File[],
  preview: ImageSkuMatchRow[],
  onProgress?: (p: ImageSkuApplyProgress) => void,
): Promise<ImageSkuApplyResult> {
  const byName = new Map(files.map((f) => [f.name, f]))
  const out: ImageSkuMatchRow[] = preview.map((r) => ({ ...r }))
  const total = out.filter((r) => r.status === 'ok').length
  let done = 0
  let ok = 0
  let skip = 0
  let error = 0

  for (const row of out) {
    if (row.status === 'skip') {
      skip += 1
      continue
    }
    if (row.status === 'error') {
      error += 1
      continue
    }
    const file = byName.get(row.fileName)
    if (!file || !row.productId) {
      row.status = 'error'
      row.message = 'Arquivo ausente na aplicação'
      error += 1
      continue
    }
    onProgress?.({ done, total, currentFile: row.fileName })
    try {
      await adminUploadImage(row.productId, file)
      row.status = 'ok'
      row.message = 'Enviado'
      ok += 1
    } catch (err) {
      row.status = 'error'
      row.message = toUserMessage(err, 'Falha no upload')
      error += 1
    }
    done += 1
    onProgress?.({ done, total, currentFile: row.fileName })
  }

  onProgress?.({ done: total, total, currentFile: null })
  return { ok, skip, error, rows: out }
}
