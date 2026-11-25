import { isValidCnpj, onlyDigits } from '@/lib/cnpj'
import { macroRegionFromUf } from '@/lib/brMacroRegion'
import { getSupabase } from '@/lib/supabase'
import { emitAccessNotification } from '@/services/communication/communicationService'

export type CustomerStatus = 'pending' | 'active' | 'suspended' | 'inactive'
export type IeIndicator = 'icms' | 'exempt' | 'non_contributor'
export type AddressKind = 'principal' | 'entrega' | 'operacional'

export interface AdminCustomerAddress {
  id?: string
  kind: AddressKind
  postalCode: string | null
  street: string | null
  number: string | null
  complement: string | null
  district: string | null
  city: string | null
  state: string | null
  ibgeCode: string | null
  macroRegion: string | null
  country: string
}

export interface AdminB2bCustomer {
  id: string
  legalName: string
  tradeName: string | null
  cnpj: string | null
  email: string | null
  phone: string | null
  whatsapp: string | null
  contactName: string | null
  stateRegistration: string | null
  ieIndicator: IeIndicator | null
  cnpjStatus: string | null
  cnpjCheckedAt: string | null
  cnaeCode: string | null
  status: CustomerStatus
  groupId: string | null
  groupName: string | null
  notes: string | null
  assignedPriceListId: string | null
  /** Condições vinculadas. Vazio = só À vista no catálogo/site. */
  paymentConditionIds: string[]
  createdAt: string
  /** Endereço principal (lista / guia). */
  address: AdminCustomerAddress | null
}

export interface AdminCustomerGroup {
  id: string
  name: string
  code: string
  description: string | null
  status: 'active' | 'inactive'
  defaultPaymentConditionId: string | null
}

function mapGroupRow(g: Record<string, unknown>): AdminCustomerGroup {
  return {
    id: String(g.id),
    name: String(g.name),
    code: String(g.code),
    description: (g.description as string | null) ?? null,
    status: g.status as 'active' | 'inactive',
    defaultPaymentConditionId: (g.default_payment_condition_id as string | null) ?? null,
  }
}

export async function adminListCustomerGroups(): Promise<AdminCustomerGroup[]> {
  const sb = getSupabase()
  const full = await sb
    .from('customer_groups')
    .select('id, name, code, description, status, default_payment_condition_id')
    .order('name')
  if (
    full.error &&
    (full.error.message.includes('default_payment_condition_id') || full.error.code === '42703')
  ) {
    const basic = await sb
      .from('customer_groups')
      .select('id, name, code, description, status')
      .order('name')
    if (basic.error) throw basic.error
    return (basic.data ?? []).map((g) => mapGroupRow(g as Record<string, unknown>))
  }
  if (full.error) throw full.error
  return (full.data ?? []).map((g) => mapGroupRow(g as Record<string, unknown>))
}

export async function adminUpsertCustomerGroup(input: {
  id?: string
  name: string
  code: string
  description?: string
  status?: 'active' | 'inactive'
  defaultPaymentConditionId?: string | null
}): Promise<AdminCustomerGroup> {
  const payload: Record<string, unknown> = {
    name: input.name.trim(),
    code: input.code.trim().toUpperCase(),
    description: input.description?.trim() || null,
    status: input.status ?? 'active',
  }
  if (input.defaultPaymentConditionId !== undefined) {
    payload.default_payment_condition_id = input.defaultPaymentConditionId || null
  }
  const sb = getSupabase()
  let { data, error } = input.id
    ? await sb.from('customer_groups').update(payload).eq('id', input.id).select('*').single()
    : await sb.from('customer_groups').insert(payload).select('*').single()
  if (
    error &&
    (error.message.includes('default_payment_condition_id') || error.code === '42703') &&
    'default_payment_condition_id' in payload
  ) {
    delete payload.default_payment_condition_id
    ;({ data, error } = input.id
      ? await sb.from('customer_groups').update(payload).eq('id', input.id).select('*').single()
      : await sb.from('customer_groups').insert(payload).select('*').single())
  }
  if (error) throw error
  return mapGroupRow(data as Record<string, unknown>)
}

