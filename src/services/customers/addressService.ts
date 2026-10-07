import { normalizeCep } from '@/lib/cep'
import { getSupabase } from '@/lib/supabase'
import { getCurrentCustomerId } from '@/services/customers/customerService'
import type { CustomerAddress } from '@/types'

type Row = {
  id: string
  customer_id: string
  label: string | null
  recipient: string
  street: string
  number: string
  complement: string | null
  reference: string | null
  district: string | null
  city: string
  state: string
  postal_code: string
  is_default: boolean
}

function mapAddress(row: Row): CustomerAddress {
  return {
    id: String(row.id),
    customerId: String(row.customer_id),
    label: row.label,
    recipient: row.recipient,
    street: row.street,
    number: row.number,
    complement: row.complement,
    reference: row.reference,
    district: row.district,
    city: row.city,
    state: row.state,
    postalCode: row.postal_code,
    isDefault: Boolean(row.is_default),
  }
}

export async function listAddresses(): Promise<CustomerAddress[]> {
  const customerId = await getCurrentCustomerId()
  if (!customerId) return []
  const { data, error } = await getSupabase()
    .from('customer_addresses')
    .select('*')
    .eq('customer_id', customerId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as Row[]).map(mapAddress)
}

export async function upsertAddress(input: {
  id?: string
  label?: string | null
  recipient: string
  street: string
  number: string
  complement?: string | null
  reference?: string | null
  district?: string | null
  city: string
  state: string
  postalCode: string
  isDefault?: boolean
}): Promise<CustomerAddress> {
  const customerId = await getCurrentCustomerId()
  if (!customerId) throw new Error('Cliente não encontrado')

  const payload = {
    customer_id: customerId,
    label: input.label?.trim() || null,
    recipient: input.recipient.trim(),
    street: input.street.trim(),
    number: input.number.trim(),
    complement: input.complement?.trim() || null,
    reference: input.reference?.trim() || null,
    district: input.district?.trim() || null,
    city: input.city.trim(),
    state: input.state.trim().toUpperCase().slice(0, 2),
    postal_code: normalizeCep(input.postalCode),
    is_default: Boolean(input.isDefault),
  }

  if (payload.is_default) {
    await getSupabase()
      .from('customer_addresses')
      .update({ is_default: false })
      .eq('customer_id', customerId)
  }

  const q = getSupabase().from('customer_addresses')
  const { data, error } = input.id
    ? await q.update(payload).eq('id', input.id).eq('customer_id', customerId).select().single()
    : await q.insert(payload).select().single()
  if (error) throw error
  return mapAddress(data as Row)
}

export async function deleteAddress(id: string): Promise<void> {
  const customerId = await getCurrentCustomerId()
  if (!customerId) throw new Error('Cliente não encontrado')
  const { error } = await getSupabase()
    .from('customer_addresses')
    .delete()
    .eq('id', id)
    .eq('customer_id', customerId)
  if (error) throw error
}

export async function setDefaultAddress(id: string): Promise<void> {
  const customerId = await getCurrentCustomerId()
  if (!customerId) throw new Error('Cliente não encontrado')
  const sb = getSupabase()
  const { error: clearErr } = await sb
    .from('customer_addresses')
    .update({ is_default: false })
    .eq('customer_id', customerId)
  if (clearErr) throw clearErr
  const { error } = await sb
    .from('customer_addresses')
    .update({ is_default: true })
    .eq('id', id)
    .eq('customer_id', customerId)
  if (error) throw error
}
