import { resolveCategoryEmoji, resolveCategoryIcon } from '@/lib/categoryEmoji'
import { describe, expect, it } from 'vitest'

describe('resolveCategoryIcon', () => {
  it('Suspensão → asset (mesmo com emoji placeholder do banco)', () => {
    const icon = resolveCategoryIcon({
      slug: 'suspensao',
      name: 'Suspensão',
      emoji: '📦',
    })
    expect(icon.type).toBe('image')
    if (icon.type === 'image') expect(icon.src).toContain('suspensao.png')
  })

  it('Direção → engrenagem', () => {
    expect(resolveCategoryIcon({ slug: 'direcao', name: 'Direção' })).toEqual({
      type: 'emoji',
      value: '⚙️',
    })
  })

  it('Óleos permanece', () => {
    expect(resolveCategoryIcon({ slug: 'oleos-e-fluidos', name: 'Óleos e Fluidos' })).toEqual({
      type: 'emoji',
      value: '🛢️',
    })
  })

  it('Freio e Filtro usam assets (nome sem slug exato)', () => {
    const freio = resolveCategoryIcon({ slug: 'xyz', name: 'Freios', emoji: '📦' })
    const filtro = resolveCategoryIcon({ slug: 'abc', name: 'Filtros', emoji: '📦' })
    expect(freio.type).toBe('image')
    expect(filtro.type).toBe('image')
    if (freio.type === 'image') expect(freio.src).toContain('freios.png')
    if (filtro.type === 'image') expect(filtro.src).toContain('filtros.png')
  })

  it('compat resolveCategoryEmoji', () => {
    expect(resolveCategoryEmoji({ slug: 'direcao', name: 'Direção' })).toBe('⚙️')
  })
})
