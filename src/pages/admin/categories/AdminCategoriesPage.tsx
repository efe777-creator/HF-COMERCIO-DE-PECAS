import { CategoriesArchivedMenu } from '@/components/admin/categories/CategoriesArchivedMenu'
import { CategoriesBrowseBar } from '@/components/admin/categories/CategoriesBrowseBar'
import { CategoriesBrowsePanel } from '@/components/admin/categories/CategoriesBrowsePanel'
import type { CreateLevel } from '@/components/admin/categories/CategoriesEditorForm'
import { CategoryWorkSurface } from '@/components/admin/categories/CategoryWorkSurface'
import { AdaptiveWorkspace } from '@/components/admin/workspace/AdaptiveWorkspace'
import { Button } from '@/components/common/Button'
import { Loading } from '@/components/common/Loading'
import { useToast } from '@/components/common/Toast'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  adminCountProductsInCategory,
  adminCountProductsPerCategory,
  adminDeleteCategory,
  adminListCategories,
  adminReorderSiblingCategories,
  adminSetCategoryStatus,
  adminUpsertCategory,
  allowedCategoryParents,
  categoryDepth,
  categoryLevelLabel,
  categoryPath,
  CATEGORY_MAX_DEPTH,
} from '@/services/admin/adminCategoryService'
import type { Category } from '@/types'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'

