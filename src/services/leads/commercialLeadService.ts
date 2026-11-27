import { getSupabase } from '@/lib/supabase'
import { logCommercialEvent } from '@/services/admin/adminSellerService'
import {
  assertCustomerCanActivate,
  adminSetCustomerStatus,
  adminUpsertB2bCustomer,
} from '@/services/admin/adminB2bCustomerService'
import {
  emitAccessRejectedNotification,
  emitRequestComplementNotification,
  emitQuoteClosedNotification,
  emitQuoteForwardedNotification,
} from '@/services/communication/communicationService'
import type { LeadRow, LeadStatus } from '@/services/leads/leadService'

export async function rejectCommercialLead(input: {
  leadId: string
  reason: string
  actorProfileId?: string | null
}): Promise<void> {
  const reason = input.reason.trim()
  if (!reason) throw new Error('Informe o motivo da rejeição')
  const sb = getSupabase()
  const now = new Date().toISOString()
  const { data: before } = await sb.from('leads').select('*').eq('id', input.leadId).maybeSingle()
  const { error } = await sb
    .from('leads')
    .update({
      status: 'lost',
      rejected_at: now,
      rejected_by: input.actorProfileId ?? null,
      rejection_reason: reason,
      updated_at: now,
    })
    .eq('id', input.leadId)
  if (error) throw error
  try {
    await logCommercialEvent({
      action: 'request_reject',
      entityType: 'lead',
      entityId: input.leadId,
      actorProfileId: input.actorProfileId,
      before,
      after: { status: 'lost', rejection_reason: reason },
      reason,
    })
  } catch {
    // audit soft
  }
  try {
    await emitAccessRejectedNotification({
      leadId: input.leadId,
      companyLabel: (before?.company_name as string | null) ?? null,
      reason,
    })
  } catch {
    // soft
  }
}

