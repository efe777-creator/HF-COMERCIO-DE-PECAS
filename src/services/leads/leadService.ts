import { getSupabase } from '@/lib/supabase'

export type LeadKind = 'quote' | 'partner' | 'contact'
export type LeadStatus = 'new' | 'in_progress' | 'won' | 'lost' | 'spam'

export type LeadItemInput = {
  productId?: string | null
  skuSnapshot?: string | null
  nameSnapshot?: string | null
  quantity?: number
  notes?: string | null
}

export type CreateLeadInput = {
  kind: LeadKind
  contactName: string
  contactEmail?: string
  contactPhone?: string
  companyName?: string
  document?: string
  city?: string
  state?: string
  message?: string
  source?: string
  businessType?: string
  items?: LeadItemInput[]
}

export async function createLead(input: CreateLeadInput): Promise<{ id: string }> {
  const name = input.contactName.trim()
  if (!name) throw new Error('Nome é obrigatório')

  const messageParts = [input.message?.trim() || '']
  if (input.businessType) messageParts.push(`Tipo de negócio: ${input.businessType}`)

  // UUID no client: anon pode INSERT mas não SELECT (RLS) — evita .select() pós-insert.
  const leadId = crypto.randomUUID()
  const { error } = await getSupabase()
    .from('leads')
    .insert({
      id: leadId,
      kind: input.kind,
      status: 'new',
      contact_name: name,
      contact_email: input.contactEmail?.trim() || null,
      contact_phone: input.contactPhone?.trim() || null,
      company_name: input.companyName?.trim() || null,
      document: input.document?.trim() || null,
      city: input.city?.trim() || null,
      state: input.state?.trim() || null,
      message: messageParts.filter(Boolean).join('\n') || null,
      source: input.source || 'site',
    })

  if (error) throw error

  const items = input.items?.filter((i) => i.productId || i.skuSnapshot || i.nameSnapshot) ?? []
  if (items.length > 0) {
    const { error: itemsError } = await getSupabase().from('lead_items').insert(
      items.map((item, index) => ({
        lead_id: leadId,
        product_id: item.productId || null,
        sku_snapshot: item.skuSnapshot || null,
        name_snapshot: item.nameSnapshot || null,
        quantity: item.quantity && item.quantity > 0 ? item.quantity : 1,
        notes: item.notes || null,
        sort_order: index,
      })),
    )
    if (itemsError) throw itemsError
  }

  return { id: leadId }
}

export type LeadRow = {
  id: string
  kind: LeadKind
  status: LeadStatus
  contact_name: string
  contact_email: string | null
  contact_phone: string | null
  company_name: string | null
  document: string | null
  city: string | null
  state: string | null
  message: string | null
  staff_notes: string | null
  source: string | null
  created_at: string
}

export async function adminListLeads(kind?: LeadKind | 'all'): Promise<LeadRow[]> {
  let q = getSupabase().from('leads').select('*').order('created_at', { ascending: false }).limit(200)
  if (kind && kind !== 'all') q = q.eq('kind', kind)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as LeadRow[]
}

export async function adminUpdateLeadStatus(
  id: string,
  status: LeadStatus,
  staffNotes?: string,
): Promise<void> {
  const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() }
  if (staffNotes !== undefined) patch.staff_notes = staffNotes
  const { error } = await getSupabase().from('leads').update(patch).eq('id', id)
  if (error) throw error
}

export async function adminListLeadItems(leadId: string) {
  const { data, error } = await getSupabase()
    .from('lead_items')
    .select('*')
    .eq('lead_id', leadId)
    .order('sort_order')
  if (error) throw error
  return data ?? []
}
