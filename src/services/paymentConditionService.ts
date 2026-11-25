import { listEligibleConditions } from '@/lib/paymentEligibility'
import {
  describePaymentSchedule,
  type BusinessDayRule,
  type PaymentScheduleMode,
} from '@/lib/paymentSchedule'
import type {
  PaymentAdjustKind,
  PaymentAdjustSign,
  PaymentMethodKind,
} from '@/lib/paymentMethodAdjust'
import { getSupabase } from '@/lib/supabase'

export type PublicPaymentMethod = {
  method: PaymentMethodKind
  enabled: boolean
  adjustKind: PaymentAdjustKind
  adjustSign: PaymentAdjustSign
  adjustValue: number
  sortOrder: number
}

export type PublicPaymentCondition = {
  id: string
  code: string
  name: string
  description: string | null
  footnote: string | null
  scheduleMode: PaymentScheduleMode
  installmentCount: number
  equalIntervalDays: number | null
  firstDueDays: number
  weekday: number | null
  weekdayIntervalWeeks: number | null
  businessDayRule: BusinessDayRule
  amountSplit: 'equal' | 'custom_percent'
  status: 'draft' | 'published'
  minSubtotal: number | null
  showToGuests: boolean
  showToCustomers: boolean
  sortOrder: number
  scheduleLabel: string
  methods: PublicPaymentMethod[]
  installments: Array<{ seq: number; offsetDays: number; percent: number | null; label: string | null }>
}

async function fetchPublished(): Promise<PublicPaymentCondition[]> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('payment_conditions')
    .select('*')
    .eq('status', 'published')
    .order('sort_order')
  if (error) throw error
  const rows = data ?? []
  if (!rows.length) return []
  const ids = rows.map((r) => String(r.id))
  const [instRes, methRes] = await Promise.all([
    sb
      .from('payment_condition_installments')
      .select('payment_condition_id, seq, offset_days, percent, label')
      .in('payment_condition_id', ids)
      .order('seq'),
    sb
      .from('payment_condition_methods')
      .select(
        'payment_condition_id, method, enabled, adjust_kind, adjust_sign, adjust_value, sort_order',
      )
      .in('payment_condition_id', ids)
      .order('sort_order'),
  ])
  if (instRes.error) throw instRes.error
  if (methRes.error) throw methRes.error

  return rows.map((r) => {
    const id = String(r.id)
    const installments = (instRes.data ?? [])
      .filter((i) => String(i.payment_condition_id) === id)
      .map((i) => ({
        seq: Number(i.seq),
        offsetDays: Number(i.offset_days),
        percent: i.percent == null ? null : Number(i.percent),
        label: (i.label as string | null) ?? null,
      }))
    const methods = (methRes.data ?? [])
      .filter((m) => String(m.payment_condition_id) === id)
      .map((m) => ({
        method: m.method as PaymentMethodKind,
        enabled: Boolean(m.enabled),
        adjustKind: m.adjust_kind as PaymentAdjustKind,
        adjustSign: m.adjust_sign as PaymentAdjustSign,
        adjustValue: Number(m.adjust_value) || 0,
        sortOrder: Number(m.sort_order) || 0,
      }))
    const scheduleMode = r.schedule_mode as PaymentScheduleMode
    const cond = {
      scheduleMode,
      installmentCount: Number(r.installment_count) || 1,
      equalIntervalDays: r.equal_interval_days == null ? null : Number(r.equal_interval_days),
      firstDueDays: Number(r.first_due_days) || 0,
      weekday: r.weekday == null ? null : Number(r.weekday),
      weekdayIntervalWeeks:
        r.weekday_interval_weeks == null ? null : Number(r.weekday_interval_weeks),
      businessDayRule: (r.business_day_rule as BusinessDayRule) ?? 'none',
      amountSplit: (r.amount_split as 'equal' | 'custom_percent') ?? 'equal',
      installments,
    }
    return {
      id,
      code: String(r.code),
      name: String(r.name),
      description: (r.description as string | null) ?? null,
      footnote: (r.footnote as string | null) ?? null,
      scheduleMode,
      installmentCount: cond.installmentCount,
      equalIntervalDays: cond.equalIntervalDays,
      firstDueDays: cond.firstDueDays,
      weekday: cond.weekday,
      weekdayIntervalWeeks: cond.weekdayIntervalWeeks,
      businessDayRule: cond.businessDayRule,
      amountSplit: cond.amountSplit,
      status: r.status as 'draft' | 'published',
      minSubtotal: r.min_subtotal == null ? null : Number(r.min_subtotal),
      showToGuests: Boolean(r.show_to_guests),
      showToCustomers: Boolean(r.show_to_customers),
      sortOrder: Number(r.sort_order) || 0,
      scheduleLabel: describePaymentSchedule(cond),
      methods,
      installments,
    }
  })
}

