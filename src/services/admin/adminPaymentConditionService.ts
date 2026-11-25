import { getSupabase } from '@/lib/supabase'
import {
  materializeInstallmentRows,
  type BusinessDayRule,
  type PaymentScheduleMode,
} from '@/lib/paymentSchedule'
import type {
  PaymentAdjustKind,
  PaymentAdjustSign,
  PaymentMethodKind,
} from '@/lib/paymentMethodAdjust'

export type PaymentConditionStatus = 'draft' | 'published'

export type AdminPaymentInstallment = {
  id?: string
  seq: number
  offsetDays: number
  percent: number | null
  label: string | null
}

export type AdminPaymentMethod = {
  id?: string
  method: PaymentMethodKind
  enabled: boolean
  adjustKind: PaymentAdjustKind
  adjustSign: PaymentAdjustSign
  adjustValue: number
  sortOrder: number
}

export type AdminPaymentCondition = {
  id: string
  code: string
  name: string
  description: string | null
  footnote: string | null
  scheduleMode: PaymentScheduleMode
  anchorKind: 'document_date'
  installmentCount: number
  equalIntervalDays: number | null
  firstDueDays: number
  weekday: number | null
  weekdayIntervalWeeks: number | null
  amountSplit: 'equal' | 'custom_percent'
  businessDayRule: BusinessDayRule
  status: PaymentConditionStatus
  minSubtotal: number | null
  showToGuests: boolean
  showToCustomers: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
  installments: AdminPaymentInstallment[]
  methods: AdminPaymentMethod[]
}

const METHOD_ORDER: PaymentMethodKind[] = ['pix', 'debit', 'credit', 'boleto', 'cash']

function defaultMethods(): AdminPaymentMethod[] {
  return METHOD_ORDER.map((method, i) => ({
    method,
    enabled: false,
    adjustKind: 'none',
    adjustSign: 'surcharge',
    adjustValue: 0,
    sortOrder: (i + 1) * 10,
  }))
}

function mapCondition(
  row: Record<string, unknown>,
  installments: AdminPaymentInstallment[],
  methods: AdminPaymentMethod[],
): AdminPaymentCondition {
  return {
    id: String(row.id),
    code: String(row.code),
    name: String(row.name),
    description: (row.description as string | null) ?? null,
    footnote: (row.footnote as string | null) ?? null,
    scheduleMode: row.schedule_mode as PaymentScheduleMode,
    anchorKind: 'document_date',
    installmentCount: Number(row.installment_count) || 1,
    equalIntervalDays: row.equal_interval_days == null ? null : Number(row.equal_interval_days),
    firstDueDays: Number(row.first_due_days) || 0,
    weekday: row.weekday == null ? null : Number(row.weekday),
    weekdayIntervalWeeks:
      row.weekday_interval_weeks == null ? null : Number(row.weekday_interval_weeks),
    amountSplit: (row.amount_split as 'equal' | 'custom_percent') ?? 'equal',
    businessDayRule: (row.business_day_rule as BusinessDayRule) ?? 'none',
    status: row.status as PaymentConditionStatus,
    minSubtotal: row.min_subtotal == null ? null : Number(row.min_subtotal),
    showToGuests: Boolean(row.show_to_guests),
    showToCustomers: Boolean(row.show_to_customers),
    sortOrder: Number(row.sort_order) || 0,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    installments,
    methods: methods.length ? methods : defaultMethods(),
  }
}

