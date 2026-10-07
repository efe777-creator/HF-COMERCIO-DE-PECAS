import { getSupabase } from '@/lib/supabase'

export interface AdminCatalogList {
  id: string
  name: string
  code: string
  description: string | null
  status: 'active' | 'inactive'
  productCount: number
}

export async function adminListCatalogs(): Promise<AdminCatalogList[]> {
  const { data, error } = await getSupabase()
    .from('catalogs')
    .select('id, name, code, description, status, catalog_products(count)')
    .order('name')
  if (error) throw error
  return (data ?? []).map((c) => {
    const countRel = c.catalog_products as { count: number }[] | null
    const productCount = Array.isArray(countRel) ? Number(countRel[0]?.count ?? 0) : 0
    return {
      id: String(c.id),
      name: String(c.name),
      code: String(c.code),
      description: (c.description as string | null) ?? null,
      status: c.status as 'active' | 'inactive',
      productCount,
    }
  })
}

export async function adminUpsertCatalog(input: {
  id?: string
  name: string
  code: string
  description?: string
  status?: 'active' | 'inactive'
}): Promise<AdminCatalogList> {
  const payload = {
    name: input.name.trim(),
    code: input.code.trim().toUpperCase(),
    description: input.description?.trim() || null,
    status: input.status ?? 'active',
  }
  const sb = getSupabase()
  const { data, error } = input.id
    ? await sb.from('catalogs').update(payload).eq('id', input.id).select('*').single()
    : await sb.from('catalogs').insert(payload).select('*').single()
  if (error) throw error
  return {
    id: String(data.id),
    name: String(data.name),
    code: String(data.code),
    description: (data.description as string | null) ?? null,
    status: data.status as 'active' | 'inactive',
    productCount: 0,
  }
}

export async function adminAddProductToCatalog(catalogId: string, productId: string) {
  const { error } = await getSupabase().from('catalog_products').upsert(
    { catalog_id: catalogId, product_id: productId },
    { onConflict: 'catalog_id,product_id' },
  )
  if (error) throw error
}

export async function adminRemoveProductFromCatalog(catalogId: string, productId: string) {
  const { error } = await getSupabase()
    .from('catalog_products')
    .delete()
    .eq('catalog_id', catalogId)
    .eq('product_id', productId)
  if (error) throw error
}

export async function adminListCatalogProductIds(catalogId: string): Promise<string[]> {
  const { data, error } = await getSupabase()
    .from('catalog_products')
    .select('product_id')
    .eq('catalog_id', catalogId)
  if (error) throw error
  return (data ?? []).map((r) => String(r.product_id))
}

export async function adminAssignCatalogToCustomer(customerId: string, catalogId: string) {
  const { error } = await getSupabase().from('customer_catalogs').upsert(
    { customer_id: customerId, catalog_id: catalogId },
    { onConflict: 'customer_id,catalog_id' },
  )
  if (error) throw error
}

export async function adminAssignCatalogToGroup(groupId: string, catalogId: string) {
  const { error } = await getSupabase().from('customer_group_catalogs').upsert(
    { group_id: groupId, catalog_id: catalogId },
    { onConflict: 'group_id,catalog_id' },
  )
  if (error) throw error
}

export async function adminListGroupCatalogIds(groupId: string): Promise<string[]> {
  const { data, error } = await getSupabase()
    .from('customer_group_catalogs')
    .select('catalog_id')
    .eq('group_id', groupId)
  if (error) throw error
  return (data ?? []).map((r) => String(r.catalog_id))
}

export async function adminListCustomerCatalogIds(customerId: string): Promise<string[]> {
  const { data, error } = await getSupabase()
    .from('customer_catalogs')
    .select('catalog_id')
    .eq('customer_id', customerId)
  if (error) throw error
  return (data ?? []).map((r) => String(r.catalog_id))
}
