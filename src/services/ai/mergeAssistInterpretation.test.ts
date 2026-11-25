import { describe, expect, it } from 'vitest'
import type { VehicleCatalogEntry } from '@/services/search/interpretSearchQuery'
import type { AISearchInterpretation } from './types'
import {
  editDistance,
  mergeAssistInterpretation,
  productQuerySupportedByRaw,
  productTermSupportedByRawOrTypo,
} from './mergeAssistInterpretation'

const catalog: VehicleCatalogEntry[] = [
  { maker: 'HYUNDAI', model: 'HB20', versions: ['Sense'] },
  { maker: 'CHEVROLET', model: 'ONIX', versions: [] },
]

const assist = (over: Partial<AISearchInterpretation> = {}): AISearchInterpretation => ({
  correctedQuery: 'x',
  productTerms: [],
  vehicleTerms: {},
  possibleProducts: [],
  confidenceLevel: 'medium',
  needsClarification: false,
  status: 'suggestion_available',
  ...over,
})

describe('productQuerySupportedByRaw / typo', () => {
  it('aceita token presente', () => {
    expect(productQuerySupportedByRaw('terminal hb20', 'terminal')).toBe(true)
  })

  it('rejeita peça inventada (estrito)', () => {
    expect(productQuerySupportedByRaw('I30', 'terminal')).toBe(false)
  })

  it('aceita tipografia Pivor→Pivo', () => {
    expect(productTermSupportedByRawOrTypo('Pivor HB20', 'Pivô')).toBe(true)
    expect(editDistance('pivor', 'pivo')).toBeLessThanOrEqual(2)
  })

  it('aceita Termial→Terminal', () => {
    expect(productTermSupportedByRawOrTypo('Termial Onix', 'Terminal')).toBe(true)
  })
})

describe('mergeAssistInterpretation', () => {
  it('descarta veículo fora do catálogo', () => {
    const m = mergeAssistInterpretation(
      'filtro ar',
      assist({
        correctedQuery: 'filtro ar Troller T4',
        productTerms: ['filtro'],
        vehicleTerms: { maker: 'Troller', model: 'T4' },
      }),
      catalog,
    )
    expect(m?.interpretation.vehicleTerms.model).toBeUndefined()
    expect(m?.interpretation.productTerms).toContain('filtro')
  })

  it('canonicaliza HB20 e aceita Pivô tipográfico', () => {
    const m = mergeAssistInterpretation(
      'Pivor HB 20',
      assist({
        correctedQuery: 'Pivô HB20',
        productTerms: ['Pivô'],
        vehicleTerms: { maker: 'Hyundai', model: 'HB20' },
      }),
      catalog,
    )
    expect(m?.differsFromRaw).toBe(true)
    expect(m?.interpretation.vehicleTerms.model).toBe('HB20')
    expect(m?.interpretation.vehicleTerms.maker).toBe('HYUNDAI')
    expect(m?.interpretation.productTerms[0]).toMatch(/piv/i)
    expect(m?.suggestionLabel).toMatch(/Pivô|HB20/i)
  })

  it('rejeita productTerm alucinado em I30', () => {
    const m = mergeAssistInterpretation(
      'I30',
      assist({
        correctedQuery: 'I30 terminal',
        productTerms: ['terminal'],
        vehicleTerms: { model: 'HB20' },
      }),
      catalog,
    )
    expect(m?.interpretation.productTerms).toEqual([])
  })

  it('null para status noop', () => {
    expect(
      mergeAssistInterpretation(
        'x',
        assist({ status: 'deterministic_required' }),
        catalog,
      ),
    ).toBeNull()
  })

  it('marca vehicleRecognizedOutsideCatalog sem aplicar maker/model', () => {
    const m = mergeAssistInterpretation(
      'amortecedor troller',
      assist({
        correctedQuery: 'amortecedor Troller T4',
        productTerms: ['amortecedor'],
        vehicleTerms: { maker: 'Troller', model: 'T4' },
      }),
      catalog,
    )
    expect(m?.interpretation.vehicleTerms.model).toBeUndefined()
    expect(m?.interpretation.vehicleTerms.maker).toBeUndefined()
    expect(m?.interpretation.vehicleRecognizedOutsideCatalog).toBe(true)
    expect(m?.interpretation.suggestedVehicleLabel).toMatch(/Troller/i)
    expect(m?.interpretation.productTerms).toContain('amortecedor')
  })

  it('propaga flag outside já setada pelo alias', () => {
    const m = mergeAssistInterpretation(
      'hrv',
      assist({
        correctedQuery: 'hrv',
        vehicleRecognizedOutsideCatalog: true,
        suggestedVehicleLabel: 'Honda HR-V',
      }),
      catalog,
    )
    expect(m?.interpretation.vehicleRecognizedOutsideCatalog).toBe(true)
    expect(m?.suggestionLabel).toMatch(/HR-V/i)
  })
})
