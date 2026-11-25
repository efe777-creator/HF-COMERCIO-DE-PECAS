import { describe, expect, it } from 'vitest'
import {
  describePaymentSchedule,
  materializeInstallmentRows,
  resolvePaymentSchedule,
  type PaymentScheduleCondition,
} from './paymentSchedule'

const base = {
  equalIntervalDays: null as number | null,
  firstDueDays: 0,
  weekday: null as number | null,
  weekdayIntervalWeeks: null as number | null,
  businessDayRule: 'none' as const,
  amountSplit: 'equal' as const,
  installments: [] as PaymentScheduleCondition['installments'],
}

describe('resolvePaymentSchedule', () => {
  it('single 28 DDL', () => {
    const lines = resolvePaymentSchedule(
      { ...base, scheduleMode: 'single', installmentCount: 1, firstDueDays: 28 },
      new Date(2026, 0, 1),
    )
    expect(lines).toHaveLength(1)
    expect(lines[0]!.dueDate.getDate()).toBe(29)
  })

  it('equal 15/15 x3', () => {
    const lines = resolvePaymentSchedule(
      {
        ...base,
        scheduleMode: 'equal_interval',
        installmentCount: 3,
        equalIntervalDays: 15,
        firstDueDays: 15,
      },
      new Date(2026, 0, 1),
    )
    expect(lines.map((l) => l.offsetDays)).toEqual([15, 30, 45])
  })

  it('custom 7/14', () => {
    const lines = resolvePaymentSchedule(
      {
        ...base,
        scheduleMode: 'custom_offsets',
        installmentCount: 2,
        installments: [
          { seq: 1, offsetDays: 7, percent: 50, label: null },
          { seq: 2, offsetDays: 14, percent: 50, label: null },
        ],
      },
      new Date(2026, 0, 1),
    )
    expect(lines.map((l) => l.offsetDays)).toEqual([7, 14])
  })

  it('weekday cycle friday biweekly', () => {
    // 2026-01-01 is Thursday → first Friday = Jan 2
    const lines = resolvePaymentSchedule(
      {
        ...base,
        scheduleMode: 'weekday_cycle',
        installmentCount: 2,
        weekday: 5,
        weekdayIntervalWeeks: 2,
      },
      new Date(2026, 0, 1),
    )
    expect(lines[0]!.dueDate.getDay()).toBe(5)
    expect(lines[1]!.dueDate.getDay()).toBe(5)
    const diff = (lines[1]!.dueDate.getTime() - lines[0]!.dueDate.getTime()) / 86400000
    expect(diff).toBe(14)
  })

  it('describes equal interval', () => {
    expect(
      describePaymentSchedule({
        ...base,
        scheduleMode: 'equal_interval',
        installmentCount: 3,
        equalIntervalDays: 15,
      }),
    ).toContain('15')
  })

  it('materializes equal rows', () => {
    const rows = materializeInstallmentRows({
      ...base,
      scheduleMode: 'equal_interval',
      installmentCount: 3,
      equalIntervalDays: 15,
      firstDueDays: 15,
    })
    expect(rows.map((r) => r.offsetDays)).toEqual([15, 30, 45])
  })
})