export function AdminCategoriesPage() {
  const toast = useToast()
  const [items, setItems] = useState<Category[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  function pushError(msg: string) {
    setError(msg)
    toast.push(msg, 'error')
  }

  function pushOk(msg: string) {
    setInfo(msg)
    toast.push(msg, 'success')
  }

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [parentId, setParentId] = useState('')
  const [subgrupoCategoriaId, setSubgrupoCategoriaId] = useState('')
  const [sortOrder, setSortOrder] = useState('0')
  const [editing, setEditing] = useState<Category | null>(null)
  const [createLevel, setCreateLevel] = useState<CreateLevel>(1)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [busyId, setBusyId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('list')
  const [levelFilter, setLevelFilter] = useState<0 | 1 | 2 | 3>(0)
  const [dirty, setDirty] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!dirty) return
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  async function reload() {
    setLoading(true)
    setError(null)
    try {
      const [cats, productCounts] = await Promise.all([
        adminListCategories(),
        adminCountProductsPerCategory(),
      ])
      setItems(cats)
      setCounts(productCounts)
      const withKids = new Set(
        cats.filter((c) => cats.some((ch) => ch.parentId === c.id)).map((c) => c.id),
      )
      setExpanded(withKids)
    } catch (e) {
      pushError(toUserMessage(e, 'Erro ao carregar categorias'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const treeItems = useMemo(
    () => items.filter((c) => c.status !== 'archived'),
    [items],
  )

  const roots = useMemo(() => treeItems.filter((c) => !c.parentId), [treeItems])

  const childrenOf = (id: string) =>
    treeItems
      .filter((c) => c.parentId === id)
      .slice()
      .sort(
        (a, b) =>
          (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name, 'pt-BR'),
      )

  const siblingsOf = (cat: Category) =>
    treeItems
      .filter((c) => (c.parentId ?? null) === (cat.parentId ?? null))
      .slice()
      .sort(
        (a, b) =>
          (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name, 'pt-BR'),
      )

  const categoriaOptions = useMemo(() => {
    return items
      .filter(
        (c) =>
          !c.parentId &&
          (c.status !== 'archived' ||
            c.id === subgrupoCategoriaId ||
            c.id === parentId),
      )
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  }, [items, subgrupoCategoriaId, parentId])

  const parentOptions = useMemo(() => {
    const wantParentDepth = createLevel - 1
    if (wantParentDepth < 1) return []
    const pool = items.filter(
      (c) => c.status !== 'archived' || c.id === editing?.parentId,
    )
    let list = allowedCategoryParents(pool, editing?.id).filter(
      (p) => categoryDepth(items, p.id) === wantParentDepth,
    )
    if (createLevel === 3 && subgrupoCategoriaId) {
      list = list.filter((p) => p.parentId === subgrupoCategoriaId)
    } else if (createLevel === 3) {
      list = []
    }
    return list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  }, [items, editing, createLevel, subgrupoCategoriaId])

  const resultingDepth = editing
    ? parentId
      ? categoryDepth(
          items.filter((c) => c.status !== 'archived' || c.id === editing.id),
          parentId,
        ) + 1
      : 1
    : createLevel

  const searchQ = search.trim().toLowerCase()
  const matchesSearch = (c: Category) =>
    !searchQ ||
    c.name.toLowerCase().includes(searchQ) ||
    c.slug.toLowerCase().includes(searchQ) ||
    (c.description ?? '').toLowerCase().includes(searchQ) ||
    categoryPath(treeItems, c.id).toLowerCase().includes(searchQ)

  const nodeOrDescendantMatches = (id: string): boolean => {
    const node = treeItems.find((c) => c.id === id)
    if (!node) return false
    if (matchesSearch(node)) return true
    return childrenOf(id).some((ch) => nodeOrDescendantMatches(ch.id))
  }

  const visibleRoots = useMemo(() => {
    const sorted = roots
      .slice()
      .sort(
        (a, b) =>
          (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name, 'pt-BR'),
      )
    if (!searchQ) return sorted
    return sorted.filter((root) => nodeOrDescendantMatches(root.id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roots, treeItems, searchQ])

  const levelStats = useMemo(() => {
    let cat = 0
    let grp = 0
    let sub = 0
    for (const c of items) {
      if (c.status === 'archived') continue
      const d = categoryDepth(items, c.id)
      if (d === 1) cat += 1
      else if (d === 2) grp += 1
      else if (d === 3) sub += 1
    }
    return { cat, grp, sub }
  }, [items])

  const flatRows = useMemo(() => {
    return treeItems
      .map((c) => ({
        cat: c,
        depth: categoryDepth(items, c.id) as 1 | 2 | 3,
        path: categoryPath(items, c.id),
      }))
      .filter((row) => {
        if (levelFilter && row.depth !== levelFilter) return false
        if (!searchQ) return true
        return (
          row.cat.name.toLowerCase().includes(searchQ) ||
          row.cat.slug.toLowerCase().includes(searchQ) ||
          row.path.toLowerCase().includes(searchQ) ||
          (row.cat.description ?? '').toLowerCase().includes(searchQ)
        )
      })
      .sort((a, b) => a.path.localeCompare(b.path, 'pt-BR') || a.depth - b.depth)
  }, [treeItems, items, levelFilter, searchQ])

  useEffect(() => {
    if (!searchQ) return
    setExpanded((prev) => {
      const next = new Set(prev)
      for (const root of roots) {
        if (!nodeOrDescendantMatches(root.id)) continue
        next.add(root.id)
        for (const cat of childrenOf(root.id)) {
          if (
            matchesSearch(cat) ||
            childrenOf(cat.id).some(matchesSearch) ||
            matchesSearch(root)
          ) {
            next.add(cat.id)
          }
        }
      }
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQ, treeItems])

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function resetForm() {
    setEditing(null)
    setName('')
    setDescription('')
    setParentId('')
    setSubgrupoCategoriaId('')
    setSortOrder('0')
    setCreateLevel(1)
    setDirty(false)
    setGuideOpen(false)
  }

  function focusForm() {
    setGuideOpen(true)
    window.requestAnimationFrame(() => {
      nameInputRef.current?.focus()
      nameInputRef.current?.select()
    })
  }

  function closeContextual() {
    if (dirty) {
      const ok = window.confirm(
        'Há alterações na classificação ainda não salvas. Fechar a guia mesmo assim?',
      )
      if (!ok) return
    }
    resetForm()
  }

  function confirmLeaveDirtyGuide(): boolean {
    if (!dirty || !guideOpen) return true
    return window.confirm(
      'Há alterações na classificação ainda não salvas. Trocar de registro mesmo assim?',
    )
  }

  function startCreate(level: CreateLevel) {
    if (!confirmLeaveDirtyGuide()) return
    setEditing(null)
    setName('')
    setDescription('')
    setCreateLevel(level)
    setError(null)
    setInfo(
      level === 1
        ? 'Nova Categoria (raiz).'
        : level === 2
          ? 'Novo Grupo — escolha a Categoria pai.'
          : 'Novo Subgrupo — escolha o Grupo pai.',
    )
    setDirty(false)
    if (level === 1) {
      setParentId('')
      setSubgrupoCategoriaId('')
      setSortOrder(String(roots.length))
    } else if (level === 2) {
      setSubgrupoCategoriaId('')
      const cats = items
        .filter((c) => !c.parentId && c.status !== 'archived')
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
      const first = cats[0]
      setParentId(first?.id ?? '')
      setSortOrder(first ? String(childrenOf(first.id).length) : '0')
    } else {
      const cats = items
        .filter((c) => !c.parentId && c.status !== 'archived')
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
      const catId = cats[0]?.id ?? ''
      setSubgrupoCategoriaId(catId)
      const grupos = items
        .filter(
          (c) =>
            c.parentId === catId &&
            c.status !== 'archived' &&
            categoryDepth(items, c.id) === 2,
        )
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
      const firstGrupo = grupos[0]
      setParentId(firstGrupo?.id ?? '')
      setSortOrder(firstGrupo ? String(childrenOf(firstGrupo.id).length) : '0')
    }
    focusForm()
  }

  function startEdit(cat: Category) {
    if (editing?.id !== cat.id && !confirmLeaveDirtyGuide()) return
    const depth = Math.min(3, Math.max(1, categoryDepth(items, cat.id))) as CreateLevel
    setEditing(cat)
    setName(cat.name)
    setDescription(cat.description ?? '')
    setParentId(cat.parentId ?? '')
    setSortOrder(String(cat.sortOrder ?? 0))
    setCreateLevel(depth)
    if (depth === 3 && cat.parentId) {
      const grupo = items.find((c) => c.id === cat.parentId)
      setSubgrupoCategoriaId(grupo?.parentId ?? '')
    } else {
      setSubgrupoCategoriaId('')
    }
    setError(null)
    setInfo(null)
    setDirty(false)
    focusForm()
  }

  function startAddChild(parent: Category) {
    if (!confirmLeaveDirtyGuide()) return
    const depth = categoryDepth(items, parent.id)
    if (depth >= CATEGORY_MAX_DEPTH) {
      pushError('Subgrupo não pode ter filhos (máx. 3 níveis).')
      return
    }
    const nextLevel = (depth + 1) as CreateLevel
    setEditing(null)
    setName('')
    setDescription('')
    setCreateLevel(nextLevel)
    setParentId(parent.id)
    if (nextLevel === 3) {
      setSubgrupoCategoriaId(parent.parentId ?? '')
    } else {
      setSubgrupoCategoriaId('')
    }
    setSortOrder(String(childrenOf(parent.id).length))
    setError(null)
    setInfo(`Nova ${categoryLevelLabel(nextLevel).toLowerCase()} sob "${parent.name}".`)
    setDirty(false)
    setExpanded((prev) => new Set(prev).add(parent.id))
    focusForm()
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    const effectiveParent = createLevel === 1 && !editing ? '' : parentId
    if (!editing && createLevel > 1 && !effectiveParent) {
      pushError(`Selecione o pai para criar ${categoryLevelLabel(createLevel).toLowerCase()}.`)
      return
    }
    try {
      const saved = await adminUpsertCategory({
        id: editing?.id,
        name,
        description: description || undefined,
        parentId: effectiveParent || null,
        status: editing?.status ?? 'published',
        sortOrder: Number(sortOrder) || 0,
        allCategories: items,
      })
      if (saved.parentId) {
        setExpanded((prev) => new Set(prev).add(saved.parentId!))
      }
      resetForm()
      await reload()
      pushOk('Classificação salva.')
    } catch (err) {
      pushError(toUserMessage(err, 'Falha ao salvar'))
    }
  }

  async function onArchiveToggle(cat: Category) {
    setError(null)
    setBusyId(cat.id)
    try {
      if (cat.status !== 'archived') {
        const kids = items.filter((c) => c.parentId === cat.id && c.status !== 'archived')
        if (kids.length > 0) {
          pushError(
            `Não é possível arquivar "${cat.name}" enquanto houver filhos (${kids.length}). Arquive ou mova os filhos antes.`,
          )
          return
        }
        const productCount = counts[cat.id] ?? (await adminCountProductsInCategory(cat.id))
        if (productCount > 0) {
          pushError(
            `Há ${productCount} produto(s) nesta classificação. Reclassifique-os antes de arquivar.`,
          )
          return
        }
      }
      await adminSetCategoryStatus(
        cat.id,
        cat.status === 'archived' ? 'published' : 'archived',
      )
      await reload()
      pushOk(cat.status === 'archived' ? 'Publicado novamente.' : 'Arquivado.')
    } catch (err) {
      pushError(toUserMessage(err, 'Falha ao alterar status'))
    } finally {
      setBusyId(null)
    }
  }

  async function onDelete(cat: Category) {
    const ok = window.confirm(
      `Excluir permanentemente "${cat.name}"?\n\nSó funciona sem filhos e sem produtos. Prefira Arquivar para remoção comercial.`,
    )
    if (!ok) return
    setError(null)
    setBusyId(cat.id)
    try {
      await adminDeleteCategory(cat.id, items)
      if (editing?.id === cat.id) resetForm()
      await reload()
      pushOk('Classificação excluída.')
    } catch (err) {
      pushError(toUserMessage(err, 'Falha ao excluir'))
    } finally {
      setBusyId(null)
    }
  }

  async function onReorder(cat: Category, direction: 'up' | 'down') {
    setError(null)
    setBusyId(cat.id)
    try {
      await adminReorderSiblingCategories(
        items.filter((c) => c.status !== 'archived'),
        cat.id,
        direction,
      )
      await reload()
    } catch (err) {
      pushError(toUserMessage(err, 'Falha ao reordenar'))
    } finally {
      setBusyId(null)
    }
  }

  const formHandlers = {
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
    childrenCount: (id: string) => childrenOf(id).length,
    onSubmit,
    onStartCreate: startCreate,
    onReset: resetForm,
    onDelete: (c: Category) => void onDelete(c),
    onName: (v: string) => {
      setDirty(true)
      setName(v)
    },
    onDescription: (v: string) => {
      setDirty(true)
      setDescription(v)
    },
    onParentId: (v: string) => {
      setDirty(true)
      setParentId(v)
    },
    onSubgrupoCategoriaId: (v: string) => {
      setDirty(true)
      setSubgrupoCategoriaId(v)
    },
    onSortOrder: (v: string) => {
      setDirty(true)
      setSortOrder(v)
    },
  }

  const contextualTitle = editing
    ? `Editar · ${editing.name}`
    : createLevel === 1
      ? 'Nova categoria'
      : createLevel === 2
        ? 'Novo grupo'
        : 'Novo subgrupo'

  const primary = (
    <div className="admin-categories-hub space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold text-hf-ink">Classificação</h1>
        <p className="text-sm text-hf-muted">
          Hierarquia de {CATEGORY_MAX_DEPTH} níveis:{' '}
          <strong>Categoria</strong> → <strong>Grupo</strong> → <strong>Subgrupo</strong>. Criar e
          editar na guia; arquivados ficam no menu discreto abaixo.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-[12px] border border-hf-line bg-hf-bg px-3 py-2 text-sm text-hf-ink">
        <span>
          <strong>{levelStats.cat}</strong> categorias
        </span>
        <span>
          <strong>{levelStats.grp}</strong> grupos
        </span>
        <span>
          <strong>{levelStats.sub}</strong> subgrupos
        </span>
        <CategoriesArchivedMenu items={items} onChanged={reload} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="primary" onClick={() => startCreate(1)}>
          + Categoria
        </Button>
        <Button type="button" variant="light" onClick={() => startCreate(2)}>
          + Grupo
        </Button>
        <Button type="button" variant="light" onClick={() => startCreate(3)}>
          + Subgrupo
        </Button>
      </div>

      {dirty ? (
        <p
          className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-950"
          role="status"
        >
          Alterações na classificação não salvas. Clique em Salvar na guia antes de sair.
        </p>
      ) : null}

      <CategoriesBrowseBar
        search={search}
        levelFilter={levelFilter}
        viewMode={viewMode}
        onSearch={setSearch}
        onLevelFilter={setLevelFilter}
        onViewMode={setViewMode}
      />
      {viewMode === 'tree' ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="light"
            onClick={() =>
              setExpanded(
                new Set(
                  treeItems
                    .filter((c) => treeItems.some((ch) => ch.parentId === c.id))
                    .map((c) => c.id),
                ),
              )
            }
          >
            Expandir tudo
          </Button>
          <Button type="button" variant="light" onClick={() => setExpanded(new Set())}>
            Recolher tudo
          </Button>
        </div>
      ) : null}

      {error ? <p className="text-sm text-hf-danger">{error}</p> : null}
      {info ? <p className="text-sm text-green-700">{info}</p> : null}
      {loading ? <Loading /> : null}

      <div className="max-h-[min(60dvh,640px)] overflow-y-auto">
        <CategoriesBrowsePanel
          viewMode={viewMode}
          flatRows={flatRows}
          visibleRoots={visibleRoots}
          treeItems={treeItems}
          counts={counts}
          editingId={editing?.id ?? null}
          guideOpen={guideOpen}
          busyId={busyId}
          searchQ={searchQ}
          expanded={expanded}
          childrenOf={childrenOf}
          siblingsOf={siblingsOf}
          matchesSearch={matchesSearch}
          nodeOrDescendantMatches={nodeOrDescendantMatches}
          onToggleExpanded={toggleExpanded}
          onReorder={(cat, dir) => void onReorder(cat, dir)}
          onEdit={startEdit}
          onAddChild={startAddChild}
          onArchiveToggle={(cat) => void onArchiveToggle(cat)}
          onDelete={(cat) => void onDelete(cat)}
          onStartCreateRoot={() => startCreate(1)}
        />
      </div>
    </div>
  )

  return (
    <AdaptiveWorkspace
      moduleKey="categories"
      primary={primary}
      contextualOpen={guideOpen}
      onContextualOpenChange={(open) => {
        if (!open) closeContextual()
      }}
      contextualTitle={contextualTitle}
      contextual={
        guideOpen ? (
          <CategoryWorkSurface onClose={closeContextual} {...formHandlers} />
        ) : null
      }
    />
  )
}
