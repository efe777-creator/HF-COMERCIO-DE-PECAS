import { describe, expect, it } from 'vitest'
import { applyMethodAdjustment, roundBrl } from './paymentMethodAdjust'

describe('applyMethodAdjustment', () => {
  it('keeps base when none', () => {
    expect(applyMethodAdjustment(100, { adjustKind: 'none', adjustSign: 'surcharge', adjustValue: 0 })).toBe(
      100,
    )
  })

  it('applies percent surcharge and discount', () => {
    expect(
      applyMethodAdjustment(100, { adjustKind: 'percent', adjustSign: 'surcharge', adjustValue: 2.99 }),
    ).toBe(102.99)
    expect(
      applyMethodAdjustment(100, { adjustKind: 'percent', adjustSign: 'discount', adjustValue: 2 }),
    ).toBe(98)
  })

  it('applies fixed surcharge and discount', () => {
    expect(
      applyMethodAdjustment(100, { adjustKind: 'fixed', adjustSign: 'surcharge', adjustValue: 5 }),
    ).toBe(105)
    expect(
      applyMethodAdjustment(100, { adjustKind: 'fixed', adjustSign: 'discount', adjustValue: 5 }),
    ).toBe(95)
  })

  it('rounds BRL', () => {
    expect(roundBrl(10.005)).toBe(10.01)
  })
})