export async function approveCommercialLead(input: {
  leadId: string
  defaultSellerId: string
  assignedPriceListId: string
  paymentConditionIds: string[]
  actorProfileId?: string | null
}): Promise<{ customerId: string }> {
  if (!input.defaultSellerId) throw new Error('Selecione o vendedor padrão')
  if (!input.assignedPriceListId) throw new Error('Selecione a lista de preço')
  if (!input.paymentConditionIds.length) throw new Error('Selecione ao menos uma condição')

  const sb = getSupabase()
  const { data: lead, error: lErr } = await sb.from('leads').select('*').eq('id', input.leadId).single()
  if (lErr) throw lErr

  const cnpj = String(lead.document ?? '').replace(/\D/g, '')
  if (cnpj.length !== 14) throw new Error('CNPJ inválido na solicitação')

  const customer = await adminUpsertB2bCustomer({
    legalName: String(lead.company_name || lead.contact_name || 'Cliente'),
    tradeName: String(lead.company_name ?? '') || undefined,
    cnpj,
    email: String(lead.contact_email ?? '') || undefined,
    phone: String(lead.contact_phone ?? '') || undefined,
    contactName: String(lead.contact_name ?? ''),
    status: 'pending',
    assignedPriceListId: input.assignedPriceListId,
    paymentConditionIds: input.paymentConditionIds,
    notes: `Aprovado da solicitação ${input.leadId.slice(0, 8)}`,
  })

  const { error: sellerErr } = await sb
    .from('customers')
    .update({
      default_seller_id: input.defaultSellerId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', customer.id)
  if (sellerErr) throw sellerErr

  const gate = await assertCustomerCanActivate(customer.id)
  if (!gate.ok) throw new Error(gate.missing.join(' · '))

  await adminSetCustomerStatus(customer.id, 'active')

  const now = new Date().toISOString()
  const { error: uErr } = await sb
    .from('leads')
    .update({
      status: 'won',
      customer_id: customer.id,
      updated_at: now,
    })
    .eq('id', input.leadId)
  if (uErr) throw uErr

  try {
    await logCommercialEvent({
      action: 'request_approve',
      entityType: 'lead',
      entityId: input.leadId,
      actorProfileId: input.actorProfileId,
      after: { customerId: customer.id, sellerId: input.defaultSellerId },
    })
  } catch {
    // soft
  }

  return { customerId: customer.id }
}

export async function closeQuoteLead(input: {
  leadId: string
  outcome: 'won' | 'lost'
  reason: string
  actorProfileId?: string | null
}): Promise<void> {
  const reason = input.reason.trim()
  if (!reason) throw new Error('Informe o motivo do encerramento')
  const sb = getSupabase()
  const now = new Date().toISOString()
  const { data: before } = await sb.from('leads').select('*').eq('id', input.leadId).maybeSingle()
  const { error } = await sb
    .from('leads')
    .update({
      status: input.outcome,
      close_reason: reason,
      closed_at: now,
      updated_at: now,
    })
    .eq('id', input.leadId)
  if (error) throw error
  try {
    await logCommercialEvent({
      action: 'quote_close',
      entityType: 'lead',
      entityId: input.leadId,
      actorProfileId: input.actorProfileId,
      before,
      after: { status: input.outcome, close_reason: reason },
      reason,
    })
  } catch {
    // soft
  }
  try {
    await emitQuoteClosedNotification({
      leadId: input.leadId,
      outcome: input.outcome,
      reason,
      companyLabel: (before?.company_name as string | null) ?? null,
    })
  } catch {
    // soft
  }
}

export async function reopenQuoteLead(input: {
  leadId: string
  actorProfileId?: string | null
  actorRole?: string | null
}): Promise<void> {
  const role = (input.actorRole ?? '').toLowerCase()
  if (role !== 'administrador' && role !== 'gerente' && role !== 'admin') {
    throw new Error('Somente admin/gerente pode reabrir cotação')
  }
  const sb = getSupabase()
  const { data: before } = await sb.from('leads').select('*').eq('id', input.leadId).maybeSingle()
  const now = new Date().toISOString()
  const { error } = await sb
    .from('leads')
    .update({
      status: 'in_progress' satisfies LeadStatus,
      closed_at: null,
      close_reason: null,
      updated_at: now,
    })
    .eq('id', input.leadId)
  if (error) throw error
  try {
    await logCommercialEvent({
      action: 'quote_reopen',
      entityType: 'lead',
      entityId: input.leadId,
      actorProfileId: input.actorProfileId,
      before,
      after: { status: 'in_progress' },
    })
  } catch {
    // soft
  }
}

export async function forwardQuoteToSeller(input: {
  leadId: string
  sellerId: string
  actorProfileId?: string | null
}): Promise<void> {
  const sb = getSupabase()
  const now = new Date().toISOString()
  const { error } = await sb
    .from('leads')
    .update({
      recipient_seller_id: input.sellerId,
      forwarded_at: now,
      status: 'in_progress',
      updated_at: now,
    })
    .eq('id', input.leadId)
  if (error) throw error
  try {
    await logCommercialEvent({
      action: 'quote_forward',
      entityType: 'lead',
      entityId: input.leadId,
      actorProfileId: input.actorProfileId,
      after: { recipient_seller_id: input.sellerId },
    })
    await emitQuoteForwardedNotification({
      leadId: input.leadId,
      sellerId: input.sellerId,
    })
  } catch {
    // soft
  }
}

export async function requestLeadComplement(input: {
  leadId: string
  actorProfileId?: string | null
}): Promise<void> {
  try {
    await emitRequestComplementNotification({ leadId: input.leadId })
    await logCommercialEvent({
      action: 'request_complement',
      entityType: 'lead',
      entityId: input.leadId,
      actorProfileId: input.actorProfileId,
    })
  } catch {
    // soft
  }
}

export type CommercialLeadExtras = Pick<
  LeadRow,
  never
> & {
  business_profile?: string | null
  interest?: string | null
  rejection_reason?: string | null
  rejected_at?: string | null
  close_reason?: string | null
  closed_at?: string | null
  recipient_seller_id?: string | null
  customer_id?: string | null
  attribution?: Record<string, unknown> | null
}
