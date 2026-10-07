import { getSupabase } from '@/lib/supabase'
import { toSlug } from '@/lib/slug'
import type { ProductBrand } from '@/types'

type Row = { id: string; name: string; slug: string; status: string }

function map(row: Row): ProductBrand {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status as ProductBrand['status'],
  }
}

export async function adminListBrands(): Promise<ProductBrand[]> {
  const { data, error } = await getSupabase()
    .from('product_brands')
    .select('id, name, slug, status')
    .order('name')
  if (error) throw error
  return (data as Row[]).map(map)
}

export async function adminUpsertBrand(input: {
  id?: string
  name: string
  slug?: string
  status?: ProductBrand['status']
}): Promise<ProductBrand> {
  const payload = {
    name: input.name.trim(),
    slug: (input.slug?.trim() || toSlug(input.name)) || toSlug(`brand-${Date.now()}`),
    status: input.status ?? 'active',
  }
  const q = getSupabase().from('product_brands')
  const { data, error } = input.id
    ? await q.update(payload).eq('id', input.id).select().single()
    : await q.insert(payload).select().single()
  if (error) throw error
  return map(data as Row)
}

export async function adminSetBrandStatus(id: string, status: ProductBrand['status']) {
  const { error } = await getSupabase().from('product_brands').update({ status }).eq('id', id)
  if (error) throw error
}
