import { describe, expect, it } from 'vitest'
import {
  applyIntentToSearchParams,
  buildCatalogSearchParams,
} from './buildCatalogSearchParams'
import { interpretSearchQuery } from './interpretSearchQuery'

const catalog = [
  { maker: 'Hyundai', model: 'HB20', versions: ['Sense'] },
  { maker: 'Hyundai', model: 'i30' },
  { maker: 'Fiat', model: 'Palio' },
]

describe('buildCatalogSearchParams', () => {
  it('HB20 2015 vira model+year sem q poluído', () => {
    const intent = interpretSearchQuery('HB20 2015', catalog)
    const { searchParams, catalogParams } = buildCatalogSearchParams(intent)
    expect(searchParams.get('model')).toBe('HB20')
    expect(searchParams.get('year')).toBe('2015')
    expect(searchParams.get('maker')).toBe('Hyundai')
    expect(searchParams.get('q')).toBeNull()
    expect(catalogParams.q).toBeUndefined()
  })

  it('pivô HB20 mantém q da peça', () => {
    const intent = interpretSearchQuery('pivô HB20', catalog)
    const { searchParams } = buildCatalogSearchParams(intent)
    expect(searchParams.get('q')?.toLowerCase()).toMatch(/piv/)
    expect(searchParams.get('model')).toBe('HB20')
  })

  it('I30 → maker+model canônicos, sem q', () => {
    const intent = interpretSearchQuery('I30', catalog)
    const { searchParams } = buildCatalogSearchParams(intent)
    expect(searchParams.get('maker')).toBe('Hyundai')
    expect(searchParams.get('model')?.toLowerCase()).toBe('i30')
    expect(searchParams.get('q')).toBeNull()
  })
})

describe('applyIntentToSearchParams', () => {
  it('Regra A: Palio stale + q=I30 → i30 vence', () => {
    const intent = interpretSearchQuery('I30', catalog)
    const { catalogParams } = buildCatalogSearchParams(intent)
    const effective = applyIntentToSearchParams(
      { q: 'I30', maker: 'Fiat', model: 'Palio' },
      catalogParams,
      intent.intentType,
    )
    expect(effective.maker).toBe('Hyundai')
    expect(effective.model?.toLowerCase()).toBe('i30')
    expect(effective.q).toBeNull()
  })

  it('Regra B: pivô preserva YMM manual', () => {
    const intent = interpretSearchQuery('pivô', catalog)
    const { catalogParams } = buildCatalogSearchParams(intent)
    const effective = applyIntentToSearchParams(
      { q: 'pivô', maker: 'Hyundai', model: 'HB20' },
      catalogParams,
      intent.intentType,
    )
    expect(effective.maker).toBe('Hyundai')
    expect(effective.model).toBe('HB20')
    expect(effective.q?.toLowerCase()).toMatch(/piv/)
  })

  it('Regra C: código preserva YMM', () => {
    const intent = interpretSearchQuery('PVI0311', catalog)
    const { catalogParams } = buildCatalogSearchParams(intent)
    const effective = applyIntentToSearchParams(
      { q: 'PVI0311', maker: 'Hyundai', model: 'HB20' },
      catalogParams,
      intent.intentType,
    )
    expect(effective.maker).toBe('Hyundai')
    expect(effective.model).toBe('HB20')
    expect(effective.q).toBe('PVI0311')
  })

  it('Regra F: ambíguo não troca YMM', () => {
    const multi = [
      { maker: 'Fiat', model: 'Uno' },
      { maker: 'Ford', model: 'Uno' },
    ]
    const intent = interpretSearchQuery('Uno', multi)
    const { catalogParams } = buildCatalogSearchParams(intent)
    const effective = applyIntentToSearchParams(
      { q: 'Uno', maker: 'Hyundai', model: 'HB20' },
      catalogParams,
      intent.intentType,
    )
    expect(intent.intentType).toBe('ambiguous')
    expect(effective.maker).toBe('Hyundai')
    expect(effective.model).toBe('HB20')
  })
})
