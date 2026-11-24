import { getSupabase } from '@/lib/supabase'
import { toSlug } from '@/lib/slug'
import type { Product } from '@/types'

export type CampaignStatus = 'draft' | 'active' | 'archived'

export type Campaign = {
  id: string
  slug: string
  title: string
  description: string | null
  href: string | null
  status: CampaignStatus
  startsAt: string | null
  endsAt: string | null
  sortOrder: number
}

type CampaignRow = {
  id: string
  slug: string
  title: string
  subtitle: string | null
  body: string | null
  status: CampaignStatus
  starts_at: string | null
  ends_at: string | null
  sort_order: number
}

function mapCampaign(row: CampaignRow): Campaign {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.subtitle,
    href: row.body,
    status: row.status,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    sortOrder: row.sort_order,
  }
}

const SELECT = 'id, slug, title, subtitle, body, status, starts_at, ends_at, sort_order'

export async function adminListCampaigns(): Promise<Campaign[]> {
  const { data, error } = await getSupabase()
    .from('campaigns')
    .select(SELECT)
    .order('sort_order')
    .order('updated_at', { ascending: false })
    .limit(200)
  if (error) throw error
  return (data as CampaignRow[]).map(mapCampaign)
}

export async function adminUpsertCampaign(input: {
  id?: string
  title: string
  description?: string
  href?: string
  status?: CampaignStatus
  startsAt?: string | null
  endsAt?: string | null
  sortOrder?: number
}): Promise<Campaign> {
  const title = input.title.trim()
  if (!title) throw new Error('Título é obrigatório')
  const slugBase = toSlug(title) || `campanha-${Date.now()}`
  const payload = {
    title,
    subtitle: input.description?.trim() || null,
    body: input.href?.trim() || null,
    status: input.status ?? 'draft',
    starts_at: input.startsAt || null,
    ends_at: input.endsAt || null,
    sort_order: input.sortOrder ?? 0,
    updated_at: new Date().toISOString(),
  }
  const q = getSupabase().from('campaigns')
  if (input.id) {
    const { data, error } = await q.update(payload).eq('id', input.id).select(SELECT).single()
    if (error) throw error
    return mapCampaign(data as CampaignRow)
  }
  const { data, error } = await q
    .insert({ ...payload, slug: slugBase })
    .select(SELECT)
    .single()
  if (error) throw error
  return mapCampaign(data as CampaignRow)
}

export async function adminDeleteCampaign(id: string): Promise<void> {
  const { error } = await getSupabase().from('campaigns').delete().eq('id', id)
  if (error) throw error
}

export async function listActiveCampaigns(): Promise<Campaign[]> {
  const { data, error } = await getSupabase()
    .from('campaigns')
    .select(SELECT)
    .eq('status', 'active')
    .order('sort_order')
    .limit(12)
  if (error) throw error
  return (data as CampaignRow[]).map(mapCampaign)
}

type ProductMini = { id: string; sku: string; name: string; slug: string }

export async function listActiveCampaignHighlights(limit = 8): Promise<{
  campaigns: Campaign[]
  products: ProductMini[]
}> {
  const campaigns = await listActiveCampaigns()
  if (!campaigns.length) return { campaigns: [], products: [] }

  const ids = campaigns.map((c) => c.id)
  const { data, error } = await getSupabase()
    .from('campaign_products')
    .select(
      `
      sort_order,
      campaigns!inner ( id, status ),
      products!inner ( id, sku, name, slug, status )
    `,
    )
    .in('campaign_id', ids)
    .eq('products.status', 'published')
    .order('sort_order')
    .limit(limit * 2)
  if (error) throw error

  const seen = new Set<string>()
  const products: ProductMini[] = []
  for (const row of data ?? []) {
    const p = row.products as ProductMini | ProductMini[]
    const prod = Array.isArray(p) ? p[0] : p
    if (!prod?.id || seen.has(prod.id)) continue
    seen.add(prod.id)
    products.push({
      id: prod.id,
      sku: prod.sku,
      name: prod.name,
      slug: prod.slug,
    })
    if (products.length >= limit) break
  }

  return { campaigns, products }
}

export async function adminSetCampaignProducts(campaignId: string, productIds: string[]): Promise<void> {
  const { error: delErr } = await getSupabase()
    .from('campaign_products')
    .delete()
    .eq('campaign_id', campaignId)
  if (delErr) throw delErr
  if (!productIds.length) return
  const rows = productIds.map((productId, index) => ({
    campaign_id: campaignId,
    product_id: productId,
    sort_order: index,
  }))
  const { error } = await getSupabase().from('campaign_products').insert(rows)
  if (error) throw error
}

export async function adminListCampaignProductIds(campaignId: string): Promise<string[]> {
  const { data, error } = await getSupabase()
    .from('campaign_products')
    .select('product_id, sort_order')
    .eq('campaign_id', campaignId)
    .order('sort_order')
  if (error) throw error
  return (data ?? []).map((r) => String(r.product_id))
}

/** Helper para ProductCard — converte mini em Product parcial. */
export function campaignProductToCardShape(p: ProductMini): Pick<Product, 'id' | 'sku' | 'name' | 'slug' | 'price'> {
  return { id: p.id, sku: p.sku, name: p.name, slug: p.slug, price: 0 }
}