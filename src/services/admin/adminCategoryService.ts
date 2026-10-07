import { getSupabase } from '@/lib/supabase'
import { toSlug } from '@/lib/slug'
import type { Category } from '@/types'

export const CATEGORY_MAX_DEPTH = 3 // Grupo(1) → Categoria(2) → Subcategoria(3)

type Row = {
  id: string
  parent_id: string | null
  name: string
  slug: string
  description: string | null
  sort_order: number
  status: string
}

function map(row: Row): Category {
  return {
    id: row.id,
    parentId: row.parent_id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? undefined,
    sortOrder: row.sort_order,
    status: row.status as Category['status'],
  }
}

export async function adminListCategories(): Promise<Category[]> {
  const { data, error } = await getSupabase()
    .from('product_categories')
    .select('id, parent_id, name, slug, description, sort_order, status')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })
  if (error) throw error
  return (data as Row[]).map(map)
}

/** Depth 1 = Grupo (sem pai), 2 = Categoria, 3 = Subcategoria. */
export function categoryDepth(items: Category[], id: string | null | undefined): number {
  if (!id) return 0
  let depth = 0
  let cur: string | null | undefined = id
  const seen = new Set<string>()
  while (cur) {
    if (seen.has(cur)) break
    seen.add(cur)
    depth += 1
    cur = items.find((c) => c.id === cur)?.parentId ?? null
  }
  return depth
}

export function categoryLevelLabel(depth: number): string {
  if (depth <= 1) return 'Grupo'
  if (depth === 2) return 'Categoria'
  if (depth === 3) return 'Subcategoria'
  return `Nível ${depth}`
}

/** Path "Grupo / Categoria / Subcategoria". */
export function categoryPath(items: Category[], id: string): string {
  const parts: string[] = []
  let cur: string | null | undefined = id
  const seen = new Set<string>()
  while (cur) {
    if (seen.has(cur)) break
    seen.add(cur)
    const node = items.find((c) => c.id === cur)
    if (!node) break
    parts.unshift(node.name)
    cur = node.parentId
  }
  return parts.join(' / ')
}

/** IDs do nó + todos os descendentes (filtro de classificação inclui folhas). */
export function collectCategorySubtreeIds(items: Category[], rootId: string): string[] {
  if (!items.some((c) => c.id === rootId)) return []
  const ids = [rootId]
  const queue = [rootId]
  while (queue.length) {
    const parent = queue.shift()!
    for (const child of items) {
      if (child.parentId === parent && !ids.includes(child.id)) {
        ids.push(child.id)
        queue.push(child.id)
      }
    }
  }
  return ids
}

/** Pais permitidos: Grupo ou Categoria (depth 1–2). Subcategoria não pode ser pai. */
export function allowedCategoryParents(
  items: Category[],
  editingId?: string | null,
): Category[] {
  return items.filter((c) => {
    if (editingId && c.id === editingId) return false
    const d = categoryDepth(items, c.id)
    return d >= 1 && d <= 2
  })
}

export async function adminCountProductsInCategory(categoryId: string): Promise<number> {
  const { count, error } = await getSupabase()
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', categoryId)
  if (error) throw error
  return count ?? 0
}

export async function adminUpsertCategory(input: {
  id?: string
  name: string
  slug?: string
  description?: string
  parentId?: string | null
  sortOrder?: number
  status?: Category['status']
  /** Lista atual para validar profundidade (obrigatória para hard-limit). */
  allCategories?: Category[]
}): Promise<Category> {
  const all = input.allCategories ?? (await adminListCategories())
  const parentId = input.parentId || null

  if (parentId) {
    const parentDepth = categoryDepth(all, parentId)
    if (parentDepth >= CATEGORY_MAX_DEPTH) {
      throw new Error(
        'Não é permitido 4º nível. Hierarquia máxima: Grupo → Categoria → Subcategoria.',
      )
    }
    if (parentDepth < 1) {
      throw new Error('Pai inválido.')
    }
    // Filho terá parentDepth + 1
    if (parentDepth + 1 > CATEGORY_MAX_DEPTH) {
      throw new Error(
        'Não é permitido 4º nível. Hierarquia máxima: Grupo → Categoria → Subcategoria.',
      )
    }
  }

  if (input.id && parentId) {
    // Evitar ciclo / mover sob próprio descendente
    let cur: string | null = parentId
    const seen = new Set<string>()
    while (cur) {
      if (cur === input.id) {
        throw new Error('Não é possível definir um descendente como pai.')
      }
      if (seen.has(cur)) break
      seen.add(cur)
      cur = all.find((c) => c.id === cur)?.parentId ?? null
    }
  }

  const name = input.name.trim().toLocaleUpperCase('pt-BR')
  const payload = {
    name,
    slug: (input.slug?.trim() || toSlug(name)) || toSlug(`cat-${Date.now()}`),
    description: input.description?.trim() || null,
    parent_id: parentId,
    sort_order: input.sortOrder ?? 0,
    status: input.status ?? 'published',
  }
  const q = getSupabase().from('product_categories')
  const { data, error } = input.id
    ? await q.update(payload).eq('id', input.id).select().single()
    : await q.insert(payload).select().single()
  if (error) throw error
  return map(data as Row)
}

export async function adminSetCategoryStatus(
  id: string,
  status: NonNullable<Category['status']>,
): Promise<void> {
  const { error } = await getSupabase()
    .from('product_categories')
    .update({ status })
    .eq('id', id)
  if (error) throw error
}
