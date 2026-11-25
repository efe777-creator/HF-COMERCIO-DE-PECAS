import { describe, expect, it } from 'vitest'
import type { VehicleCatalogEntry } from '@/services/search/interpretSearchQuery'
import { resolveVehicleAliasesFromQuery } from './vehicleAliases'

const catalog: VehicleCatalogEntry[] = [
  { maker: 'Honda', model: 'HR-V', versions: [] },
  { maker: 'Chevrolet', model: 'ONIX', versions: [] },
  { maker: 'Volkswagen', model: 'Saveiro', versions: [] },
  { maker: 'Hyundai', model: 'HB20', versions: [] },
]

describe('resolveVehicleAliasesFromQuery', () => {
  it('resolve HRV → HR-V no catálogo', () => {
    const r = resolveVehicleAliasesFromQuery('amortecedor hrv', catalog)
    expect(r.status).toBe('exact')
    expect(r.vehicleTerms.model).toBe('HR-V')
    expect(r.vehicleTerms.maker).toBe('Honda')
  })

  it('resolve GM → Chevrolet quando maker no catálogo', () => {
    const r = resolveVehicleAliasesFromQuery('filtro gm', catalog)
    expect(r.status).toBe('exact')
    expect(r.vehicleTerms.maker).toBe('Chevrolet')
  })

  it('VW Saveiro via alias saveira', () => {
    const r = resolveVehicleAliasesFromQuery('coxim saveira', catalog)
    expect(r.status).toBe('exact')
    expect(r.vehicleTerms.model).toBe('Saveiro')
  })

  it('not_in_catalog quando alias conhecido mas ausente do mestre', () => {
    const r = resolveVehicleAliasesFromQuery('filtro hrv', [
      { maker: 'Chevrolet', model: 'ONIX', versions: [] },
    ])
    expect(r.status).toBe('not_in_catalog')
    expect(r.suggestedVehicleLabel).toMatch(/HR-V/i)
    expect(r.vehicleTerms.model).toBeUndefined()
  })

  it('none sem alias', () => {
    const r = resolveVehicleAliasesFromQuery('pivô terminal', catalog)
    expect(r.status).toBe('none')
  })
})
