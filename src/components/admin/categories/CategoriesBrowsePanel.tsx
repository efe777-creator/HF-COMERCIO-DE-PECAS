import { categoryStatusLabel } from '@/components/admin/categories/categoryAdminUi'
import { Button } from '@/components/common/Button'
import { EmptyState } from '@/components/common/EmptyState'
import {
  categoryLevelLabel,
  categoryPath,
  CATEGORY_MAX_DEPTH,
} from '@/services/admin/adminCategoryService'
import type { Category } from '@/types'

export type CategoryFlatRow = {
  cat: Category
  depth: 1 | 2 | 3
  path: string
}

type Props = {
  viewMode: 'tree' | 'list'
  flatRows: CategoryFlatRow[]
  visibleRoots: Category[]
  treeItems: Category[]
  counts: Record<string, number>
  editingId: string | null
  /** Guia Adaptive aberta — vocabulário Abrir guia / Na guia. */
  guideOpen?: boolean
  busyId: string | null
  searchQ: string
  expanded: Set<string>
  childrenOf: (id: string) => Category[]
  siblingsOf: (cat: Category) => Category[]
  matchesSearch: (c: Category) => boolean
  nodeOrDescendantMatches: (id: string) => boolean
  onToggleExpanded: (id: string) => void
  onReorder: (cat: Category, direction: 'up' | 'down') => void
  onEdit: (cat: Category) => void
  onAddChild: (cat: Category) => void
  onArchiveToggle: (cat: Category) => void
  onDelete: (cat: Category) => void
  onStartCreateRoot: () => void
}

