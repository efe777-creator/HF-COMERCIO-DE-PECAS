import { describe, expect, it } from 'vitest'
import {
  allowedCategoryParents,
  categoryDepth,
  categoryLevelLabel,
  categoryPath,
  collectCategorySubtreeIds,
  CATEGORY_MAX_DEPTH,
} from '@/services/admin/adminCategoryService'
import type { Category } from '@/types'

function cat(
  id: string,
  name: string,
  parentId: string | null = null,
): Category {
  return {
    id,
    name,
    slug: id,
    parentId,
    sortOrder: 0,
    status: 'published',
  }
}

describe('category hierarchy (3 níveis)', () => {
  const items = [
    cat('g1', 'SUSPENSÃO'),
    cat('c1', 'BANDEJA', 'g1'),
    cat('s1', 'BANDEJA S/PIVO', 'c1'),
    cat('s2', 'BANDEJA COMPLETA', 'c1'),
  ]

  it('depth Categoria/Grupo/Subgrupo', () => {
    expect(categoryDepth(items, 'g1')).toBe(1)
    expect(categoryDepth(items, 'c1')).toBe(2)
    expect(categoryDepth(items, 's1')).toBe(3)
    expect(categoryLevelLabel(1)).toBe('Categoria')
    expect(categoryLevelLabel(2)).toBe('Grupo')
    expect(categoryLevelLabel(3)).toBe('Subgrupo')
    expect(CATEGORY_MAX_DEPTH).toBe(3)
  })

  it('path', () => {
    expect(categoryPath(items, 's1')).toBe('SUSPENSÃO / BANDEJA / BANDEJA S/PIVO')
  })

  it('pais permitidos excluem subcategoria (bloqueia 4º nível)', () => {
    const parents = allowedCategoryParents(items)
    expect(parents.map((p) => p.id).sort()).toEqual(['c1', 'g1'])
    expect(parents.some((p) => p.id === 's1')).toBe(false)
  })

  it('subtree inclui nó + descendentes', () => {
    expect(collectCategorySubtreeIds(items, 'g1').sort()).toEqual(['c1', 'g1', 's1', 's2'])
    expect(collectCategorySubtreeIds(items, 'c1').sort()).toEqual(['c1', 's1', 's2'])
    expect(collectCategorySubtreeIds(items, 's1')).toEqual(['s1'])
    expect(collectCategorySubtreeIds(items, 'missing')).toEqual([])
  })
})
