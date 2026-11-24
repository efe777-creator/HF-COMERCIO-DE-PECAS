import { describe, expect, it } from 'vitest'
import { pickPrimaryStoragePath, sortProductImagePaths } from './productImages'

describe('productImages', () => {
  it('ordena is_primary antes de sort_order', () => {
    const paths = sortProductImagePaths([
      { product_id: 'a', storage_path: 'a/2.jpg', sort_order: 0, is_primary: false },
      { product_id: 'a', storage_path: 'a/1.jpg', sort_order: 5, is_primary: true },
      { product_id: 'a', storage_path: 'a/3.jpg', sort_order: 1, is_primary: false },
    ])
    expect(paths).toEqual(['a/1.jpg', 'a/2.jpg', 'a/3.jpg'])
  })

  it('pickPrimaryStoragePath retorna null se vazio', () => {
    expect(pickPrimaryStoragePath([])).toBeNull()
  })

  it('pickPrimaryStoragePath escolhe primária', () => {
    expect(
      pickPrimaryStoragePath([
        { product_id: 'a', storage_path: 'x.jpg', sort_order: 0, is_primary: false },
        { product_id: 'a', storage_path: 'y.jpg', sort_order: 9, is_primary: true },
      ]),
    ).toBe('y.jpg')
  })
})