/** IDs de condições vinculadas ao cliente. `[]` = nenhuma (app usa só AVISTA). */
export async function listCustomerPaymentConditionIds(
  customerId: string,
): Promise<string[]> {
  const sb = getSupabase()
  const { data, error } = await sb
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

/**
 * Condições liberadas para a audiência.
 * Cliente B2B: se `allowedConditionIds` for `[]`/omitido via customerId sem vínculos → só AVISTA.
 */
export async function listPublicPaymentConditions(opts: {
  audience: 'guest' | 'customer'
  groupId?: string | null
  subtotal?: number | null
  /** Preferência do grupo (destaca, não filtra sozinha). */
  defaultConditionId?: string | null
  /** IDs vinculados ao cliente. Se audience=customer e omitido com customerId, carrega do banco. */
  allowedConditionIds?: string[] | null
  customerId?: string | null
}): Promise<PublicPaymentCondition[]> {
  const all = await fetchPublished()

  let allowedConditionIds = opts.allowedConditionIds
  if (
    opts.audience === 'customer' &&
    allowedConditionIds === undefined &&
    opts.customerId
  ) {
    allowedConditionIds = await listCustomerPaymentConditionIds(opts.customerId)
  }

  const eligible = listEligibleConditions(
    all.map((c) => ({
      ...c,
      id: c.id,
      code: c.code,
      showToGuests: c.showToGuests,
      showToCustomers: c.showToCustomers,
      minSubtotal: c.minSubtotal,
      status: c.status,
    })),
    {
      audience: opts.audience,
      groupId: opts.groupId,
      subtotal: opts.subtotal,
      allowedConditionIds:
        opts.audience === 'customer'
          ? (allowedConditionIds ?? [])
          : undefined,
    },
  )
  if (opts.defaultConditionId) {
    return [...eligible].sort((a, b) => {
      if (a.id === opts.defaultConditionId) return -1
      if (b.id === opts.defaultConditionId) return 1
      return a.sortOrder - b.sortOrder
    })
  }
  return eligible
}

/** Preço base B2B: item na lista assigned do cliente, senão lista default, senão null. */
export async function resolveCustomerListPrice(productId: string): Promise<number | null> {
  const sb = getSupabase()
  const { data: userData } = await sb.auth.getUser()
  const uid = userData.user?.id
  if (!uid) return null

  type Cust = {
    assigned_price_list_id?: string | null
    status?: string
    group_id?: string | null
  }

  let linkRes = await sb
    .from('customer_users')
    .select('customer_id, customers(assigned_price_list_id, status, group_id)')
    .eq('profile_id', uid)
    .eq('status', 'active')
    .maybeSingle()

  if (linkRes.error && (linkRes.error.message.includes('assigned_price_list_id') || linkRes.error.code === '42703')) {
    linkRes = await sb
      .from('customer_users')
      .select('customer_id, customers(status, group_id)')
      .eq('profile_id', uid)
      .eq('status', 'active')
      .maybeSingle()
  }

  const raw = linkRes.data?.customers
  const cust = (Array.isArray(raw) ? raw[0] : raw) as Cust | null | undefined
  if (!cust || cust.status !== 'active') return null

  let listId = cust.assigned_price_list_id ?? null
  if (!listId) {
    const { data: def } = await sb
      .from('price_lists')
      .select('id')
      .eq('is_default', true)
      .maybeSingle()
    listId = def?.id ? String(def.id) : null
  }
  if (!listId) return null

  const { data: item, error: itemErr } = await sb
    .from('price_list_items')
    .select('price')
    .eq('price_list_id', listId)
    .eq('product_id', productId)
    .maybeSingle()
  if (itemErr || item?.price == null) return null
  const n = Number(item.price)
  return Number.isFinite(n) && n > 0 ? n : null
}
