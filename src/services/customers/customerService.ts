import { getSupabase } from '@/lib/supabase'
import { onlyDigits } from '@/lib/document'
import { normalizePhone } from '@/lib/phone'
import type { UserProfile } from '@/types'

export async function getCustomerProfile(userId: string): Promise<{
  profile: Pick<UserProfile, 'id' | 'fullName' | 'phone' | 'username' | 'role' | 'customerId' | 'cpf' | 'cnpj'>
}> {
  const sb = getSupabase()
  const [{ data: profile, error: pErr }, { data: customer, error: cErr }] = await Promise.all([
    sb.from('profiles').select('id, full_name, phone, username, role').eq('id', userId).maybeSingle(),
    sb.from('customers').select('id, cpf, cnpj').eq('profile_id', userId).maybeSingle(),
  ])
  if (pErr) throw pErr
  if (cErr) throw cErr
  if (!profile) throw new Error('Perfil não encontrado')

  return {
    profile: {
      id: String(profile.id),
      fullName: (profile.full_name as string | null) ?? null,
      phone: (profile.phone as string | null) ?? null,
      username: (profile.username as string | null) ?? null,
      role: profile.role as UserProfile['role'],
      customerId: customer ? String(customer.id) : null,
      cpf: (customer?.cpf as string | null) ?? null,
      cnpj: (customer?.cnpj as string | null) ?? null,
    },
  }
}

export async function updateCustomerProfile(input: {
  userId: string
  fullName: string
  phone?: string | null
  cpf?: string | null
  cnpj?: string | null
}): Promise<void> {
  const sb = getSupabase()
  const cpf = input.cpf?.trim() ? onlyDigits(input.cpf) : null
  const cnpj = input.cnpj?.trim() ? onlyDigits(input.cnpj) : null

  const phone = input.phone?.trim() ? normalizePhone(input.phone) : null

  // Nunca enviar role
  const { error: pErr } = await sb
    .from('profiles')
    .update({
      full_name: input.fullName.trim(),
      phone: phone || null,
    })
    .eq('id', input.userId)
  if (pErr) throw pErr

  const { data: customer, error: findErr } = await sb
    .from('customers')
    .select('id')
    .eq('profile_id', input.userId)
    .maybeSingle()
  if (findErr) throw findErr

  if (!customer) {
    const { error: insErr } = await sb.from('customers').insert({
      profile_id: input.userId,
      cpf,
      cnpj,
    })
    if (insErr) throw insErr
    return
  }

  const { error: cErr } = await sb
    .from('customers')
    .update({ cpf, cnpj })
    .eq('id', customer.id)
  if (cErr) throw cErr
}

export async function getCurrentCustomerId(): Promise<string | null> {
  const sb = getSupabase()
  const { data: auth } = await sb.auth.getUser()
  const uid = auth.user?.id
  if (!uid) return null
  const { data, error } = await sb.from('customers').select('id').eq('profile_id', uid).maybeSingle()
  if (error) throw error
  return data ? String(data.id) : null
}
