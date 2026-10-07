import { getSupabase } from '@/lib/supabase'

export interface AdminCustomerListRow {
  id: string
  name: string | null
  username: string | null
  document: string | null
  createdAt: string
}

export interface AdminCustomerDetail extends AdminCustomerListRow {
  phone: string | null
  recentOrders: { id: string; status: string; total: number; createdAt: string }[]
}

export async function staffCanViewCustomersF8(): Promise<boolean> {
  const { data, error } = await getSupabase().rpc('staff_can_view_customers_f8')
  if (error) throw error
  return Boolean(data)
}

export async function adminListCustomers(): Promise<AdminCustomerListRow[]> {
  const { data, error } = await getSupabase()
    .from('customers')
    .select('id, cpf, cnpj, created_at, profiles(full_name, username)')
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) throw error

  return (data ?? []).map((c) => {
    const profile = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles
    const doc = (c.cpf as string | null) || (c.cnpj as string | null)
    return {
      id: c.id as string,
      name: (profile?.full_name as string | null) ?? null,
      username: (profile?.username as string | null) ?? null,
      document: doc,
      createdAt: String(c.created_at),
    }
  })
}

export async function adminGetCustomer(id: string): Promise<AdminCustomerDetail | null> {
  const { data, error } = await getSupabase()
    .from('customers')
    .select('id, cpf, cnpj, created_at, profiles(full_name, username, phone)')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  if (!data) return null

  const profile = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles
  const doc = (data.cpf as string | null) || (data.cnpj as string | null)

  const { data: orders, error: oErr } = await getSupabase()
    .from('orders')
    .select('id, status, total, created_at')
    .eq('customer_id', id)
    .order('created_at', { ascending: false })
    .limit(10)
  if (oErr) throw oErr

  return {
    id: data.id as string,
    name: (profile?.full_name as string | null) ?? null,
    username: (profile?.username as string | null) ?? null,
    phone: (profile?.phone as string | null) ?? null,
    document: doc,
    createdAt: String(data.created_at),
    recentOrders: (orders ?? []).map((o) => ({
      id: o.id as string,
      status: String(o.status),
      total: Number(o.total),
      createdAt: String(o.created_at),
    })),
  }
}
