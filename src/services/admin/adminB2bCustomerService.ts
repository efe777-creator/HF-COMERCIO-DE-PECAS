import { getSupabase } from '@/lib/supabase'

export type CustomerStatus = 'pending' | 'active' | 'suspended' | 'inactive'

export interface AdminB2bCustomer {
  id: string
  legalName: string
  tradeName: string | null
  cnpj: string | null
  email: string | null
  phone: string | null
  whatsapp: string | null
  status: CustomerStatus
  groupId: string | null
  groupName: string | null
  notes: string | null
  createdAt: string
}

export interface AdminCustomerGroup {
  id: string
  name: string
  code: string
  description: string | null
  status: 'active' | 'inactive'
}

export async function adminListCustomerGroups(): Promise<AdminCustomerGroup[]> {
  const { data, error } = await getSupabase()
    .from('customer_groups')
    .select('id, name, code, description, status')
    .order('name')
  if (error) throw error
  return (data ?? []).map((g) => ({
    id: String(g.id),
    name: String(g.name),
    code: String(g.code),
    description: (g.description as string | null) ?? null,
    status: g.status as 'active' | 'inactive',
  }))
}

export async function adminUpsertCustomerGroup(input: {
  id?: string
  name: string
  code: string
  description?: string
  status?: 'active' | 'inactive'
}): Promise<AdminCustomerGroup> {
  const payload = {
    name: input.name.trim(),
    code: input.code.trim().toUpperCase(),
    description: input.description?.trim() || null,
    status: input.status ?? 'active',
  }
  const sb = getSupabase()
  const { data, error } = input.id
    ? await sb.from('customer_groups').update(payload).eq('id', input.id).select('*').single()
    : await sb.from('customer_groups').insert(payload).select('*').single()
  if (error) throw error
  return {
    id: String(data.id),
    name: String(data.name),
    code: String(data.code),
    description: (data.description as string | null) ?? null,
    status: data.status as 'active' | 'inactive',
  }
}

export async function adminListB2bCustomers(): Promise<AdminB2bCustomer[]> {
  const { data, error } = await getSupabase()
    .from('customers')
    .select(
      'id, legal_name, trade_name, cnpj, email, phone, whatsapp, status, group_id, notes, created_at, customer_groups(name)',
    )
    .order('created_at', { ascending: false })
    .limit(300)
  if (error) throw error
  return (data ?? []).map((c) => {
    const group = Array.isArray(c.customer_groups) ? c.customer_groups[0] : c.customer_groups
    return {
      id: String(c.id),
      legalName: String(c.legal_name),
      tradeName: (c.trade_name as string | null) ?? null,
      cnpj: (c.cnpj as string | null) ?? null,
      email: (c.email as string | null) ?? null,
      phone: (c.phone as string | null) ?? null,
      whatsapp: (c.whatsapp as string | null) ?? null,
      status: c.status as CustomerStatus,
      groupId: (c.group_id as string | null) ?? null,
      groupName: group?.name ? String(group.name) : null,
      notes: (c.notes as string | null) ?? null,
      createdAt: String(c.created_at),
    }
  })
}

export async function adminUpsertB2bCustomer(input: {
  id?: string
  legalName: string
  tradeName?: string
  cnpj?: string
  email?: string
  phone?: string
  whatsapp?: string
  status?: CustomerStatus
  groupId?: string | null
  notes?: string
}): Promise<AdminB2bCustomer> {
  const payload = {
    legal_name: input.legalName.trim(),
    trade_name: input.tradeName?.trim() || null,
    cnpj: input.cnpj?.replace(/\D/g, '') || null,
    email: input.email?.trim() || null,
    phone: input.phone?.trim() || null,
    whatsapp: input.whatsapp?.replace(/\D/g, '') || null,
    status: input.status ?? 'pending',
    group_id: input.groupId || null,
    notes: input.notes?.trim() || null,
  }
  const sb = getSupabase()
  const { data, error } = input.id
    ? await sb.from('customers').update(payload).eq('id', input.id).select('*').single()
    : await sb.from('customers').insert(payload).select('*').single()
  if (error) throw error
  return {
    id: String(data.id),
    legalName: String(data.legal_name),
    tradeName: (data.trade_name as string | null) ?? null,
    cnpj: (data.cnpj as string | null) ?? null,
    email: (data.email as string | null) ?? null,
    phone: (data.phone as string | null) ?? null,
    whatsapp: (data.whatsapp as string | null) ?? null,
    status: data.status as CustomerStatus,
    groupId: (data.group_id as string | null) ?? null,
    groupName: null,
    notes: (data.notes as string | null) ?? null,
    createdAt: String(data.created_at),
  }
}

export async function adminSetCustomerStatus(id: string, status: CustomerStatus) {
  const { error } = await getSupabase().from('customers').update({ status }).eq('id', id)
  if (error) throw error
}

export async function adminLinkUserToCustomer(input: {
  customerId: string
  profileId: string
  isPrimary?: boolean
}) {
  const { error } = await getSupabase().from('customer_users').upsert(
    {
      customer_id: input.customerId,
      profile_id: input.profileId,
      is_primary: input.isPrimary ?? false,
      status: 'active',
    },
    { onConflict: 'customer_id,profile_id' },
  )
  if (error) throw error
}
