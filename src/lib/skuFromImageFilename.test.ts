import { describe, expect, it } from 'vitest'
import { isLikelyImageFile, skuKeyFromImageFilename } from './skuFromImageFilename'

describe('skuFromImageFilename', () => {
  it('extrai SKU simples', () => {
    expect(skuKeyFromImageFilename('HF-001.jpg')).toBe('HF-001')
  })

  it('remove sufixo de galeria _N', () => {
    expect(skuKeyFromImageFilename('ABC-1_2.png')).toBe('ABC-1')
  })

  it('retorna null para só extensão', () => {
    expect(skuKeyFromImageFilename('.jpg')).toBeNull()
  })

  it('detecta imagem por extensão', () => {
    expect(isLikelyImageFile({ name: 'x.webp', type: '' })).toBe(true)
    expect(isLikelyImageFile({ name: 'x.txt', type: 'text/plain' })).toBe(false)
  })
})
