import { describe, expect, it } from 'vitest'
import type { SearchIntent } from './interpretSearchQuery'
import {
  resolveSearchEmptyOutcome,
  searchEmptyCopy,
} from './resolveSearchEmptyOutcome'

const base = (over: Partial<SearchIntent> = {}): SearchIntent => ({
  raw: 'x',
  normalizedQuery: 'x',
  intentType: 'unknown',
  productQuery: null,
  vehicle: {},
  matchedEntities: [],
  needsClarification: false,
  ...over,
})

describe('resolveSearchEmptyOutcome', () => {
  it('null quando há resultados', () => {
    expect(resolveSearchEmptyOutcome(base(), { total: 3 })).toBeNull()
  })

  it('veículo reconhecido sem produtos (mesmo pedindo peça)', () => {
    const intent = base({
      intentType: 'vehicle_only',
      vehicle: { maker: 'HYUNDAI', model: 'HB20X' },
      needsClarification: true,
      clarification: 'product',
    })
    expect(resolveSearchEmptyOutcome(intent, { total: 0 })).toBe(
      'vehicle_recognized_no_products',
    )
    const copy = searchEmptyCopy('vehicle_recognized_no_products', intent)
    expect(copy.title).toMatch(/HB20X/)
    expect(copy.description).toMatch(/não temos produtos/i)
  })

  it('não interpretou', () => {
    expect(
      resolveSearchEmptyOutcome(base({ intentType: 'unknown' }), { total: 0 }),
    ).toBe('not_interpreted')
  })

  it('peça+veículo sem aplicação', () => {
    const intent = base({
      intentType: 'product_vehicle',
      productQuery: 'pivo',
      vehicle: { maker: 'HYUNDAI', model: 'HB20' },
    })
    expect(resolveSearchEmptyOutcome(intent, { total: 0 })).toBe(
      'product_vehicle_no_application',
    )
    expect(
      resolveSearchEmptyOutcome(intent, { total: 0, softApplied: true }),
    ).toBe('product_vehicle_no_application')
  })

  it('clarificação', () => {
    expect(
      resolveSearchEmptyOutcome(
        base({
          intentType: 'ambiguous',
          needsClarification: true,
          clarification: 'ambiguous',
        }),
        { total: 0 },
      ),
    ).toBe('needs_clarification')
  })
})
