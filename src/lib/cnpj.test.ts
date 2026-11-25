import { describe, expect, it } from 'vitest'
import { formatCnpj, isValidCnpj, onlyDigits } from './cnpj'
import { macroRegionFromUf } from './brMacroRegion'
import { isCnpjStatusWarning } from './brasilApiCnpj'

describe('cnpj', () => {
  it('formats mask', () => {
    expect(formatCnpj('19131243000197')).toBe('19.131.243/0001-97')
    expect(onlyDigits('19.131.243/0001-97')).toBe('19131243000197')
  })

  it('validates known CNPJ', () => {
    expect(isValidCnpj('19131243000197')).toBe(true)
    expect(isValidCnpj('00.000.000/0000-00')).toBe(false)
    expect(isValidCnpj('11111111111111')).toBe(false)
    expect(isValidCnpj('123')).toBe(false)
  })
})

describe('brMacroRegion', () => {
  it('maps UF to macro', () => {
    expect(macroRegionFromUf('SP')).toBe('Sudeste')
    expect(macroRegionFromUf('rs')).toBe('Sul')
    expect(macroRegionFromUf('AM')).toBe('Norte')
    expect(macroRegionFromUf('XX')).toBe(null)
  })
})

describe('cnpj status warning', () => {
  it('flags non-active', () => {
    expect(isCnpjStatusWarning(2, 'ATIVA')).toBe(false)
    expect(isCnpjStatusWarning(8, 'BAIXADA')).toBe(true)
    expect(isCnpjStatusWarning(null, 'Suspensa')).toBe(true)
  })
})
