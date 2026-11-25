import { describe, expect, it } from 'vitest'
import type { VehicleCatalogEntry } from '@/services/search/interpretSearchQuery'
import { buildLocalTypoInterpretation } from './localTypoAssist'

const catalog: VehicleCatalogEntry[] = [
  { maker: 'HYUNDAI', model: 'HB20', versions: [] },
  { maker: 'CHEVROLET', model: 'ONIX', versions: [] },
  { maker: 'CHEVROLET', model: 'CELTA', versions: [] },
  { maker: 'FORD', model: 'KA', versions: [] },
]

describe('buildLocalTypoInterpretation', () => {
  it('Pivor HB20 → Pivô HB20', () => {
    const i = buildLocalTypoInterpretation('Pivor HB20', catalog)
    expect(i?.correctedQuery).toMatch(/Pivô/i)
    expect(i?.correctedQuery).toMatch(/HB20/i)
    expect(i?.productTerms[0]).toMatch(/Pivô/i)
    expect(i?.vehicleTerms.model).toBe('HB20')
  })

  it('Termial Onix → Terminal Onix', () => {
    const i = buildLocalTypoInterpretation('Termial Onix', catalog)
    expect(i?.correctedQuery).toMatch(/Terminal/i)
    expect(i?.vehicleTerms.model).toBe('ONIX')
  })

  it('sem tipografia → null', () => {
    expect(buildLocalTypoInterpretation('CELTA', catalog)).toBeNull()
  })

  it('cel ta → CELTA (não inventa cel KA)', () => {
    const i = buildLocalTypoInterpretation('cel ta', catalog)
    expect(i?.vehicleTerms.model).toBe('CELTA')
    expect(i?.vehicleTerms.maker).toBe('CHEVROLET')
    expect(i?.correctedQuery).toMatch(/CELTA/i)
    expect(i?.correctedQuery).not.toMatch(/KA/i)
  })

  it('não mapeia token curto ta→KA', () => {
    const i = buildLocalTypoInterpretation('ta', catalog)
    expect(i).toBeNull()
  })
})