async function loadChildren(ids: string[]): Promise<{
  installments: Record<string, AdminPaymentInstallment[]>
  methods: Record<string, AdminPaymentMethod[]>
}> {
  const installments: Record<string, AdminPaymentInstallment[]> = {}
  const methods: Record<string, AdminPaymentMethod[]> = {}
  if (!ids.length) return { installments, methods }
  const sb = getSupabase()
  const [instRes, methRes] = await Promise.all([
    sb
      .from('payment_condition_installments')
      .select('id, payment_condition_id, seq, offset_days, percent, label')
      .in('payment_condition_id', ids)
      .order('seq'),
    sb
      .from('payment_condition_methods')
      .select(
        'id, payment_condition_id, method, enabled, adjust_kind, adjust_sign, adjust_value, sort_order',
      )
      .in('payment_condition_id', ids)
      .order('sort_order'),
  ])
  if (instRes.error) throw instRes.error
  if (methRes.error) throw methRes.error
  for (const r of instRes.data ?? []) {
    const cid = String(r.payment_condition_id)
    ;(installments[cid] ??= []).push({
      id: String(r.id),
      seq: Number(r.seq),
      offsetDays: Number(r.offset_days),
      percent: r.percent == null ? null : Number(r.percent),
      label: (r.label as string | null) ?? null,
    })
  }
  for (const r of methRes.data ?? []) {
    const cid = String(r.payment_condition_id)
    ;(methods[cid] ??= []).push({
      id: String(r.id),
      method: r.method as PaymentMethodKind,
      enabled: Boolean(r.enabled),
      adjustKind: r.adjust_kind as PaymentAdjustKind,
      adjustSign: r.adjust_sign as PaymentAdjustSign,
      adjustValue: Number(r.adjust_value) || 0,
      sortOrder: Number(r.sort_order) || 0,
    })
  }
  return { installments, methods }
}

export async function adminListPaymentConditions(opts?: {
  q?: string
  status?: string
}): Promise<AdminPaymentCondition[]> {
  let q = getSupabase()
    .from('payment_conditions')
    .select('*')
    .order('sort_order')
    .order('name')
  if (opts?.status) q = q.eq('status', opts.status)
  if (opts?.q?.trim()) {
    const term = `%${opts.q.trim()}%`
    q = q.or(`code.ilike.${term},name.ilike.${term}`)
  }
  const { data, error } = await q
  if (error) throw error
  const rows = data ?? []
  const ids = rows.map((r) => String(r.id))
  const kids = await loadChildren(ids)
  return rows.map((r) =>
    mapCondition(
      r as Record<string, unknown>,
      kids.installments[String(r.id)] ?? [],
      kids.methods[String(r.id)] ?? [],
    ),
  )
}

export async function adminGetPaymentCondition(id: string): Promise<AdminPaymentCondition | null> {
  const { data, error } = await getSupabase()
    .from('payment_conditions')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const kids = await loadChildren([id])
  return mapCondition(
    data as Record<string, unknown>,
    kids.installments[id] ?? [],
    kids.methods[id] ?? [],
  )
}

export type UpsertPaymentConditionInput = {
  id?: string
  code: string
  name: string
  description?: string | null
  footnote?: string | null
  scheduleMode: PaymentScheduleMode
  installmentCount: number
  equalIntervalDays?: number | null
  firstDueDays?: number
  weekday?: number | null
  weekdayIntervalWeeks?: number | null
  amountSplit?: 'equal' | 'custom_percent'
  businessDayRule?: BusinessDayRule
  status?: PaymentConditionStatus
  minSubtotal?: number | null
  showToGuests?: boolean
  showToCustomers?: boolean
  sortOrder?: number
  /** Offsets custom (quando mode=custom_offsets); senão materializa. */
  installments?: AdminPaymentInstallment[]
  methods?: AdminPaymentMethod[]
}

function headerPayload(input: UpsertPaymentConditionInput) {
  return {
    code: input.code.trim().toUpperCase(),
    name: input.name.trim(),
    description: input.description?.trim() || null,
    footnote: input.footnote?.trim() || null,
    schedule_mode: input.scheduleMode,
    anchor_kind: 'document_date',
    installment_count: Math.max(1, input.installmentCount),
    equal_interval_days: input.equalIntervalDays ?? null,
    first_due_days: input.firstDueDays ?? 0,
    weekday: input.weekday ?? null,
    weekday_interval_weeks: input.weekdayIntervalWeeks ?? null,
    amount_split: input.amountSplit ?? 'equal',
    business_day_rule: input.businessDayRule ?? 'none',
    status: input.status ?? 'draft',
    min_subtotal: input.minSubtotal ?? null,
    show_to_guests: input.showToGuests ?? false,
    show_to_customers: input.showToCustomers ?? true,
    sort_order: input.sortOrder ?? 0,
  }
}

