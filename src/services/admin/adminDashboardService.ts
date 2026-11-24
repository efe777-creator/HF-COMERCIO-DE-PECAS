import { getSupabase } from '@/lib/supabase'

export type AdminDashboardCounts = {
  publishedProducts: number
  pvcRows: number
  leadsNew: number
  campaignsActive: number
}

async function countExact(
  run: () => PromiseLike<{ count: number | null; error: { message?: string } | null }>,
): Promise<number> {
  const { count, error } = await run()
  if (error) throw error
  return count ?? 0
}

/**
 * Indicadores do dashboard. Cada contagem é independente:
 * falha em uma não derruba as demais (evita banner “Erro” com cards ok).
 */
export async function adminGetDashboardCounts(): Promise<AdminDashboardCounts> {
  const sb = getSupabase()
  const settled = await Promise.allSettled([
    countExact(() =>
      sb.from('products').select('id', { count: 'exact', head: true }).eq('status', 'published'),
    ),
    countExact(() =>
      sb.from('product_vehicle_compatibility').select('id', { count: 'exact', head: true }),
    ),
    countExact(() =>
      sb.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'new'),
    ),
    countExact(() =>
      sb.from('campaigns').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    ),
  ])

  const value = (i: number) => (settled[i].status === 'fulfilled' ? settled[i].value : 0)
  const failed = settled.filter((r) => r.status === 'rejected')
  if (failed.length === settled.length) {
    const first = failed[0]
    throw first.status === 'rejected' ? first.reason : new Error('Falha ao carregar indicadores')
  }

  return {
    publishedProducts: value(0),
    pvcRows: value(1),
    leadsNew: value(2),
    campaignsActive: value(3),
  }
}