function mapAddressRow(a: Record<string, unknown> | null | undefined): AdminCustomerAddress | null {
  if (!a) return null
  return {
    id: a.id ? String(a.id) : undefined,
    kind: (a.kind as AddressKind) || 'principal',
    postalCode: (a.postal_code as string | null) ?? null,
    street: (a.street as string | null) ?? null,
    number: (a.street_number as string | null) ?? (a.number as string | null) ?? null,
    complement: (a.complement as string | null) ?? null,
    district: (a.district as string | null) ?? null,
    city: (a.city as string | null) ?? null,
    state: (a.state as string | null) ?? null,
    ibgeCode: (a.ibge_code as string | null) ?? null,
    macroRegion: (a.macro_region as string | null) ?? null,
    country: (a.country as string) || 'BR',
  }
}

function mapCustomerRow(
  c: Record<string, unknown>,
  address?: AdminCustomerAddress | null,
  paymentConditionIds: string[] = [],
): AdminB2bCustomer {
  const groupRaw = c.customer_groups
  const group = Array.isArray(groupRaw) ? groupRaw[0] : groupRaw
  const groupObj = group as { name?: string } | null | undefined
  const addrRaw = c.customer_addresses
  let addr: AdminCustomerAddress | null = address ?? null
  if (!addr && addrRaw) {
    const list = Array.isArray(addrRaw) ? addrRaw : [addrRaw]
    const principal =
      list.find((x) => (x as { kind?: string }).kind === 'principal') ?? list[0]
    addr = mapAddressRow(principal as Record<string, unknown>)
  }
  return {
    id: String(c.id),
    legalName: String(c.legal_name),
    tradeName: (c.trade_name as string | null) ?? null,
    cnpj: (c.cnpj as string | null) ?? null,
    email: (c.email as string | null) ?? null,
    phone: (c.phone as string | null) ?? null,
    whatsapp: (c.whatsapp as string | null) ?? null,
    contactName: (c.contact_name as string | null) ?? null,
    stateRegistration: (c.state_registration as string | null) ?? null,
    ieIndicator: (c.ie_indicator as IeIndicator | null) ?? null,
    cnpjStatus: (c.cnpj_status as string | null) ?? null,
    cnpjCheckedAt: (c.cnpj_checked_at as string | null) ?? null,
    cnaeCode: (c.cnae_code as string | null) ?? null,
    status: c.status as CustomerStatus,
    groupId: (c.group_id as string | null) ?? null,
    groupName: groupObj?.name ? String(groupObj.name) : null,
    notes: (c.notes as string | null) ?? null,
    assignedPriceListId: (c.assigned_price_list_id as string | null) ?? null,
    paymentConditionIds,
    createdAt: String(c.created_at),
    address: addr,
  }
}

/** Preferência: com endereço + snapshot CNPJ. `assigned_price_list_id` só se a coluna existir. */
const CUSTOMER_SELECT_CORE = `
  id, legal_name, trade_name, cnpj, email, phone, whatsapp, status, group_id, notes, created_at,
  contact_name, state_registration, ie_indicator,
  cnpj_status, cnpj_checked_at, cnae_code,
  customer_groups(name),
  customer_addresses(id, kind, postal_code, street, street_number, complement, district, city, state, ibge_code, macro_region, country)
`

const CUSTOMER_SELECT_WITH_PRICE = `
  id, legal_name, trade_name, cnpj, email, phone, whatsapp, status, group_id, notes, created_at,
  assigned_price_list_id, contact_name, state_registration, ie_indicator,
  cnpj_status, cnpj_checked_at, cnae_code,
  customer_groups(name),
  customer_addresses(id, kind, postal_code, street, street_number, complement, district, city, state, ibge_code, macro_region, country)
`

export async function adminListB2bCustomers(opts?: {
  q?: string
  status?: string
  state?: string
}): Promise<AdminB2bCustomer[]> {
  const sb = getSupabase()
  const attempts = [
    CUSTOMER_SELECT_WITH_PRICE,
    CUSTOMER_SELECT_CORE,
    `id, legal_name, trade_name, cnpj, email, phone, whatsapp, status, group_id, notes, created_at, assigned_price_list_id, customer_groups(name)`,
    `id, legal_name, trade_name, cnpj, email, phone, whatsapp, status, group_id, notes, created_at, customer_groups(name)`,
  ]

  let lastError: { message?: string } | null = null
  for (const select of attempts) {
    const res = await sb
      .from('customers')
      .select(select)
      .order('created_at', { ascending: false })
      .limit(400)
    if (!res.error) {
      const rows = (res.data ?? []).map((c) =>
        mapCustomerRow(c as unknown as Record<string, unknown>),
      )
      return filterCustomers(rows, opts)
    }
    lastError = res.error
  }
  throw new Error(lastError?.message || 'Erro ao listar clientes')
}

