/** Motor de agenda de condições de pagamento (preview; sem pedidos). */

export type PaymentScheduleMode =
  | 'single'
  | 'equal_interval'
  | 'custom_offsets'
  | 'weekday_cycle'

export type BusinessDayRule = 'none' | 'next_business' | 'prev_business'

export type PaymentScheduleCondition = {
  scheduleMode: PaymentScheduleMode
  installmentCount: number
  equalIntervalDays: number | null
  firstDueDays: number
  weekday: number | null
  weekdayIntervalWeeks: number | null
  businessDayRule: BusinessDayRule
  amountSplit: 'equal' | 'custom_percent'
  installments: Array<{
    seq: number
    offsetDays: number
    percent: number | null
    label: string | null
  }>
}

export type PaymentScheduleLine = {
  seq: number
  dueDate: Date
  offsetDays: number
  percent: number
  label: string | null
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function addDays(date: Date, amount: number): Date {
  const d = startOfLocalDay(date)
  d.setDate(d.getDate() + amount)
  return d
}

/** Próximo (ou mesmo) dia da semana: 0=dom … 6=sáb. */
export function nextWeekdayOnOrAfter(date: Date, weekday: number): Date {
  const d = startOfLocalDay(date)
  const delta = (weekday - d.getDay() + 7) % 7
  return addDays(d, delta)
}

function isWeekend(d: Date): boolean {
  const day = d.getDay()
  return day === 0 || day === 6
}

export function applyBusinessDayRule(date: Date, rule: BusinessDayRule): Date {
  if (rule === 'none') return startOfLocalDay(date)
  let d = startOfLocalDay(date)
  if (!isWeekend(d)) return d
  if (rule === 'next_business') {
    while (isWeekend(d)) d = addDays(d, 1)
    return d
  }
  while (isWeekend(d)) d = addDays(d, -1)
  return d
}

function equalPercents(count: number): number[] {
  if (count <= 0) return []
  const raw = 100 / count
  const parts = Array.from({ length: count }, () => Math.round(raw * 10000) / 10000)
  const sum = parts.reduce((a, b) => a + b, 0)
  parts[parts.length - 1] = Math.round((parts[parts.length - 1]! + (100 - sum)) * 10000) / 10000
  return parts
}

function buildOffsets(condition: PaymentScheduleCondition): number[] {
  const n = Math.max(1, condition.installmentCount)
  if (condition.scheduleMode === 'single') {
    return [condition.firstDueDays]
  }
  if (condition.scheduleMode === 'equal_interval') {
    const step = condition.equalIntervalDays ?? 0
    return Array.from({ length: n }, (_, i) => condition.firstDueDays + i * step)
  }
  if (condition.scheduleMode === 'custom_offsets') {
    const sorted = [...condition.installments].sort((a, b) => a.seq - b.seq)
    if (sorted.length >= n) return sorted.slice(0, n).map((r) => r.offsetDays)
    if (sorted.length > 0) {
      const out = sorted.map((r) => r.offsetDays)
      while (out.length < n) out.push(out[out.length - 1]!)
      return out
    }
    return Array.from({ length: n }, (_, i) => condition.firstDueDays + i * 30)
  }
  // weekday_cycle: offsets em semanas a partir da 1ª ocorrência do weekday
  const weeks = Math.max(1, condition.weekdayIntervalWeeks ?? 2)
  return Array.from({ length: n }, (_, i) => i * weeks * 7)
}

/**
 * Gera vencimentos a partir da data-âncora (documento).
 * weekday_cycle: 1ª parcela = próximo weekday on/after âncora (+ firstDueDays).
 */
export function resolvePaymentSchedule(
  condition: PaymentScheduleCondition,
  anchorDate: Date,
): PaymentScheduleLine[] {
  const anchor = startOfLocalDay(anchorDate)
  const offsets = buildOffsets(condition)
  const n = offsets.length
  const sortedInst = [...condition.installments].sort((a, b) => a.seq - b.seq)
  const percents =
    condition.amountSplit === 'custom_percent' &&
    sortedInst.length >= n &&
    sortedInst.every((r) => r.percent != null)
      ? sortedInst.slice(0, n).map((r) => Number(r.percent))
      : equalPercents(n)

  const weekday = condition.weekday
  const lines: PaymentScheduleLine[] = []

  if (condition.scheduleMode === 'weekday_cycle' && weekday != null) {
    let cursor = nextWeekdayOnOrAfter(addDays(anchor, condition.firstDueDays), weekday)
    const weeks = Math.max(1, condition.weekdayIntervalWeeks ?? 2)
    for (let i = 0; i < n; i++) {
      const due = applyBusinessDayRule(cursor, condition.businessDayRule)
      const inst = sortedInst[i]
      lines.push({
        seq: i + 1,
        dueDate: due,
        offsetDays: Math.round((due.getTime() - anchor.getTime()) / 86400000),
        percent: percents[i] ?? 0,
        label: inst?.label ?? null,
      })
      cursor = addDays(cursor, weeks * 7)
    }
    return lines
  }

  for (let i = 0; i < n; i++) {
    let due = addDays(anchor, offsets[i]!)
    if (weekday != null) {
      due = nextWeekdayOnOrAfter(due, weekday)
    }
    due = applyBusinessDayRule(due, condition.businessDayRule)
    const inst = sortedInst[i]
    lines.push({
      seq: i + 1,
      dueDate: due,
      offsetDays: offsets[i]!,
      percent: percents[i] ?? 0,
      label: inst?.label ?? null,
    })
  }
  return lines
}

/** Texto humano da agenda (vitrine / notice). */
export function describePaymentSchedule(condition: PaymentScheduleCondition): string {
  const n = condition.installmentCount
  switch (condition.scheduleMode) {
    case 'single':
      return condition.firstDueDays <= 0
        ? 'À vista'
        : `Vencimento em ${condition.firstDueDays} dia(s)`
    case 'equal_interval':
      return `${n}x a cada ${condition.equalIntervalDays ?? 0} dia(s)`
    case 'custom_offsets': {
      const offs = buildOffsets(condition).join(' / ')
      return `${n} parcela(s): ${offs} dia(s)`
    }
    case 'weekday_cycle': {
      const names = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
      const w = condition.weekday != null ? names[condition.weekday] : 'dia'
      const weeks = condition.weekdayIntervalWeeks ?? 2
      return weeks === 1
        ? `${n}x semanal (${w})`
        : `${n}x a cada ${weeks} semanas (${w})`
    }
    default:
      return 'Condição de pagamento'
  }
}

/** Materializa linhas a partir do modo (para persistir no save). */
export function materializeInstallmentRows(condition: Omit<PaymentScheduleCondition, 'installments'> & {
  installments?: PaymentScheduleCondition['installments']
}): Array<{ seq: number; offsetDays: number; percent: number; label: string | null }> {
  const full: PaymentScheduleCondition = {
    ...condition,
    installments: condition.installments ?? [],
  }
  const offsets = buildOffsets(full)
  const percents = equalPercents(offsets.length)
  return offsets.map((offsetDays, i) => ({
    seq: i + 1,
    offsetDays,
    percent: percents[i]!,
    label: full.installments[i]?.label ?? null,
  }))
}
