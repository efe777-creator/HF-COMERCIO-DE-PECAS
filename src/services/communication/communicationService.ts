import {
  communicationCopyForKind,
  kindForCustomerStatus,
  type AccessNotificationKind,
  type QuoteNotificationKind,
} from '@/lib/communicationCopy'
import { getSupabase } from '@/lib/supabase'

export type AppNotification = {
  id: string
  audience: 'customer' | 'staff'
  customerId: string | null
  profileId: string | null
  kind: string
  title: string
  body: string | null
  href: string
  category: string
  severity: string
  actionable: boolean
  sourceEventId: string
  readAt: string | null
  createdAt: string
  customerLabel?: string | null
}

function mapRow(row: Record<string, unknown>): AppNotification {
  return {
    id: String(row.id),
    audience: row.audience as 'customer' | 'staff',
    customerId: row.customer_id ? String(row.customer_id) : null,
    profileId: row.profile_id ? String(row.profile_id) : null,
    kind: String(row.kind),
    title: String(row.title),
    body: row.body != null ? String(row.body) : null,
    href: String(row.href ?? '/conta'),
    category: String(row.category ?? 'sistema'),
    severity: String(row.severity ?? 'informativa'),
    actionable: Boolean(row.actionable),
    sourceEventId: String(row.source_event_id),
    readAt: row.read_at ? String(row.read_at) : null,
    createdAt: String(row.created_at),
  }
}

export type EmitAccessOptions = {
  customerId: string
  status: 'pending' | 'active' | 'suspended'
  customerLabel?: string | null
}

/**
 * Emite aviso in-app + log de delivery (whatsapp/email/push = skipped).
 * Sem chamada a Graph API / Meta.
 */
export async function emitAccessNotification(opts: EmitAccessOptions): Promise<AppNotification | null> {
  const kind = kindForCustomerStatus(opts.status)
  const copy = communicationCopyForKind(kind)
  const sb = getSupabase()
  const sourceEventId = crypto.randomUUID()

  let body = copy.body
  if (kind === 'access_pending' && opts.customerLabel?.trim()) {
    body = `${opts.customerLabel.trim()} está com status pending. Revise e libere o acesso.`
  }

  const { data, error } = await sb
    .from('app_notifications')
    .insert({
      audience: copy.audience,
      customer_id: opts.customerId,
      profile_id: null,
      kind: copy.kind,
      title: copy.title,
      body,
      href: copy.href,
      category: copy.category,
      severity: copy.severity,
      actionable: copy.actionable,
      source_event_id: sourceEventId,
    })
    .select('*')
    .single()

  if (error) throw error
  const notification = mapRow(data as Record<string, unknown>)

  const deliveryBase = {
    source_event_id: sourceEventId,
    notification_id: notification.id,
    recipient_profile_id: null as string | null,
    customer_id: opts.customerId,
    kind: copy.kind,
    audience: copy.audience,
  }

  const { error: delErr } = await sb.from('notification_deliveries').insert([
    {
      ...deliveryBase,
      channel: 'in_app',
      status: 'sent',
      attempts: 1,
      sent_at: new Date().toISOString(),
      provider_ref: null,
    },
    {
      ...deliveryBase,
      channel: 'whatsapp',
      status: 'skipped',
      attempts: 0,
      last_error: 'whatsapp_cloud_not_in_this_cycle',
      provider_ref: null,
    },
  ])
  if (delErr) throw delErr

  return notification
}

async function insertNotificationWithDeliveries(opts: {
  kind: AccessNotificationKind | QuoteNotificationKind
  customerId?: string | null
  profileId?: string | null
  bodyOverride?: string | null
  hrefOverride?: string | null
}): Promise<AppNotification> {
  const copy = communicationCopyForKind(opts.kind)
  const href = opts.hrefOverride?.trim() || copy.href
  const sb = getSupabase()
  const sourceEventId = crypto.randomUUID()
  const notificationId = crypto.randomUUID()
  const createdAt = new Date().toISOString()

  // UUID no client: emit de cotação pode ser anon (sem SELECT pós-insert).
  const { error } = await sb.from('app_notifications').insert({
    id: notificationId,
    audience: copy.audience,
    customer_id: opts.customerId ?? null,
    profile_id: opts.profileId ?? null,
    kind: copy.kind,
    title: copy.title,
    body: opts.bodyOverride?.trim() || copy.body,
    href,
    category: copy.category,
    severity: copy.severity,
    actionable: copy.actionable,
    source_event_id: sourceEventId,
  })

  if (error) throw error

  const notification: AppNotification = {
    id: notificationId,
    audience: copy.audience,
    customerId: opts.customerId ?? null,
    profileId: opts.profileId ?? null,
    kind: copy.kind,
    title: copy.title,
    body: opts.bodyOverride?.trim() || copy.body,
    href,
    category: copy.category,
    severity: copy.severity,
    actionable: copy.actionable,
    sourceEventId,
    readAt: null,
    createdAt,
  }

  const deliveryBase = {
    source_event_id: sourceEventId,
    notification_id: notification.id,
    recipient_profile_id: opts.profileId ?? null,
    customer_id: opts.customerId ?? null,
    kind: copy.kind,
    audience: copy.audience,
  }

  const { error: delErr } = await sb.from('notification_deliveries').insert([
    {
      ...deliveryBase,
      channel: 'in_app',
      status: 'sent',
      attempts: 1,
      sent_at: createdAt,
      provider_ref: null,
    },
    {
      ...deliveryBase,
      channel: 'whatsapp',
      status: 'skipped',
      attempts: 0,
      last_error: 'whatsapp_cloud_not_in_this_cycle',
      provider_ref: null,
    },
  ])
  if (delErr) throw delErr
  return notification
}