/** Lista plana + árvore da classificação. */
export function CategoriesBrowsePanel({
  viewMode,
  flatRows,
  visibleRoots,
  treeItems,
  counts,
  editingId,
  guideOpen = false,
  busyId,
  searchQ,
  expanded,
  childrenOf,
  siblingsOf,
  matchesSearch,
  nodeOrDescendantMatches,
  onToggleExpanded,
  onReorder,
  onEdit,
  onAddChild,
  onArchiveToggle,
  onDelete,
  onStartCreateRoot,
}: Props) {
  function renderNode(cat: Category, depth: number) {
    const kids = childrenOf(cat.id)
    const hasKids = kids.length > 0
    const isOpen = expanded.has(cat.id) || Boolean(searchQ && hasKids)
    const level = categoryLevelLabel(depth)
    const canAddChild = depth < CATEGORY_MAX_DEPTH
    const sibs = siblingsOf(cat)
    const sibIdx = sibs.findIndex((s) => s.id === cat.id)
    const indentPx = (depth - 1) * 20
    const productCount = counts[cat.id] ?? 0
    const highlight =
      searchQ && matchesSearch(cat)
        ? 'bg-hf-red/20'
        : editingId === cat.id
          ? 'bg-hf-red/15'
          : cat.status === 'archived'
            ? 'opacity-60'
            : ''

    return (
      <div key={cat.id}>
        <div
          className={`flex flex-wrap items-center gap-2 border-t border-hf-line px-3 py-2 text-sm ${highlight}`}
          style={{ paddingLeft: 12 + indentPx }}
        >
          <button
            type="button"
            className="w-6 shrink-0 font-bold text-hf-ink disabled:opacity-30"
            disabled={!hasKids}
            aria-label={isOpen ? 'Recolher' : 'Expandir'}
            onClick={() => onToggleExpanded(cat.id)}
          >
            {hasKids ? (isOpen ? '▾' : '▸') : '·'}
          </button>
          <div className="min-w-[160px] flex-1">
            <div className={depth === 1 ? 'font-extrabold text-hf-ink' : 'font-semibold text-hf-ink'}>
              {cat.name}
            </div>
            <div className="text-xs text-hf-muted">
              {level}
              {cat.description ? ` · ${cat.description}` : ''}
              {' · '}
              {productCount} prod.
            </div>
          </div>
          <span className="hidden text-xs text-hf-muted lg:inline">
            {categoryPath(treeItems, cat.id)}
          </span>
          <span className="text-xs text-hf-muted">#{cat.sortOrder ?? 0}</span>
          <span className="text-xs">{categoryStatusLabel(cat.status)}</span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="font-semibold text-hf-ink underline disabled:opacity-40"
              disabled={busyId === cat.id || sibIdx <= 0}
              onClick={() => onReorder(cat, 'up')}
              title="Subir entre irmãos"
            >
              ↑
            </button>
            <button
              type="button"
              className="font-semibold text-hf-ink underline disabled:opacity-40"
              disabled={busyId === cat.id || sibIdx < 0 || sibIdx >= sibs.length - 1}
              onClick={() => onReorder(cat, 'down')}
              title="Descer entre irmãos"
            >
              ↓
            </button>
            <button
              type="button"
              className="inline-flex min-h-9 items-center rounded-[10px] bg-hf-red px-2.5 text-xs font-bold text-white"
              onClick={() => onEdit(cat)}
            >
              {guideOpen && editingId === cat.id ? 'Na guia' : 'Abrir guia'}
            </button>
            {canAddChild && cat.status !== 'archived' ? (
              <button
                type="button"
                className="font-semibold text-hf-ink underline"
                onClick={() => onAddChild(cat)}
              >
                + {categoryLevelLabel(depth + 1)}
              </button>
            ) : null}
            <button
              type="button"
              className="font-semibold text-hf-muted"
              disabled={busyId === cat.id}
              onClick={() => onArchiveToggle(cat)}
            >
              {cat.status === 'archived' ? 'Publicar' : 'Arquivar'}
            </button>
            <button
              type="button"
              className="font-semibold text-hf-danger underline disabled:opacity-50"
              disabled={busyId === cat.id}
              onClick={() => onDelete(cat)}
            >
              Excluir
            </button>
          </div>
        </div>
        {hasKids && isOpen
          ? kids
              .filter(
                (ch) =>
                  !searchQ ||
                  matchesSearch(ch) ||
                  nodeOrDescendantMatches(ch.id) ||
                  matchesSearch(cat),
              )
              .map((ch) => renderNode(ch, depth + 1))
          : null}
      </div>
    )
  }

  function listRowActions(cat: Category, depth: 1 | 2 | 3) {
    return (
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="inline-flex min-h-9 items-center rounded-[10px] bg-hf-red px-2.5 text-xs font-bold text-white"
          onClick={() => onEdit(cat)}
        >
          {guideOpen && editingId === cat.id ? 'Na guia' : 'Abrir guia'}
        </button>
        <button
          type="button"
          className="font-semibold text-hf-muted"
          disabled={busyId === cat.id}
          onClick={() => onArchiveToggle(cat)}
        >
          {cat.status === 'archived' ? 'Publicar' : 'Arquivar'}
        </button>
        {depth < CATEGORY_MAX_DEPTH && cat.status !== 'archived' ? (
          <button
            type="button"
            className="font-semibold text-hf-ink underline"
            onClick={() => onAddChild(cat)}
          >
            + {categoryLevelLabel(depth + 1)}
          </button>
        ) : null}
        <button
          type="button"
          className="font-semibold text-hf-danger underline disabled:opacity-50"
          disabled={busyId === cat.id}
          onClick={() => onDelete(cat)}
        >
          Excluir
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-[14px] border border-hf-line bg-hf-surface">
      <div className="flex flex-wrap gap-4 border-b border-hf-line bg-hf-bg px-3 py-2 text-xs font-extrabold text-hf-muted">
        <span>Categoria</span>
        <span>→ Grupo</span>
        <span>→ Subgrupo</span>
        <span className="font-normal">· {viewMode === 'list' ? 'Lista plana' : 'Árvore'}</span>
      </div>
      {viewMode === 'list' ? (
        flatRows.length === 0 ? (
          <div className="px-3 py-4">
            <EmptyState
              title="Nenhuma classificação encontrada"
              description="Ajuste o filtro de nível ou limpe a busca. Arquivados ficam no link “Ver arquivados” do resumo acima."
            >
              <div className="mt-4 flex justify-center gap-2">
                <Button type="button" onClick={onStartCreateRoot}>
                  + Criar categoria
                </Button>
              </div>
            </EmptyState>
          </div>
        ) : (
          <>
            <div className="admin-categories-list-mobile space-y-2 p-2 md:hidden">
              {flatRows.map(({ cat, depth, path }) => (
                <div
                  key={`m-${cat.id}`}
                  className={`rounded-[10px] border border-hf-line px-3 py-2 ${
                    editingId === cat.id
                      ? 'bg-hf-red/15'
                      : cat.status === 'archived'
                        ? 'bg-amber-50/80'
                        : 'bg-hf-bg'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="m-0 text-xs font-bold text-hf-muted">
                        {categoryLevelLabel(depth)}
                      </p>
                      <p className="m-0 truncate text-sm font-semibold text-hf-ink">{cat.name}</p>
                      <p className="m-0 truncate text-[11px] text-hf-muted">{path}</p>
                      <p className="m-0 text-[11px] text-hf-muted">
                        {categoryStatusLabel(cat.status)} · {counts[cat.id] ?? 0} prod.
                      </p>
                    </div>
                  </div>
                  <div className="mt-2">{listRowActions(cat, depth)}</div>
                </div>
              ))}
            </div>
            <div className="admin-categories-list-desktop hidden overflow-x-auto md:block">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-hf-bg text-xs font-extrabold uppercase text-hf-muted">
                  <tr>
                    <th className="px-3 py-2">Nível</th>
                    <th className="px-3 py-2">Nome</th>
                    <th className="px-3 py-2">Caminho</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Prod.</th>
                    <th className="px-3 py-2">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {flatRows.map(({ cat, depth, path }) => (
                    <tr
                      key={cat.id}
                      className={`border-t border-hf-line ${
                        editingId === cat.id
                          ? 'bg-hf-red/15'
                          : cat.status === 'archived'
                            ? 'bg-amber-50/80'
                            : ''
                      }`}
                    >
                      <td className="whitespace-nowrap px-3 py-2 text-xs font-bold text-hf-muted">
                        {categoryLevelLabel(depth)}
                      </td>
                      <td className="px-3 py-2 font-semibold text-hf-ink">{cat.name}</td>
                      <td className="px-3 py-2 text-xs text-hf-muted">{path}</td>
                      <td className="px-3 py-2 text-xs">{categoryStatusLabel(cat.status)}</td>
                      <td className="px-3 py-2 text-xs">{counts[cat.id] ?? 0}</td>
                      <td className="px-3 py-2">{listRowActions(cat, depth)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )
      ) : visibleRoots.length === 0 ? (
        <div className="px-3 py-4">
          <EmptyState
            title="Nenhuma classificação na árvore"
            description="Crie a primeira categoria raiz ou limpe a busca."
          >
            <div className="mt-4 flex justify-center gap-2">
              <Button type="button" onClick={onStartCreateRoot}>
                + Criar categoria
              </Button>
            </div>
          </EmptyState>
        </div>
      ) : (
        <div className="space-y-1 p-2">{visibleRoots.map((root) => renderNode(root, 1))}</div>
      )}
    </div>
  )
}
