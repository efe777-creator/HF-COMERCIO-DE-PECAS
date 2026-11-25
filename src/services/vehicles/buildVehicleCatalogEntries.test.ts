import { describe, expect, it } from 'vitest'
import { mockVehicleTree } from '@/data/mocks/vehicles'
import { buildVehicleCatalogEntriesFromTree } from './vehicleService'

describe('buildVehicleCatalogEntriesFromTree', () => {
  it('gera um par maker×model por entrada real da árvore', () => {
    const entries = buildVehicleCatalogEntriesFromTree(mockVehicleTree)
    const hb20 = entries.find((e) => e.model === 'HB20')
    expect(hb20?.maker).toBe('Hyundai')
    expect(hb20?.versions).toEqual(expect.arrayContaining(['Sense', 'Vision', 'Evolution']))
  })

  it('não inventa maker fora de modelsByMaker', () => {
    const entries = buildVehicleCatalogEntriesFromTree(mockVehicleTree)
    expect(entries.every((e) => mockVehicleTree.makers.includes(e.maker))).toBe(true)
  })

  it('inclui i30 Hyundai do mock', () => {
    const entries = buildVehicleCatalogEntriesFromTree(mockVehicleTree)
    const i30 = entries.find((e) => e.model.toLowerCase() === 'i30')
    expect(i30?.maker).toBe('Hyundai')
  })
})