function filterCustomers(
  rows: AdminB2bCustomer[],
  opts?: { q?: string; status?: string; state?: string },
): AdminB2bCustomer[] {
  let out = rows
  if (opts?.status) out = out.filter((c) => c.status === opts.status)
  if (opts?.state) {
    const uf = opts.state.toUpperCase()
    out = out.filter((c) => (c.address?.state ?? '').toUpperCase() === uf)
  }
  const q = opts?.q?.trim().toLowerCase()
  if (q) {
    out = out.filter(
      (c) =>
        c.legalName.toLowerCase().includes(q) ||
        (c.tradeName ?? '').toLowerCase().includes(q) ||
        (c.cnpj ?? '').includes(q) ||
        (c.email ?? '').toLowerCase().includes(q) ||
        (c.address?.city ?? '').toLowerCase().includes(q),
    )
  }
  return out
}

export async function adminListCustomerPaymentConditionIds(
  customerId: string,
): Promise<string[]> {
  const { data, error } = await getSupabase()
    .from('customer_payment_conditions')
    .select('payment_condition_id')
    .eq('customer_id', customerId)
  if (error) {
    if (error.code === '42P01' || error.message.includes('customer_payment_conditions')) {
      return []
    }
    throw error
  }
  return (data ?? []).map((r) => String(r.payment_condition_id))
}

export async function adminSetCustomerPaymentConditions(
  customerId: string,
  paymentConditionIds: string[],
): Promise<void> {
  const sb = getSupabase()
  const unique = [...new Set(paymentConditionIds.filter(Boolean))]

  const { error: delErr } = await sb
    .from('customer_payment_conditions')
    .delete()
    .eq('customer_id', customerId)
  if (delErr) {
    if (delErr.code === '42P01' || delErr.message.includes('customer_payment_conditions')) {
      if (unique.length) {
        throw new Error('Tabela de condições por cliente ausente — aplique a migration 31')
      }
      return
    }
    throw delErr
  }

  if (!unique.length) return

  const { error: insErr } = await sb.from('customer_payment_conditions').insert(
    unique.map((payment_condition_id) => ({
      customer_id: customerId,
      payment_condition_id,
    })),
  )
  if (insErr) throw insErr
}

export async function adminGetB2bCustomer(id: string): Promise<AdminB2bCustomer> {
  const sb = getSupabase()
  for (const select of [CUSTOMER_SELECT_WITH_PRICE, CUSTOMER_SELECT_CORE]) {
    const { data, error } = await sb.from('customers').select(select).eq('id', id).single()
    if (!error && data) {
      const paymentConditionIds = await adminListCustomerPaymentConditionIds(id)
      return mapCustomerRow(
        data as unknown as Record<string, unknown>,
        undefined,
        paymentConditionIds,
      )
    }
  }
  throw new Error('Cliente não encontrado')
}

export type UpsertB2bCustomerInput = {
  id?: string
  legalName: string
  tradeName?: string
  cnpj?: string
  email?: string
  phone?: string
  whatsapp?: string
  contactName?: string
  stateRegistration?: string
  ieIndicator?: IeIndicator | null
  cnpjStatus?: string | null
  cnpjCheckedAt?: string | null
  cnaeCode?: string | null
  status?: CustomerStatus
  groupId?: string | null
  notes?: string
  assignedPriceListId?: string | null
  /** Substituir vínculos de condição. Omitir = não altera. */
  paymentConditionIds?: string[]
  address?: Partial<AdminCustomerAddress> | null
}

