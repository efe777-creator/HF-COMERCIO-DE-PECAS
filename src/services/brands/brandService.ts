import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { ProductBrand } from '@/types'

export async function listActiveBrands(): Promise<ProductBrand[]> {
  if (!isSupabaseConfigured || !supabase) return []
  const { data, error } = await supabase
    .from('product_brands')
    .select('id, name, slug, status')
    .eq('status', 'active')
    .order('name')
  if (error) throw error
  return (data ?? []).map((b) => ({
    id: String(b.id),
    name: String(b.name),
    slug: String(b.slug),
    status: b.status as ProductBrand['status'],
  }))
}
