import { getSupabase } from '@/lib/supabase'

export const EQUIVALENCE_EVIDENCE_DEFAULT = 'cadastro_interno_hf'

export type AdminEquivalenceRow = {
  equivalentProductId: string
  evidence: string
  active: boolean
  name: string
  sku: string
  status: string
}

type EquivJoinRow = {
  equivalent_product_id: string
  evidence: string
  active: boolean
  products:
    | {
        id: string
        name: string
        sku: string
        status: string
      }
    | {
        id: string
        name: string
        sku: string
        status: string
      }[]
    | null
}

function mapRow(r: EquivJoinRow): AdminEquivalenceRow {
  const p = Array.isArray(r.products) ? r.products[0]! : r.products!
  return {
    equivalentProductId: r.equivalent_product_id,
    evidence: r.evidence || EQUIVALENCE_EVIDENCE_DEFAULT,
    active: r.active,
    name: p.name,
    sku: p.sku,
    status: p.status,
  }
}

export async function adminListProductEquivalences(
  productId: string,
): Promise<AdminEquivalenceRow[]> {
  const { data, error } = await getSupabase()
    .from('product_equivalences')
    .select(
      `
      equivalent_product_id,
      evidence,
      active,
      products!equivalent_product_id (
        id, name, sku, status
      )
    `,
    )
    .eq('product_id', productId)
    .eq('active', true)
    .order('created_at', { ascending: true })
  if (error) throw error
  return ((data ?? []) as EquivJoinRow[]).filter((r) => r.products).map(mapRow)
}

/** Mapa productId → SKUs equivalentes (para lista admin). */
export async function adminMapEquivalenceSkus(
  productIds: string[],
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>()
  const ids = [...new Set(productIds.filter(Boolean))]
  if (!ids.length) return map

  const { data, error } = await getSupabase()
    .from('product_equivalences')
    .select(
      `
      product_id,
      products!equivalent_product_id ( sku )
    `,
    )
    .in('product_id', ids)
    .eq('active', true)
  if (error) throw error

  for (const row of data ?? []) {
    const pid = String((row as { product_id: string }).product_id)
    const prod = (row as { products: { sku?: string } | { sku?: string }[] | null }).products
    const p = Array.isArray(prod) ? prod[0] : prod
    const sku = p?.sku ? String(p.sku) : ''
    if (!sku) continue
    const list = map.get(pid) ?? []
    list.push(sku)
    map.set(pid, list)
  }
  return map
}

/** Vincular A↔B (duas linhas). Sem transitividade. */
export async function adminAddProductEquivalence(
  productId: string,
  equivalentProductId: string,
  evidence = EQUIVALENCE_EVIDENCE_DEFAULT,
): Promise<void> {
  if (!productId || !equivalentProductId) throw new Error('Produto inválido')
  if (productId === equivalentProductId) {
    throw new Error('Não é possível equivaler o produto a si mesmo')
  }

  const existing = await adminListProductEquivalences(productId)
  if (existing.some((r) => r.equivalentProductId === equivalentProductId)) {
    throw new Error('Este produto já está na lista de equivalentes')
  }

  const now = new Date().toISOString()
  const rows = [
    {
      product_id: productId,
      equivalent_product_id: equivalentProductId,
      evidence,
      active: true,
      updated_at: now,
    },
    {
      product_id: equivalentProductId,
      equivalent_product_id: productId,
      evidence,
      active: true,
      updated_at: now,
    },
  ]

  const { error } = await getSupabase()
    .from('product_equivalences')
    .upsert(rows, { onConflict: 'product_id,equivalent_product_id' })
  if (error) throw error
}

/** Vincular vários equivalentes de uma vez (cada um A↔B). */
export async function adminAddProductEquivalences(
  productId: string,
  equivalentProductIds: string[],
  evidence = EQUIVALENCE_EVIDENCE_DEFAULT,
): Promise<{ linked: number; skipped: number }> {
  const unique = [...new Set(equivalentProductIds.map((id) => String(id).trim()).filter(Boolean))]
  const existing = await adminListProductEquivalences(productId)
  const already = new Set(existing.map((r) => r.equivalentProductId))
  let linked = 0
  let skipped = 0
  for (const eqId of unique) {
    if (eqId === productId || already.has(eqId)) {
      skipped += 1
      continue
    }
    await adminAddProductEquivalence(productId, eqId, evidence)
    already.add(eqId)
    linked += 1
  }
  return { linked, skipped }
}

/** Remove A↔B (ambas as direções). */
export async function adminRemoveProductEquivalence(
  productId: string,
  equivalentProductId: string,
): Promise<void> {
  const db = getSupabase()
  const { error: e1 } = await db
    .from('product_equivalences')
    .delete()
    .eq('product_id', productId)
    .eq('equivalent_product_id', equivalentProductId)
  if (e1) throw e1
  const { error: e2 } = await db
    .from('product_equivalences')
    .delete()
    .eq('product_id', equivalentProductId)
    .eq('equivalent_product_id', productId)
  if (e2) throw e2
}