export async function adminUpsertB2bCustomer(
  input: UpsertB2bCustomerInput,
): Promise<AdminB2bCustomer> {
  const cnpjDigits = input.cnpj?.replace(/\D/g, '') || ''
  if (cnpjDigits && !isValidCnpj(cnpjDigits)) {
    throw new Error('CNPJ inválido')
  }
  if (!input.legalName.trim()) throw new Error('Razão social obrigatória')
  if (!cnpjDigits) throw new Error('CNPJ obrigatório')

  const isCreate = !input.id
  let previousStatus: CustomerStatus | null = null
  if (input.id && input.status) {
    const { data: prev } = await getSupabase()
      .from('customers')
      .select('status')
      .eq('id', input.id)
      .maybeSingle()
    previousStatus = (prev?.status as CustomerStatus | undefined) ?? null
  }

  const payload: Record<string, unknown> = {
    legal_name: input.legalName.trim(),
    trade_name: input.tradeName?.trim() || null,
    cnpj: cnpjDigits || null,
    email: input.email?.trim() || null,
    phone: input.phone?.trim() || null,
    whatsapp: input.whatsapp?.replace(/\D/g, '') || null,
    contact_name: input.contactName?.trim() || null,
    state_registration: input.stateRegistration?.trim() || null,
    ie_indicator: input.ieIndicator || null,
    cnpj_status: input.cnpjStatus ?? null,
    cnpj_checked_at: input.cnpjCheckedAt ?? null,
    cnae_code: input.cnaeCode?.trim() || null,
    status: input.status ?? 'pending',
    group_id: input.groupId || null,
    notes: input.notes?.trim() || null,
  }
  if (input.assignedPriceListId !== undefined) {
    payload.assigned_price_list_id = input.assignedPriceListId || null
  }

  const sb = getSupabase()
  let { data, error } = input.id
    ? await sb.from('customers').update(payload).eq('id', input.id).select('*').single()
    : await sb.from('customers').insert(payload).select('*').single()

  // Coluna assigned_price_list_id pode não existir neste projeto — remove só ela.
  if (
    error &&
    'assigned_price_list_id' in payload &&
    (error.message.includes('assigned_price_list_id') || error.code === '42703')
  ) {
    delete payload.assigned_price_list_id
    ;({ data, error } = input.id
      ? await sb.from('customers').update(payload).eq('id', input.id).select('*').single()
      : await sb.from('customers').insert(payload).select('*').single())
  }

  // Ambiente sem migration 30: cai para payload mínimo.
  if (
    error &&
    (error.message.includes('contact_name') ||
      error.message.includes('cnpj_status') ||
      error.message.includes('ie_indicator') ||
      error.code === '42703')
  ) {
    for (const k of [
      'contact_name',
      'state_registration',
      'ie_indicator',
      'cnpj_status',
      'cnpj_checked_at',
      'cnae_code',
    ]) {
      delete payload[k]
    }
    ;({ data, error } = input.id
      ? await sb.from('customers').update(payload).eq('id', input.id).select('*').single()
      : await sb.from('customers').insert(payload).select('*').single())
  }

  if (error) {
    if (error.code === '23505' || error.message.toLowerCase().includes('unique')) {
      throw new Error('Já existe cliente com este CNPJ')
    }
    throw error
  }

  const customerId = String((data as { id: string }).id)
  let address: AdminCustomerAddress | null = null
  if (input.address !== undefined) {
    address = await adminUpsertPrincipalAddress(customerId, input.address)
  } else {
    address = await adminGetPrincipalAddress(customerId)
  }

  let paymentConditionIds: string[] = []
  if (input.paymentConditionIds !== undefined) {
    await adminSetCustomerPaymentConditions(customerId, input.paymentConditionIds)
    paymentConditionIds = [...new Set(input.paymentConditionIds.filter(Boolean))]
  } else {
    paymentConditionIds = await adminListCustomerPaymentConditionIds(customerId)
  }

  const mapped = mapCustomerRow(data as Record<string, unknown>, address, paymentConditionIds)
  const nextStatus = mapped.status
  const shouldEmitAccess =
    nextStatus === 'pending' || nextStatus === 'active' || nextStatus === 'suspended'
  if (
    shouldEmitAccess &&
    (isCreate || (input.status && previousStatus && previousStatus !== nextStatus))
  ) {
    try {
      await emitAccessNotification({
        customerId,
        status: nextStatus as 'pending' | 'active' | 'suspended',
        customerLabel: mapped.tradeName || mapped.legalName,
      })
    } catch {
      // Aviso é complementar ao cadastro; falha não bloqueia o save.
    }
  }

  return mapped
}

export async function adminGetPrincipalAddress(
  customerId: string,
): Promise<AdminCustomerAddress | null> {
  const { data, error } = await getSupabase()
    .from('customer_addresses')
    .select('*')
    .eq('customer_id', customerId)
    .eq('kind', 'principal')
    .maybeSingle()
  if (error) {
    if (error.code === '42P01' || error.message.includes('customer_addresses')) return null
    throw error
  }
  return mapAddressRow(data as Record<string, unknown> | null)
}