export type EmitQuoteOptions = {
  leadId: string
  customerId?: string | null
  profileId?: string | null
  companyLabel?: string | null
  itemCount: number
}

/** Avisos após createLead(quote). Sem Graph API. */
export async function emitQuoteNotifications(opts: EmitQuoteOptions): Promise<void> {
  const proto = opts.leadId.slice(0, 8)
  const label = opts.companyLabel?.trim()
  const staffBody = label
    ? `${label} enviou cotação (${opts.itemCount} item(ns)). Protocolo ${proto}.`
    : `Nova cotação com ${opts.itemCount} item(ns). Protocolo ${proto}.`

  await insertNotificationWithDeliveries({
    kind: 'quote_requested',
    customerId: opts.customerId ?? null,
    bodyOverride: staffBody,
    hrefOverride: `/admin/pedidos/cotacoes?lead=${opts.leadId}`,
  })

  if (opts.customerId || opts.profileId) {
    await insertNotificationWithDeliveries({
      kind: 'quote_sent',
      customerId: opts.customerId ?? null,
      profileId: opts.profileId ?? null,
      bodyOverride: `Recebemos sua cotação (protocolo ${proto}). O time comercial retorna em breve.`,
    })
  }
}

async function customerAudienceFilter() {
  const sb = getSupabase()
  const { data: auth } = await sb.auth.getUser()
  const uid = auth.user?.id
  if (!uid) return { sb, customerId: null as string | null, profileId: null as string | null }

  const { data: link } = await sb
    .from('customer_users')
    .select('customer_id')
    .eq('profile_id', uid)
    .eq('status', 'active')
    .order('is_primary', { ascending: false })
    .limit(1)
    .maybeSingle()

  return {
    sb,
    customerId: link?.customer_id ? String(link.customer_id) : null,
    profileId: uid,
  }
}

export async function listCustomerNotifications(limit = 50): Promise<AppNotification[]> {
  const { sb, customerId, profileId } = await customerAudienceFilter()
  if (!profileId) return []

  let q = sb
    .from('app_notifications')
    .select('*')
    .eq('audience', 'customer')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (customerId) q = q.eq('customer_id', customerId)
  else q = q.eq('profile_id', profileId)

  const { data, error } = await q
  if (error) throw error
  return (data ?? []).map((r) => mapRow(r as Record<string, unknown>))
}

export async function countUnreadCustomerNotifications(): Promise<number> {
  const { sb, customerId, profileId } = await customerAudienceFilter()
  if (!profileId) return 0

  let q = sb
    .from('app_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('audience', 'customer')
    .is('read_at', null)

  if (customerId) q = q.eq('customer_id', customerId)
  else q = q.eq('profile_id', profileId)

  const { count, error } = await q
  if (error) throw error
  return count ?? 0
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from('app_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .is('read_at', null)
  if (error) throw error
}

export async function markAllCustomerNotificationsRead(): Promise<void> {
  const { sb, customerId, profileId } = await customerAudienceFilter()
  if (!profileId) return

  let q = sb
    .from('app_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('audience', 'customer')
    .is('read_at', null)

  if (customerId) q = q.eq('customer_id', customerId)
  else q = q.eq('profile_id', profileId)

  const { error } = await q
  if (error) throw error
}

export async function listStaffNotifications(limit = 80): Promise<AppNotification[]> {
  const { data, error } = await getSupabase()
    .from('app_notifications')
    .select('*, customers(legal_name, trade_name)')
    .eq('audience', 'staff')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error

  return (data ?? []).map((raw) => {
    const r = raw as Record<string, unknown>
    const n = mapRow(r)
    const cust = Array.isArray(r.customers) ? r.customers[0] : r.customers
    if (cust && typeof cust === 'object') {
      const c = cust as { legal_name?: string; trade_name?: string }
      n.customerLabel = c.trade_name || c.legal_name || null
    }
    return n
  })
}

export async function countUnreadStaffNotifications(): Promise<number> {
  const { count, error } = await getSupabase()
    .from('app_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('audience', 'staff')
    .is('read_at', null)
  if (error) throw error
  return count ?? 0
}

export function isAccessKind(kind: string): kind is AccessNotificationKind {
  return kind === 'access_pending' || kind === 'access_granted' || kind === 'access_suspended'
}
