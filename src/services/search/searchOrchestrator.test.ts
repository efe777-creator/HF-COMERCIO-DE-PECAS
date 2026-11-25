import { describe, expect, it, vi } from 'vitest'
import type { SearchIntent } from './interpretSearchQuery'
import { assistIfNeeded } from './searchOrchestrator'

vi.mock('@/services/ai/aiProvider', async () => {
  const actual = await vi.importActual<typeof import('@/services/ai/aiProvider')>(
    '@/services/ai/aiProvider',
  )
  return {
    ...actual,
    isSearchAiAssistEnabled: () => false,
  }
})

const unknownIntent = (): SearchIntent => ({
  raw: 'veiculozorro',
  normalizedQuery: 'veiculozorro',
  intentType: 'unknown',
  productQuery: null,
  vehicle: {},
  matchedEntities: [],
  needsClarification: false,
})

describe('assistIfNeeded (3.2)', () => {
  it('marca shouldAssist em unknown sem Edge (flag off)', async () => {
    const r = await assistIfNeeded(unknownIntent(), 0, 'veiculozorro', { catalog: [] })
    expect(r.shouldAssist).toBe(true)
    expect(r.reason).toBe('unknown_intent')
    expect(r.suggestionLabel).toBeNull()
  })

  it('não assiste code_search', async () => {
    const r = await assistIfNeeded(
      {
        ...unknownIntent(),
        intentType: 'code_search',
        codeHint: 'PVI0311',
        raw: 'PVI0311',
      },
      0,
      'PVI0311',
    )
    expect(r.shouldAssist).toBe(false)
    expect(r.interpretation).toBeNull()
  })

  it('resolve alias HRV no catálogo sem Edge', async () => {
    const r = await assistIfNeeded(
      { ...unknownIntent(), raw: 'amortecedor hrv' },
      0,
      'amortecedor hrv',
      {
        catalog: [{ maker: 'Honda', model: 'HR-V', versions: [] }],
      },
    )
    expect(r.shouldAssist).toBe(true)
    expect(r.interpretation?.vehicleTerms.model).toBe('HR-V')
    expect(r.suggestionLabel).toBeTruthy()
  })

  it('alias fora do catálogo seta flag', async () => {
    const r = await assistIfNeeded(
      { ...unknownIntent(), raw: 'hrv' },
      0,
      'hrv',
      { catalog: [{ maker: 'Chevrolet', model: 'ONIX', versions: [] }] },
    )
    expect(r.interpretation?.vehicleRecognizedOutsideCatalog).toBe(true)
    expect(r.interpretation?.vehicleTerms.model).toBeUndefined()
  })
})