export async function adminUpsertPrincipalAddress(
  customerId: string,
  input: Partial<AdminCustomerAddress> | null,
): Promise<AdminCustomerAddress | null> {
  if (!input) return null
  const state = input.state?.trim().toUpperCase() || null
  const macro =
    input.macroRegion?.trim() ||
    (state ? macroRegionFromUf(state) : null) ||
    null

  const cepDigits = input.postalCode ? onlyDigits(input.postalCode) : ''
  const payload = {
    customer_id: customerId,
    kind: 'principal' as const,
    postal_code:
      cepDigits.length === 8
        ? `${cepDigits.slice(0, 5)}-${cepDigits.slice(5)}`
        : input.postalCode?.trim() || null,
    street: input.street?.trim() || null,
    street_number: input.number?.trim() || null,
    complement: input.complement?.trim() || null,
    district: input.district?.trim() || null,
    city: input.city?.trim() || null,
    state,
    ibge_code: input.ibgeCode?.trim() || null,
    macro_region: macro,
    country: input.country?.trim() || 'BR',
  }

  const sb = getSupabase()
  const existing = await sb
    .from('customer_addresses')
    .select('id')
    .eq('customer_id', customerId)
    .eq('kind', 'principal')
    .maybeSingle()

  if (existing.error && (existing.error.code === '42P01' || existing.error.message.includes('customer_addresses'))) {
    return null
  }
  if (existing.error) throw existing.error

  const { data, error } = existing.data?.id
    ? await sb
        .from('customer_addresses')
        .update(payload)
        .eq('id', existing.data.id)
        .select('*')
        .single()
    : await sb.from('customer_addresses').insert(payload).select('*').single()

  if (error) throw error
  return mapAddressRow(data as Record<string, unknown>)
}

export async function adminSetCustomerStatus(id: string, status: CustomerStatus) {
  const sb = getSupabase()
  const { data: before } = await sb
    .from('customers')
    .select('legal_name, trade_name')
    .eq('id', id)
    .maybeSingle()

  const { error } = await sb.from('customers').update({ status }).eq('id', id)
  if (error) throw error

  if (status === 'pending' || status === 'active' || status === 'suspended') {
    try {
      await emitAccessNotification({
        customerId: id,
        status,
        customerLabel:
          (before?.trade_name as string | null) ||
          (before?.legal_name as string | null) ||
          null,
      })
    } catch {
      // Status já persistido; aviso complementar.
    }
  }
}

export interface AdminCustomerUserLink {
  id: string
  profileId: string
  email: string | null
  fullName: string | null
  username: string | null
  isPrimary: boolean
  status: 'active' | 'inactive'
}

export async function adminListCustomerUsers(customerId: string): Promise<AdminCustomerUserLink[]> {
  const { data, error } = await getSupabase()
    .from('customer_users')
    .select('id, profile_id, is_primary, status, profiles(full_name, username)')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: true })
  if (error) throw error

  const rows = data ?? []
  if (!rows.length) return []

  const emailById = new Map<string, string | null>()
  for (const r of rows) {
    const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles
    const hint = (profile?.username || profile?.full_name || '').trim()
    if (!hint) continue
    const { data: found } = await getSupabase().rpc('admin_search_users', { p_query: hint })
    const match = (found ?? []).find((u: { id?: string }) => String(u.id) === String(r.profile_id)) as
      | { email?: string | null }
      | undefined
    if (match) emailById.set(String(r.profile_id), match.email ?? null)
  }

  return rows.map((r) => {
    const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles
    const profileId = String(r.profile_id)
    return {
      id: String(r.id),
      profileId,
      email: emailById.get(profileId) ?? null,
      fullName: profile?.full_name ? String(profile.full_name) : null,
      username: profile?.username ? String(profile.username) : null,
      isPrimary: Boolean(r.is_primary),
      status: r.status as 'active' | 'inactive',
    }
  })
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

export async function adminUnlinkUserFromCustomer(linkId: string) {
  const { error } = await getSupabase().from('customer_users').delete().eq('id', linkId)
  if (error) throw error
}

export async function adminSetCustomerUserPrimary(customerId: string, linkId: string) {
  const sb = getSupabase()
  const { error: clearErr } = await sb
    .from('customer_users')
    .update({ is_primary: false })
    .eq('customer_id', customerId)
  if (clearErr) throw clearErr
  const { error } = await sb.from('customer_users').update({ is_primary: true }).eq('id', linkId)
  if (error) throw error
}
