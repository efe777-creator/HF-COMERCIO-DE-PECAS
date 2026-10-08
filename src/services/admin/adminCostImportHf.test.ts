import {
  HF_PRINCIPAL_SUPPLIER_CODE,
  isHfPrincipalSupplier,
} from '@/services/admin/adminCostImportService'
import { describe, expect, it } from 'vitest'

describe('isHfPrincipalSupplier', () => {
  it('reconhece HF-SUP-01 (case-insensitive)', () => {
    expect(isHfPrincipalSupplier(HF_PRINCIPAL_SUPPLIER_CODE)).toBe(true)
    expect(isHfPrincipalSupplier('HF-SUP-01')).toBe(true)
    expect(isHfPrincipalSupplier(' HF-SUP-01 ')).toBe(true)
  })

  it('rejeita códigos inválidos', () => {
    expect(isHfPrincipalSupplier('HF-01')).toBe(false)
    expect(isHfPrincipalSupplier(null)).toBe(false)
    expect(isHfPrincipalSupplier('')).toBe(false)
  })
})
