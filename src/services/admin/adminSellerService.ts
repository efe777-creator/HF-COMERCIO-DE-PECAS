import { getSupabase } from '@/lib/supabase'

export type SellerStatus = 'active' | 'inactive'

export type SellerRow = {
  id: string
  name: string
  whatsapp: string | null
  email: string | null
  phone: string | null
  status: SellerStatus
  profileId: string | null
  createdAt: string
  customerCount: number
}

export type PublicSeller = {
  id: string
  name: string
  whatsapp: string | null
}

function mapSeller(r: Record<string, unknown>, customerCount = 0): SellerRow {
  return {
    id: String(r.id),
    name: String(r.name ?? ''),
    whatsapp: (r.whatsapp as string | null) ?? null,
    email: (r.email as string | null) ?? null,
    phone: (r.phone as string | null) ?? null,
    status: r.status === 'inactive' ? 'inactive' : 'active',
    profileId: (r.profile_id as string | null) ?? null,
    createdAt: String(r.created_at ?? ''),
    customerCount,
  }
}

export async function adminListSellers(opts?: {
  q?: string
  status?: SellerStatus | ''
}): Promise<SellerRow[]> {
  const sb = getSupabase()
  let q = sb.from('sellers').select('*').order('name')
  if (opts?.status) q = q.eq('status', opts.status)
  const { data, error } = await q
  if (error) throw error
  const rows = (data ?? []) as Record<string, unknown>[]

  const ids = rows.map((r) => String(r.id))
  const countBy: Record<string, number> = {}
  if (ids.length) {
    const { data: cust } = await sb
      .from('customers')
      .select('default_seller_id')
      .in('default_seller_id', ids)
    for (const c of cust ?? []) {
      const sid = String((c as { default_seller_id: string }).default_seller_id)
      countBy[sid] = (countBy[sid] ?? 0) + 1
    }
  }

  let out = rows.map((r) => mapSeller(r, countBy[String(r.id)] ?? 0))
  const needle = opts?.q?.trim().toLowerCase()
  if (needle) {
    out = out.filter(
      (s) =>
        s.name.toLowerCase().includes(needle) ||
        (s.whatsapp ?? '').includes(needle) ||
        (s.email ?? '').toLowerCase().includes(needle),
    )
  }
  return out
}

export async function adminUpsertSeller(input: {
  id?: string
  name: string
  whatsapp?: string | null
  email?: string | null
  phone?: string | null
  status?: SellerStatus
}): Promise<SellerRow> {
  const name = input.name.trim()
  if (!name) throw new Error('Nome é obrigatório')
  const sb = getSupabase()
  const payload = {
    name,
    whatsapp: input.whatsapp?.trim() || null,
    email: input.email?.trim() || null,
    phone: input.phone?.trim() || null,
    status: input.status ?? 'active',
    updated_at: new Date().toISOString(),
  }
  if (input.id) {
    const { data, error } = await sb
      .from('sellers')
      .update(payload)
      .eq('id', input.id)
      .select('*')
      .single()
    if (error) throw error
    return mapSeller(data as Record<string, unknown>)
  }
  const { data, error } = await sb.from('sellers').insert(payload).select('*').single()
  if (error) throw error
  return mapSeller(data as Record<string, unknown>)
}

export async function adminSetSellerStatus(
  id: string,
  status: SellerStatus,
  reassignToSellerId?: string | null,
): Promise<void> {
  const sb = getSupabase()
  if (status === 'inactive') {
    const { count, error: cErr } = await sb
      .from('customers')
      .select('id', { count: 'exact', head: true })
      .eq('default_seller_id', id)
    if (cErr) throw cErr
    if ((count ?? 0) > 0) {
      if (!reassignToSellerId || reassignToSellerId === id) {
        throw new Error('Realoque os clientes para outro vendedor antes de inativar.')
      }
      const { error: uErr } = await sb
        .from('customers')
        .update({ default_seller_id: reassignToSellerId, updated_at: new Date().toISOString() })
        .eq('default_seller_id', id)
      if (uErr) throw uErr
    }
  }
  const { error } = await sb
    .from('sellers')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

/** Picker loja — só campos públicos. */
export async function listActiveSellersPublic(): Promise<PublicSeller[]> {
  const { data, error } = await getSupabase().rpc('list_active_sellers_public')
  if (error) throw error
  return ((data ?? []) as { id: string; name: string; whatsapp: string | null }[]).map((r) => ({
    id: r.id,
    name: r.name,
    whatsapp: r.whatsapp,
  }))
}

export async function logCommercialEvent(input: {
  action: string
  entityType: string
  entityId: string
  actorProfileId?: string | null
  before?: unknown
  after?: unknown
  reason?: string | null
}): Promise<void> {
  const { error } = await getSupabase().from('commercial_events').insert({
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId,
    actor_profile_id: input.actorProfileId ?? null,
    before_json: input.before ?? null,
    after_json: input.after ?? null,
    reason: input.reason ?? null,
  })
  if (error) throw error
}
