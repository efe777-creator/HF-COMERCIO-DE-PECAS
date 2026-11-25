import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import {
  categoryDepth,
  categoryLevelLabel,
  CATEGORY_MAX_DEPTH,
} from '@/services/admin/adminCategoryService'
import type { Category } from '@/types'
import type { FormEvent, RefObject } from 'react'

export type CreateLevel = 1 | 2 | 3

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

/** Formulário criar/editar classificação na guia Adaptive. */
export function CategoriesEditorForm({
  formRef,
  nameInputRef,
  items,
  editing,
  createLevel,
  name,
  description,
  parentId,
  subgrupoCategoriaId,
  sortOrder,
  resultingDepth,
  categoriaOptions,
  parentOptions,
  busyId,
  childrenCount,
  onSubmit,
  onStartCreate,
  onReset,
  onDelete,
  onName,
  onDescription,
  onParentId,
  onSubgrupoCategoriaId,
  onSortOrder,
}: Props) {
  const highlighted = Boolean(editing || name || parentId || createLevel > 1)

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className={`grid gap-3 rounded-[14px] border bg-hf-surface p-4 md:grid-cols-2 ${
        highlighted ? 'border-hf-red ring-2 ring-hf-red/40' : 'border-hf-line'
      }`}
    >
      <div className="flex flex-wrap items-center gap-3 md:col-span-2">
        <span className="text-xs font-extrabold uppercase tracking-wide text-hf-muted">
          {editing
            ? `Editando ${categoryLevelLabel(categoryDepth(items, editing.id))}`
            : `Criando ${categoryLevelLabel(createLevel)}`}
        </span>
        {!editing ? (
          <div className="flex flex-wrap gap-1">
            {([1, 2, 3] as CreateLevel[]).map((lv) => (
              <button
                key={lv}
                type="button"
                className={`rounded-md border px-2 py-1 text-xs font-bold ${
                  createLevel === lv
                    ? 'border-hf-red bg-hf-red text-white'
                    : 'border-hf-line bg-hf-surface-2 text-hf-ink'
                }`}
                onClick={() => onStartCreate(lv)}
              >
                {categoryLevelLabel(lv)}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <Input
        ref={nameInputRef}
        label="Nome"
        value={name}
        onChange={(e) => onName(e.target.value)}
        required
      />
      <Input
        label="Descrição (opcional)"
        value={description}
        onChange={(e) => onDescription(e.target.value)}
      />

      {createLevel === 2 ? (
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-hf-ink">Categoria pai</span>
          <select
            className="w-full rounded-[10px] border border-hf-line bg-hf-surface px-3 py-2"
            value={parentId}
            onChange={(e) => onParentId(e.target.value)}
            required
          >
            <option value="">Selecione…</option>
            {parentOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-[13px] text-hf-muted">
            Só categorias cadastradas (nível raiz).
          </span>
        </label>
      ) : null}

      {createLevel === 3 ? (
        <>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-hf-ink">Categoria</span>
            <select
              className="w-full rounded-[10px] border border-hf-line bg-hf-surface px-3 py-2"
              value={subgrupoCategoriaId}
              onChange={(e) => {
                const catId = e.target.value
                onSubgrupoCategoriaId(catId)
                const grupos = items
                  .filter(
                    (c) =>
                      c.parentId === catId &&
                      c.status !== 'archived' &&
                      categoryDepth(items, c.id) === 2,
                  )
                  .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
                const first = grupos[0]
                onParentId(first?.id ?? '')
                onSortOrder(first ? String(childrenCount(first.id)) : '0')
              }}
              required
            >
              <option value="">Selecione…</option>
              {categoriaOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-hf-ink">Grupo pai</span>
            <select
              className="w-full rounded-[10px] border border-hf-line bg-hf-surface px-3 py-2"
              value={parentId}
              onChange={(e) => {
                onParentId(e.target.value)
                if (e.target.value) {
                  onSortOrder(String(childrenCount(e.target.value)))
                }
              }}
              required
              disabled={!subgrupoCategoriaId}
            >
              <option value="">
                {subgrupoCategoriaId ? 'Selecione o grupo…' : 'Escolha a categoria antes…'}
              </option>
              {parentOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-[13px] text-hf-muted">
              Só grupos cadastrados nesta categoria.
            </span>
          </label>
        </>
      ) : null}

      {createLevel === 1 ? (
        <div className="rounded-[10px] border border-dashed border-hf-line bg-hf-bg px-3 py-3 text-sm text-hf-muted">
          Categoria raiz — sem pai. Hierarquia: Categoria → Grupo → Subgrupo.
        </div>
      ) : null}

      <Input
        label="Ordem"
        inputMode="numeric"
        value={sortOrder}
        onChange={(e) => onSortOrder(e.target.value)}
        hint="Menor número primeiro entre irmãos. Também dá para usar ↑↓ na árvore."
      />

      <div className="flex flex-wrap items-end gap-2 md:col-span-2">
        <Button type="submit" variant="primary" disabled={resultingDepth > CATEGORY_MAX_DEPTH}>
          {editing ? 'Salvar alterações' : `Criar ${categoryLevelLabel(createLevel).toLowerCase()}`}
        </Button>
        {highlighted ? (
          <Button type="button" variant="light" onClick={onReset}>
            Cancelar
          </Button>
        ) : null}
        {editing ? (
          <Button
            type="button"
            variant="light"
            disabled={busyId === editing.id}
            onClick={() => void onDelete(editing)}
          >
            Excluir
          </Button>
        ) : null}
      </div>
    </form>
  )
}
