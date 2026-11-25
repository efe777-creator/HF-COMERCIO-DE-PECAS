import { describe, expect, it } from 'vitest'
import {
  appGroupsToPvcRows,
  classifyCardCompatibility,
  classifyCompatibility,
  resolveCardSeal,
  resolveFitContext,
  type PvcCompatRow,
  type VehicleCompatInput,
} from './compatibilityEngine'

const vehicle: VehicleCompatInput = {
  maker: 'Chevrolet',
  model: 'Onix',
  year: 2020,
  engine: '1.0',
  version: 'LT',
  versionId: 'vv-lt',
}

const fullPvc: PvcCompatRow = {
  maker: 'Chevrolet',
  model: 'Onix',
  yearStart: 2019,
  yearEnd: 2022,
  engine: '1.0',
  versionName: 'LT',
  vehicleVersionId: 'vv-lt',
}

describe('classifyCompatibility (#16)', () => {
  it('sem veículo / sem PVC → não confirmada', () => {
    expect(classifyCompatibility(null, [fullPvc]).state).toBe('unconfirmed')
    expect(classifyCompatibility(vehicle, []).state).toBe('unconfirmed')
    expect(classifyCompatibility({ maker: 'X' }, [fullPvc]).state).toBe('unconfirmed')
  })

  it('PVC completo cruzando → confirmada', () => {
    const v = classifyCompatibility(vehicle, [fullPvc])
    expect(v.state).toBe('confirmed')
    expect(v.evidences.some((e) => e.code === 'year')).toBe(true)
    expect(v.evidences.some((e) => e.code === 'engine')).toBe(true)
  })

  it('version_id sozinho não basta', () => {
    const v = classifyCompatibility(
      { maker: 'Chevrolet', model: 'Onix', versionId: 'vv-lt' },
      [
        {
          maker: 'Chevrolet',
          model: 'Onix',
          vehicleVersionId: 'vv-lt',
          yearStart: null,
          yearEnd: null,
          engine: null,
          versionName: null,
        },
      ],
    )
    expect(v.state).toBe('probable')
  })

  it('maker+model sem ano/motor → provável', () => {
    const v = classifyCompatibility(
      { maker: 'Chevrolet', model: 'Onix' },
      [{ maker: 'Chevrolet', model: 'Onix', yearStart: 2019, yearEnd: 2022 }],
    )
    expect(v.state).toBe('probable')
    expect(v.evidences.some((e) => e.code === 'year_missing')).toBe(true)
  })

  it('ano fora do período → não confirmada', () => {
    const v = classifyCompatibility(
      { ...vehicle, year: 2010 },
      [fullPvc],
    )
    expect(v.state).toBe('unconfirmed')
  })

  it('só grupos de vitrine (sem período) → no máx. provável', () => {
    const rows = appGroupsToPvcRows([
      {
        maker: 'Chevrolet',
        lines: [{ model: 'Onix', engine: '1.0', version: 'LT', yearLabel: '19/22' }],
      },
    ])
    const withEngine = classifyCompatibility(
      { maker: 'Chevrolet', model: 'Onix', engine: '1.0', version: 'LT' },
      rows,
    )
    expect(withEngine.state).toBe('confirmed')
    const onlyMm = classifyCompatibility({ maker: 'Chevrolet', model: 'Onix' }, rows)
    expect(onlyMm.state).toBe('probable')
  })
})

describe('resolveCardSeal E.1', () => {
  it('confirmed → Compatível; probable → similar; no_intersection → hide', () => {
    expect(resolveCardSeal({ state: 'confirmed', label: 'x', evidences: [] }).kind).toBe(
      'compatible',
    )
    expect(resolveCardSeal({ state: 'probable', label: 'x', evidences: [] })).toEqual({
      kind: 'similar',
      label: 'Compatível',
      micro: 'similar',
    })
    expect(
      resolveCardSeal({
        state: 'unconfirmed',
        label: 'x',
        evidences: [{ code: 'no_intersection', detail: 'n' }],
      }),
    ).toEqual({ kind: 'hide', label: 'Incompatível' })
    expect(
      resolveCardSeal({
        state: 'unconfirmed',
        label: 'x',
        evidences: [{ code: 'no_pvc', detail: 'n' }],
      }).label,
    ).toBe('A verificar')
  })
})

describe('resolveFitContext M25', () => {
  it('chip vence URL se igual ou mais específico; URL vence se mais rica', () => {
    const chip = { maker: 'Fiat', model: 'Palio' }
    const page = { maker: 'Fiat', model: 'Palio', year: '2015', engine: '1.0' }
    expect(resolveFitContext(chip, page)).toEqual(page)
    expect(resolveFitContext(page, chip)).toEqual(page)
    expect(resolveFitContext(chip, null)).toEqual(chip)
    expect(resolveFitContext(null, chip)).toEqual(chip)
    expect(resolveFitContext(null, null)).toBeNull()
  })

  it('busca Cerato na URL vence garagem HB20 (conflito de modelo)', () => {
    const garage = { maker: 'Hyundai', model: 'HB20', year: '2019' }
    const page = { maker: 'Kia', model: 'Cerato' }
    // CatalogPage: resolveFitContext(garage, pageVehicleFilter)
    expect(resolveFitContext(garage, page)).toEqual(page)
  })
})

describe('classifyCardCompatibility honesto', () => {
  it('PVC full → Compatível; sem PVC → A verificar (não similar via apps)', () => {
    const full = classifyCardCompatibility(vehicle, [fullPvc])
    expect(resolveCardSeal(full).kind).toBe('compatible')

    const noPvc = classifyCardCompatibility(
      { maker: 'Chevrolet', model: 'Onix' },
      [],
    )
    expect(noPvc.evidences.some((e) => e.code === 'no_pvc')).toBe(true)
    expect(resolveCardSeal(noPvc).kind).toBe('check')
    expect(resolveCardSeal(noPvc).label).toBe('A verificar')
  })
})
