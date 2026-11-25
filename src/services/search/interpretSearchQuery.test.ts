import { describe, expect, it } from 'vitest'
import { interpretSearchQuery } from './interpretSearchQuery'

const catalog = [
  { maker: 'Hyundai', model: 'HB20', versions: ['Sense', 'Vision', 'Unique'] },
  { maker: 'Hyundai', model: 'I30' },
  { maker: 'Fiat', model: 'Palio' },
  { maker: 'Toyota', model: 'Corolla' },
  { maker: 'CHEVROLET', model: 'CELTA' },
  { maker: 'FORD', model: 'KA' },
]

describe('interpretSearchQuery', () => {
  it('HB20 Sense 2018 → model+version+year; pede peça', () => {
    const i = interpretSearchQuery('HB20 Sense 2018', catalog)
    expect(i.vehicle.model).toBe('HB20')
    expect(i.vehicle.maker).toBe('Hyundai')
    expect(i.vehicle.version).toBe('Sense')
    expect(i.vehicle.year).toBe('2018')
    expect(i.productQuery).toBeNull()
    expect(i.intentType).toBe('vehicle_only')
    expect(i.needsClarification).toBe(true)
    expect(i.clarification).toBe('product')
  })

  it('Hyundai HB20 → maker+model', () => {
    const i = interpretSearchQuery('Hyundai HB20', catalog)
    expect(i.vehicle.maker).toBe('Hyundai')
    expect(i.vehicle.model).toBe('HB20')
    expect(i.intentType).toBe('vehicle_only')
  })

  it('I30 / i30 → só-veículo', () => {
    for (const raw of ['I30', 'i30', 'I30 ']) {
      const i = interpretSearchQuery(raw, catalog)
      expect(i.vehicle.model?.toLowerCase()).toBe('i30')
      expect(i.vehicle.maker).toBe('Hyundai')
      expect(i.productQuery).toBeNull()
      expect(i.intentType).toBe('vehicle_only')
    }
  })

  it('Pivô HB20 → product_vehicle', () => {
    const i = interpretSearchQuery('Pivô HB20', catalog)
    expect(i.intentType).toBe('product_vehicle')
    expect(i.productQuery?.toLowerCase()).toMatch(/piv/)
    expect(i.vehicle.model).toBe('HB20')
    expect(i.vehicle.maker).toBe('Hyundai')
  })

  it('PVI0311 → code_search', () => {
    const i = interpretSearchQuery('PVI0311', catalog)
    expect(i.intentType).toBe('code_search')
    expect(i.codeHint).toBe('PVI0311')
    expect(i.productQuery).toBe('PVI0311')
  })

  it('pivô → product_only sem veículo', () => {
    const i = interpretSearchQuery('pivô', catalog)
    expect(i.intentType).toBe('product_only')
    expect(i.vehicle.model).toBeUndefined()
    expect(i.productQuery?.toLowerCase()).toMatch(/piv/)
  })

  it('Terminal Corolla 2015 → peça+veículo+ano', () => {
    const i = interpretSearchQuery('Terminal Corolla 2015', catalog)
    expect(i.productQuery?.toLowerCase()).toContain('terminal')
    expect(i.vehicle.model).toBe('Corolla')
    expect(i.vehicle.year).toBe('2015')
    expect(i.intentType).toBe('product_vehicle')
  })

  it('modelo ambíguo em N montadoras → não arbitra', () => {
    const multi = [
      { maker: 'Fiat', model: 'Uno' },
      { maker: 'Ford', model: 'Uno' },
    ]
    const i = interpretSearchQuery('Uno 2012', multi)
    expect(i.intentType).toBe('ambiguous')
    expect(i.vehicle.model).toBeUndefined()
    expect(i.vehicle.maker).toBeUndefined()
    expect(i.needsClarification).toBe(true)
    expect(i.clarification).toBe('ambiguous')
    expect(i.productQuery?.toLowerCase()).toContain('uno')
  })

  it('veículo inexistente → unknown, preserva q', () => {
    const i = interpretSearchQuery('veiculozorro', catalog)
    expect(i.intentType).toBe('unknown')
    expect(i.vehicle.model).toBeUndefined()
    expect(i.productQuery?.toLowerCase()).toBe('veiculozorro')
  })

  it('cel ta → CELTA compacto (não KA)', () => {
    const i = interpretSearchQuery('cel ta', catalog)
    expect(i.vehicle.model).toBe('CELTA')
    expect(i.vehicle.maker).toBe('CHEVROLET')
    expect(i.intentType).toBe('vehicle_only')
  })

  it('HB 20 → HB20 compacto', () => {
    const i = interpretSearchQuery('HB 20', catalog)
    expect(i.vehicle.model).toBe('HB20')
    expect(i.vehicle.maker).toBe('Hyundai')
  })

  it('HB20 Unique 2015 → version do cadastro', () => {
    const i = interpretSearchQuery('HB20 Unique 2015', catalog)
    expect(i.vehicle.version).toBe('Unique')
    expect(i.clarification).toBe('product')
  })

  it('HB20 One 2015 → versão allowlist ausente no cadastro pede clarificação', () => {
    const i = interpretSearchQuery('HB20 One 2015', catalog)
    expect(i.vehicle.model).toBe('HB20')
    expect(i.vehicle.version).toBeUndefined()
    expect(i.clarification).toBe('version')
  })

  it('NL preciso de um pivo para o palio 2010', () => {
    const i = interpretSearchQuery('preciso de um pivo para o palio 2010', catalog)
    expect(i.productQuery?.toLowerCase()).toMatch(/piv/)
    expect(i.vehicle.model).toBe('Palio')
    expect(i.vehicle.year).toBe('2010')
  })

  it('acentos/case/espaços em pivô', () => {
    const a = interpretSearchQuery('  PIVO  ', catalog)
    const b = interpretSearchQuery('pivô', catalog)
    expect(a.intentType).toBe('product_only')
    expect(b.intentType).toBe('product_only')
  })
})
