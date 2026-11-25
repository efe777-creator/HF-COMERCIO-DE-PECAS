import { describe, expect, it } from 'vitest'
import { isPaymentConditionEligible, listEligibleConditions } from './paymentEligibility'

const published = {
  status: 'published' as const,
  showToGuests: true,
  showToCustomers: true,
  minSubtotal: null as number | null,
  groupIds: null as string[] | null,
}

describe('isPaymentConditionEligible', () => {
  it('hides draft from guest/customer; staff sees draft', () => {
    const draft = { ...published, status: 'draft' as const }
    expect(isPaymentConditionEligible(draft, { audience: 'guest' })).toBe(false)
    expect(isPaymentConditionEligible(draft, { audience: 'customer' })).toBe(false)
    expect(isPaymentConditionEligible(draft, { audience: 'staff' })).toBe(true)
  })

  it('respects guest / customer flags', () => {
    expect(
      isPaymentConditionEligible(
        { ...published, showToGuests: false },
        { audience: 'guest' },
      ),
    ).toBe(false)
    expect(
      isPaymentConditionEligible(
        { ...published, showToCustomers: false },
        { audience: 'customer' },
      ),
    ).toBe(false)
  })

  it('filters by groupIds when set', () => {
    const cond = { ...published, groupIds: ['g1'] }
    expect(isPaymentConditionEligible(cond, { audience: 'customer', groupId: 'g1' })).toBe(true)
    expect(isPaymentConditionEligible(cond, { audience: 'customer', groupId: 'g2' })).toBe(false)
    expect(isPaymentConditionEligible(cond, { audience: 'customer' })).toBe(false)
  })

  it('enforces minSubtotal', () => {
    const cond = { ...published, minSubtotal: 500 }
    expect(isPaymentConditionEligible(cond, { audience: 'customer', subtotal: 499 })).toBe(false)
    expect(isPaymentConditionEligible(cond, { audience: 'customer', subtotal: 500 })).toBe(true)
  })

  it('listEligibleConditions filters', () => {
    const list = listEligibleConditions(
      [
        { ...published, showToGuests: true },
        { ...published, showToGuests: false },
      ],
      { audience: 'guest' },
    )
    expect(list).toHaveLength(1)
  })

  it('customer with empty allowedConditionIds keeps only AVISTA', () => {
    const avista = { ...published, id: '1', code: 'AVISTA' }
    const other = { ...published, id: '2', code: '28DDL' }
    expect(
      isPaymentConditionEligible(avista, { audience: 'customer', allowedConditionIds: [] }),
    ).toBe(true)
    expect(
      isPaymentConditionEligible(other, { audience: 'customer', allowedConditionIds: [] }),
    ).toBe(false)
  })

  it('customer with allowedConditionIds filters by id', () => {
    const a = { ...published, id: 'a', code: '28DDL' }
    const b = { ...published, id: 'b', code: 'AVISTA' }
    expect(
      isPaymentConditionEligible(a, { audience: 'customer', allowedConditionIds: ['a'] }),
    ).toBe(true)
    expect(
      isPaymentConditionEligible(b, { audience: 'customer', allowedConditionIds: ['a'] }),
    ).toBe(false)
  })
})
