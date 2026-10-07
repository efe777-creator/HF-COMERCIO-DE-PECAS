import { describe, expect, it } from 'vitest'
import { decodeImportCsvText } from '@/services/import/decodeImportCsvText'

function toBuffer(bytes: number[]): ArrayBuffer {
  return new Uint8Array(bytes).buffer
}

describe('decodeImportCsvText', () => {
  it('decodifica Windows-1252 (SUSPENSÃO / DIREÇÃO)', () => {
    // "SUSPENSÃO" em CP1252: Ã = 0xC3
    const suspensao = [
      0x53, 0x55, 0x53, 0x50, 0x45, 0x4e, 0x53, 0xc3, 0x4f,
    ]
    expect(decodeImportCsvText(toBuffer(suspensao))).toBe('SUSPENSÃO')

    // "DIREÇÃO" em CP1252: Ç = 0xC7, Ã = 0xC3
    const direcao = [0x44, 0x49, 0x52, 0x45, 0xc7, 0xc3, 0x4f]
    expect(decodeImportCsvText(toBuffer(direcao))).toBe('DIREÇÃO')
  })

  it('preserva UTF-8 válido com BOM', () => {
    const encoder = new TextEncoder()
    const body = encoder.encode('SUSPENSÃO;DIREÇÃO')
    const withBom = new Uint8Array(3 + body.length)
    withBom.set([0xef, 0xbb, 0xbf], 0)
    withBom.set(body, 3)
    expect(decodeImportCsvText(withBom.buffer)).toBe('SUSPENSÃO;DIREÇÃO')
  })

  it('não introduz U+FFFD em CSV CP1252', () => {
    const line = [
      ...[0x53, 0x55, 0x53, 0x50, 0x45, 0x4e, 0x53, 0xc3, 0x4f], // SUSPENSÃO
      0x3b,
      ...[0x44, 0x49, 0x52, 0x45, 0xc7, 0xc3, 0x4f], // DIREÇÃO
    ]
    const out = decodeImportCsvText(toBuffer(line))
    expect(out.includes('\uFFFD')).toBe(false)
    expect(out).toBe('SUSPENSÃO;DIREÇÃO')
  })
})
