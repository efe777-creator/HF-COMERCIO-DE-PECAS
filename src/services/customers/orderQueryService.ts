import { getSupabase } from '@/lib/supabase'
import { getCurrentCustomerId } from '@/services/customers/customerService'
import type { CustomerOrderSummary } from '@/types'

export async function listMyOrders(): Promise<CustomerOrderSummary[]> {
  const customerId = await getCurrentCustomerId()
  if (!customerId) return []

  const { data, error } = await getSupabase()
    .from('orders')
    .select('id, status, total, created_at, order_items ( id )')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
  if (error) throw error

  return (data ?? []).map((o) => {
    const items = o.order_items as unknown
    const count = Array.isArray(items) ? items.length : 0
    return {
      id: String(o.id),
      status: String(o.status),
      total: Number(o.total ?? 0),
      createdAt: String(o.created_at),
      itemCount: count,
    }
  })
}
