import type { Category } from '@/types'

export type CategoryCascadeValue = {
  rootId: string
  groupId: string
  subId: string
}

export function categoryCascadeToLeafId(v: CategoryCascadeValue): string | null {
  return v.subId || v.groupId || v.rootId || null
}

export function pathToCascadeValue(
  categories: Category[],
  leafId: string | null | undefined,
): CategoryCascadeValue {
  if (!leafId) return { rootId: '', groupId: '', subId: '' }
  const byId = new Map(categories.map((c) => [c.id, c]))
  const path: string[] = []
  let cur: string | null = leafId
  while (cur) {
    path.unshift(cur)
    cur = byId.get(cur)?.parentId ?? null
  }
  return {
    rootId: path[0] ?? '',
    groupId: path[1] ?? '',
    subId: path[2] ?? '',
  }
}

type Props = {
  categories: Category[]
  value: CategoryCascadeValue
  onChange: (next: CategoryCascadeValue) => void
  idPrefix?: string
  disabled?: boolean
}

/** Categoria → Grupo → Subgrupo (folha em products.category_id). */
export function CategoryCascadeSelects({
  categories,
  value,
  onChange,
  idPrefix = 'cat',
  disabled,
}: Props) {
  const roots = categories.filter((c) => !c.parentId).sort((a, b) => a.name.localeCompare(b.name))
  const groups = categories
    .filter((c) => c.parentId === value.rootId)
    .sort((a, b) => a.name.localeCompare(b.name))
  const subs = categories
    .filter((c) => c.parentId === value.groupId)
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <label className="text-sm">
        <span className="mb-1 block font-semibold">Categoria</span>
        <select
          id={`${idPrefix}-root`}
          className="w-full rounded-[10px] border border-hf-line px-3 py-2"
          disabled={disabled}
          value={value.rootId}
          onChange={(e) =>
            onChange({ rootId: e.target.value, groupId: '', subId: '' })
          }
        >
          <option value="">—</option>
          {roots.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        <span className="mb-1 block font-semibold">Grupo</span>
        <select
          id={`${idPrefix}-group`}
          className="w-full rounded-[10px] border border-hf-line px-3 py-2"
          disabled={disabled || !value.rootId}
          value={value.groupId}
          onChange={(e) =>
            onChange({ ...value, groupId: e.target.value, subId: '' })
          }
        >
          <option value="">—</option>
          {groups.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        <span className="mb-1 block font-semibold">Subgrupo</span>
        <select
          id={`${idPrefix}-sub`}
          className="w-full rounded-[10px] border border-hf-line px-3 py-2"
          disabled={disabled || !value.groupId}
          value={value.subId}
          onChange={(e) => onChange({ ...value, subId: e.target.value })}
        >
          <option value="">—</option>
          {subs.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
