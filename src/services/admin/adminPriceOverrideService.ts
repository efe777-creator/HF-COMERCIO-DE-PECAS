import { getSupabase } from '@/lib/supabase'

export type PriceOverrideStatus = 'active' | 'inactive'

export type ProductPriceOverride = {
  id: string
  productId: string
  amount: number
  note: string | null
  status: PriceOverrideStatus
  validFrom: string | null
  validUntil: string | null
  updatedAt: string
}

type Row = {
  id: string
  product_id: string
  amount: number | string
  note: string | null
  status: string
  valid_from: string | null
  valid_until: string | null
  updated_at: string
}

function mapRow(row: Row): ProductPriceOverride {
  return {
    id: String(row.id),
    productId: String(row.product_id),
    amount: Number(row.amount),
    note: row.note,
    status: row.status === 'inactive' ? 'inactive' : 'active',
    validFrom: row.valid_from,
    validUntil: row.valid_until,
    updatedAt: String(row.updated_at),
  }
}

/** Override ativo do produto (se houver). */
export async function adminGetActivePriceOverride(
  productId: string,
): Promise<ProductPriceOverride | null> {
  const { data, error } = await getSupabase()
    .from('product_price_overrides')
    .select('id, product_id, amount, note, status, valid_from, valid_until, updated_at')
    .eq('product_id', productId)
    .eq('status', 'active')
    .maybeSingle()
  if (error) throw error
  return data ? mapRow(data as Row) : null
}

/** IDs de produto com override active (para badges em lote). */
export async function adminListActiveOverrideProductIds(
  productIds: string[],
): Promise<Set<string>> {
  const set = new Set<string>()
  if (!productIds.length) return set
  const { data, error } = await getSupabase()
    .from('product_price_overrides')
    .select('product_id')
    .eq('status', 'active')
    .in('product_id', productIds)
  if (error) throw error
  for (const r of data ?? []) set.add(String(r.product_id))
  return set
}

export type UpsertPriceOverrideInput = {
  productId: string
  amount: number
  note?: string | null
  status?: PriceOverrideStatus
  validFrom?: string | null
  validUntil?: string | null
  changedBy?: string | null
}

/** Cria/atualiza override active (desativa anteriores se necessário). */
export async function adminUpsertPriceOverride(
  input: UpsertPriceOverrideInput,
): Promise<ProductPriceOverride> {
  const sb = getSupabase()
  const status = input.status ?? 'active'

  const existing = await adminGetActivePriceOverride(input.productId)
  const oldAmount = existing?.amount ?? null

  if (existing) {
    const { data, error } = await sb
      .from('product_price_overrides')
      .update({
        amount: input.amount,
        note: input.note?.trim() || null,
        status,
        valid_from: input.validFrom || null,
        valid_until: input.validUntil || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select('id, product_id, amount, note, status, valid_from, valid_until, updated_at')
      .single()
    if (error) throw error

    await sb.from('price_change_history').insert({
      product_id: input.productId,
      price_list_id: null,
      old_price: oldAmount,
      new_price: input.amount,
      changed_by: input.changedBy ?? null,
      source: 'override',
    })

    return mapRow(data as Row)
  }

  // Se status inactive e não há active, ainda assim grava registro inactive
  const { data, error } = await sb
    .from('product_price_overrides')
    .insert({
      product_id: input.productId,
      amount: input.amount,
      note: input.note?.trim() || null,
      status,
      valid_from: input.validFrom || null,
      valid_until: input.validUntil || null,
      created_by: input.changedBy ?? null,
    })
    .select('id, product_id, amount, note, status, valid_from, valid_until, updated_at')
    .single()
  if (error) throw error

  await sb.from('price_change_history').insert({
    product_id: input.productId,
    price_list_id: null,
    old_price: null,
    new_price: input.amount,
    changed_by: input.changedBy ?? null,
    source: 'override',
  })

  return mapRow(data as Row)
}

/** Desativa override active (não apaga histórico). */
export async function adminClearPriceOverride(
  productId: string,
  changedBy?: string | null,
): Promise<void> {
  const existing = await adminGetActivePriceOverride(productId)
  if (!existing) return

  const sb = getSupabase()
  const { error } = await sb
    .from('product_price_overrides')
    .update({ status: 'inactive', updated_at: new Date().toISOString() })
    .eq('id', existing.id)
  if (error) throw error

  await sb.from('price_change_history').insert({
    product_id: productId,
    price_list_id: null,
    old_price: existing.amount,
    new_price: existing.amount,
    changed_by: changedBy ?? null,
    source: 'override',
  })
}
