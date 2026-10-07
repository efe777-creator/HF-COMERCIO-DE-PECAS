import { describe, expect, it } from 'vitest'
import { previewCalculatedPrice } from '@/services/admin/adminPriceListService'
import {
  calculateSellPrice,
  effectiveMarginFraction,
  effectiveMarkupFraction,
  shouldRecalculatePriceOnCostChange,
  toPercent,
} from '@/services/pricing/pricingFormulas'

describe('previewCalculatedPrice (F8.1-E)', () => {
  it('markup e margem com extra_cost', () => {
    const markup = previewCalculatedPrice({
      baseCost: 40,
      extraCost: 2,
      method: 'markup_on_cost',
      percent: 30,
    })
    expect(markup.costTotal).toBe(42)
    expect(markup.price).toBe(54.6)
    expect(markup.error).toBeNull()

    const margin = previewCalculatedPrice({
      baseCost: 40,
      extraCost: 2,
      method: 'margin_on_sell',
      percent: 30,
    })
    expect(margin.price).toBe(60)
  })

  it('custo ausente', () => {
    const r = previewCalculatedPrice({
      baseCost: null,
      extraCost: 0,
      method: 'margin_on_sell',
      percent: 30,
    })
    expect(r.price).toBeNull()
    expect(r.error).toMatch(/Custo ausente/)
  })

  it('margem inválida', () => {
    const r = previewCalculatedPrice({
      baseCost: 100,
      extraCost: 0,
      method: 'margin_on_sell',
      percent: 100,
    })
    expect(r.price).toBeNull()
    expect(r.error).toMatch(/100/)
  })

  it('fixed não calcula', () => {
    const r = previewCalculatedPrice({
      baseCost: 100,
      extraCost: 0,
      method: 'fixed',
      percent: 30,
    })
    expect(r.price).toBeNull()
    expect(r.error).toMatch(/fixo/)
  })
})

describe('pricingFormulas — markup ≠ margem + D16', () => {
  it('mesmo preço: markup % ≠ margem %', () => {
    const cost = 100
    const price = calculateSellPrice(cost, 'markup_on_cost', 25)!
    expect(price).toBe(125)
    expect(toPercent(effectiveMarkupFraction(price, cost))).toBe(25)
    expect(toPercent(effectiveMarginFraction(price, cost))).toBe(20)
  })

  it('D16: só calculated recalcula com mudança de custo', () => {
    expect(shouldRecalculatePriceOnCostChange('calculated')).toBe(true)
    expect(shouldRecalculatePriceOnCostChange('imported')).toBe(false)
    expect(shouldRecalculatePriceOnCostChange('manual')).toBe(false)
  })

  it('manter preço: indicadores mudam com novo custo', () => {
    const price = 130
    const oldCost = 100
    const newCost = 110
    expect(toPercent(effectiveMarkupFraction(price, oldCost))).toBe(30)
    expect(toPercent(effectiveMarkupFraction(price, newCost))).toBeCloseTo(18.18, 1)
    expect(toPercent(effectiveMarginFraction(price, newCost))).toBeCloseTo(15.38, 1)
  })
})