async function replaceChildren(
  conditionId: string,
  input: UpsertPaymentConditionInput,
): Promise<void> {
  const sb = getSupabase()
  const materialized = materializeInstallmentRows({
    scheduleMode: input.scheduleMode,
    installmentCount: input.installmentCount,
    equalIntervalDays: input.equalIntervalDays ?? null,
    firstDueDays: input.firstDueDays ?? 0,
    weekday: input.weekday ?? null,
    weekdayIntervalWeeks: input.weekdayIntervalWeeks ?? null,
    businessDayRule: input.businessDayRule ?? 'none',
    amountSplit: input.amountSplit ?? 'equal',
    installments: (input.installments ?? []).map((r) => ({
      seq: r.seq,
      offsetDays: r.offsetDays,
      percent: r.percent,
      label: r.label,
    })),
  })

  const rows =
    input.scheduleMode === 'custom_offsets' && (input.installments?.length ?? 0) > 0
      ? [...(input.installments ?? [])]
          .sort((a, b) => a.seq - b.seq)
          .map((r, i) => ({
            seq: i + 1,
            offsetDays: r.offsetDays,
            percent: r.percent,
            label: r.label,
          }))
      : materialized

  await sb.from('payment_condition_installments').delete().eq('payment_condition_id', conditionId)
  if (rows.length) {
    const { error: iErr } = await sb.from('payment_condition_installments').insert(
      rows.map((r) => ({
        payment_condition_id: conditionId,
        seq: r.seq,
        offset_days: r.offsetDays,
        percent: r.percent,
        label: r.label,
      })),
    )
    if (iErr) throw iErr
  }

  const methods = input.methods?.length ? input.methods : defaultMethods()
  await sb.from('payment_condition_methods').delete().eq('payment_condition_id', conditionId)
  const { error: mErr } = await sb.from('payment_condition_methods').insert(
    methods.map((m, i) => ({
      payment_condition_id: conditionId,
      method: m.method,
      enabled: m.enabled,
      adjust_kind: m.adjustKind,
      adjust_sign: m.adjustSign,
      adjust_value: m.adjustValue,
      sort_order: m.sortOrder || (i + 1) * 10,
    })),
  )
  if (mErr) throw mErr
}

export async function adminUpsertPaymentCondition(
  input: UpsertPaymentConditionInput,
): Promise<AdminPaymentCondition> {
  const sb = getSupabase()
  const payload = headerPayload(input)
  const { data, error } = input.id
    ? await sb.from('payment_conditions').update(payload).eq('id', input.id).select('*').single()
    : await sb.from('payment_conditions').insert(payload).select('*').single()
  if (error) throw error
  const id = String(data.id)
  await replaceChildren(id, input)
  const full = await adminGetPaymentCondition(id)
  if (!full) throw new Error('Condição não encontrada após salvar')
  return full
}

export async function adminReleasePaymentCondition(id: string): Promise<AdminPaymentCondition> {
  const { data, error } = await getSupabase()
    .from('payment_conditions')
    .update({ status: 'published', show_to_customers: true })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  const kids = await loadChildren([id])
  return mapCondition(
    data as Record<string, unknown>,
    kids.installments[id] ?? [],
    kids.methods[id] ?? [],
  )
}

export async function adminArchivePaymentConditionDraft(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from('payment_conditions')
    .update({ status: 'draft' })
    .eq('id', id)
  if (error) throw error
}
