import { describe, expect, it } from 'vitest'
import type { SearchIntent } from '@/services/search/interpretSearchQuery'
import { shouldAssistWithAi } from './aiTriggerRules'

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

describe('shouldAssistWithAi', () => {
  it('não aciona em code_search', () => {
    expect(
      shouldAssistWithAi({
        intent: base({ intentType: 'code_search', codeHint: 'PVI0311' }),
        resultTotal: 0,
      }),
    ).toEqual({ assist: false, reason: null })
  })

  it('não aciona com hits e intent conhecido', () => {
    expect(
      shouldAssistWithAi({
        intent: base({
          intentType: 'vehicle_only',
          vehicle: { maker: 'CHEVROLET', model: 'CELTA' },
        }),
        resultTotal: 4,
      }),
    ).toEqual({ assist: false, reason: null })
  })

  it('aciona em zero resultados', () => {
    expect(
      shouldAssistWithAi({
        intent: base({
          intentType: 'vehicle_only',
          vehicle: { model: 'HB20X' },
        }),
        resultTotal: 0,
      }),
    ).toEqual({ assist: true, reason: 'no_results' })
  })

  it('aciona em unknown', () => {
    expect(
      shouldAssistWithAi({
        intent: base({ intentType: 'unknown', raw: 'veiculozorro' }),
        resultTotal: 0,
      }),
    ).toEqual({ assist: true, reason: 'unknown_intent' })
  })

  it('aciona em ambíguo mesmo com hits', () => {
    expect(
      shouldAssistWithAi({
        intent: base({
          intentType: 'ambiguous',
          needsClarification: true,
          clarification: 'ambiguous',
        }),
        resultTotal: 2,
      }),
    ).toEqual({ assist: true, reason: 'ambiguous' })
  })

  it('aciona descrição informal product_only', () => {
    expect(
      shouldAssistWithAi({
        intent: base({
          intentType: 'product_only',
          productQuery: 'borracha',
          raw: 'preciso da borracha da suspensao',
        }),
        resultTotal: 3,
        rawQuery: 'preciso da borracha da suspensao',
      }),
    ).toEqual({ assist: true, reason: 'informal_description' })
  })
})
