import { getSupabase } from '@/lib/supabase'
import { normalizePhone } from '@/lib/phone'
import type { CustomerStatus } from '@/services/admin/adminB2bCustomerService'
import type { UserProfile } from '@/types'

export type B2bLinkedCustomer = {
  id: string
  legalName: string
  tradeName: string | null
  cnpj: string | null
  status: CustomerStatus
}

export async function getCustomerProfile(userId: string): Promise<{
  profile: Pick<
    UserProfile,
    | 'id'
    | 'fullName'
    | 'phone'
    | 'username'
    | 'role'
    | 'customerId'
    | 'cpf'
    | 'cnpj'
    | 'customerLegalName'
    | 'customerStatus'
  >
}> {
  const sb = getSupabase()
  const [{ data: profile, error: pErr }, { data: links, error: lErr }] = await Promise.all([
    sb.from('profiles').select('id, full_name, phone, username, role').eq('id', userId).maybeSingle(),
    sb
      .from('customer_users')
      .select('customer_id, is_primary, status, customers(id, legal_name, trade_name, cnpj, status)')
      .eq('profile_id', userId)
      .eq('status', 'active'),
  ])
  if (pErr) throw pErr
  if (lErr) throw lErr
  if (!profile) throw new Error('Perfil não encontrado')

  const activeLinks = (links ?? []).filter((row) => {
    const c = Array.isArray(row.customers) ? row.customers[0] : row.customers
    return c && String(c.status) === 'active'
  })
  const preferred =
    activeLinks.find((row) => row.is_primary) ?? activeLinks[0] ?? (links ?? [])[0] ?? null
  const customer = preferred
    ? ((Array.isArray(preferred.customers) ? preferred.customers[0] : preferred.customers) as {
        id: string
        legal_name: string
        trade_name: string | null
        cnpj: string | null
        status: string
      } | null)
    : null

  return {
    profile: {
      id: String(profile.id),
      fullName: (profile.full_name as string | null) ?? null,
      phone: (profile.phone as string | null) ?? null,
      username: (profile.username as string | null) ?? null,
      role: profile.role as UserProfile['role'],
      customerId: customer ? String(customer.id) : null,
      cpf: null,
      cnpj: customer?.cnpj ? String(customer.cnpj) : null,
      customerLegalName: customer?.legal_name ? String(customer.legal_name) : null,
      customerStatus: customer?.status ? (customer.status as CustomerStatus) : null,
    },
  }
}

export async function updateCustomerProfile(input: {
  userId: string
  fullName: string
  phone?: string | null
}): Promise<void> {
  const sb = getSupabase()
  const phone = input.phone?.trim() ? normalizePhone(input.phone) : null

  const { error: pErr } = await sb
    .from('profiles')
    .update({
      full_name: input.fullName.trim(),
      phone: phone || null,
    })
    .eq('id', input.userId)
  if (pErr) throw pErr
}

export async function getCurrentCustomerId(): Promise<string | null> {
  const sb = getSupabase()
  const { data: auth } = await sb.auth.getUser()
  const uid = auth.user?.id
  if (!uid) return null

  const { data, error } = await sb
    .from('customer_users')
    .select('customer_id, is_primary, customers!inner(status)')
    .eq('profile_id', uid)
    .eq('status', 'active')
    .eq('customers.status', 'active')
  if (error) throw error
  if (!data?.length) return null

  const primary = data.find((r) => r.is_primary)
  return String((primary ?? data[0]).customer_id)
}

export async function getLinkedB2bCustomer(): Promise<B2bLinkedCustomer | null> {
  const sb = getSupabase()
  const { data: auth } = await sb.auth.getUser()
  const uid = auth.user?.id
  if (!uid) return null

  const { data, error } = await sb
    .from('customer_users')
    .select('is_primary, customers(id, legal_name, trade_name, cnpj, status)')
    .eq('profile_id', uid)
    .eq('status', 'active')
  if (error) throw error
  if (!data?.length) return null

  const preferred = data.find((r) => r.is_primary) ?? data[0]
  const c = Array.isArray(preferred.customers) ? preferred.customers[0] : preferred.customers
  if (!c) return null
  return {
    id: String(c.id),
    legalName: String(c.legal_name),
    tradeName: (c.trade_name as string | null) ?? null,
    cnpj: (c.cnpj as string | null) ?? null,
    status: c.status as CustomerStatus,
  }
}
