import { describe, expect, it } from 'vitest'
import { fixMojibake, normalizeImportText } from '@/services/import/normalizeText'

describe('normalizeImportText', () => {
  it('preserva acentos válidos', () => {
    expect(normalizeImportText('Pivô Palio')).toBe('Pivô Palio')
    expect(normalizeImportText('Direção')).toBe('Direção')
  })

  it('corrige mojibake comum', () => {
    expect(fixMojibake('PivÃ´')).toBe('Pivô')
    expect(fixMojibake('DireÃ§Ã£o')).toBe('Direção')
  })

  it('remove BOM e espaços extras', () => {
    expect(normalizeImportText('\uFEFF  ABC  DEF  ')).toBe('ABC DEF')
  })
})
