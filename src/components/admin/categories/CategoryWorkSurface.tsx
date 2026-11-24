import {
  CategoriesEditorForm,
  type CreateLevel,
} from '@/components/admin/categories/CategoriesEditorForm'
import type { Category } from '@/types'
import type { FormEvent, RefObject } from 'react'

type Props = {
  formRef: RefObject<HTMLFormElement | null>
  nameInputRef: RefObject<HTMLInputElement | null>
  items: Category[]
  editing: Category | null
  createLevel: CreateLevel
  name: string
  description: string
  parentId: string
  subgrupoCategoriaId: string
  sortOrder: string
  resultingDepth: number
  categoriaOptions: Category[]
  parentOptions: Category[]
  busyId: string | null
  childrenCount: (parentId: string) => number
  onClose: () => void
  onSubmit: (e: FormEvent) => void
  onStartCreate: (level: CreateLevel) => void
  onReset: () => void
  onDelete: (cat: Category) => void
  onName: (v: string) => void
  onDescription: (v: string) => void
  onParentId: (v: string) => void
  onSubgrupoCategoriaId: (v: string) => void
  onSortOrder: (v: string) => void
}

/**
 * Superfície contextual do hub Classificação (Adaptive).
 * Create/edit na guia — formulário não fica permanente no primary.
 */
export function CategoryWorkSurface({
  onClose,
  editing,
  createLevel,
  ...formProps
}: Props) {
  const title = editing
    ? `Editar · ${editing.name}`
    : createLevel === 1
      ? 'Nova categoria na guia'
      : createLevel === 2
        ? 'Novo grupo na guia'
        : 'Novo subgrupo na guia'

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hf-line pb-2">
        <p className="m-0 text-xs font-semibold text-hf-muted">{title}</p>
        <button
          type="button"
          className="text-xs font-semibold text-hf-muted underline"
          onClick={onClose}
        >
          Fechar guia
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <CategoriesEditorForm editing={editing} createLevel={createLevel} {...formProps} />
      </div>
    </div>
  )
}
