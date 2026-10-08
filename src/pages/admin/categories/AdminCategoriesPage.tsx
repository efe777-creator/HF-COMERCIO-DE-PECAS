import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import {
  adminCountProductsInCategory,
  adminListCategories,
  adminSetCategoryStatus,
  adminUpsertCategory,
  allowedCategoryParents,
  categoryDepth,
  categoryLevelLabel,
  categoryPath,
  CATEGORY_MAX_DEPTH,
} from '@/services/admin/adminCategoryService'
import type { Category } from '@/types'
import { Fragment, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'

function statusLabel(status: Category['status']): string {
  if (status === 'archived') return 'Arquivado'
  if (status === 'published') return 'Publicado'
  if (status === 'draft') return 'Rascunho'
  return status ?? '—'
}

export function AdminCategoriesPage() {
  const [items, setItems] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [parentId, setParentId] = useState('')
  const [sortOrder, setSortOrder] = useState('0')
  const [editing, setEditing] = useState<Category | null>(null)
  const [search, setSearch] = useState('')
  const formRef = useRef<HTMLFormElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  async function reload() {
    setLoading(true)
    setError(null)
    try {
      setItems(await adminListCategories())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar categorias')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  /** Arquivadas ficam fora da árvore operacional (prune); só published na gestão do dia a dia. */
  const activeItems = useMemo(
    () => items.filter((c) => c.status !== 'archived'),
    [items],
  )

  const roots = useMemo(() => activeItems.filter((c) => !c.parentId), [activeItems])
  const childrenOf = (id: string) =>
    activeItems
      .filter((c) => c.parentId === id)
      .slice()
      .sort(
        (a, b) =>
          (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name),
      )

  const parentOptions = useMemo(
    () =>
      allowedCategoryParents(activeItems, editing?.id).sort((a, b) =>
        categoryPath(activeItems, a.id).localeCompare(categoryPath(activeItems, b.id)),
      ),
    [activeItems, editing?.id],
  )

  const resultingDepth = parentId ? categoryDepth(activeItems, parentId) + 1 : 1

  const searchQ = search.trim().toLowerCase()
  const matchesSearch = (c: Category) =>
    !searchQ ||
    c.name.toLowerCase().includes(searchQ) ||
    c.slug.toLowerCase().includes(searchQ) ||
    (c.description ?? '').toLowerCase().includes(searchQ) ||
    categoryPath(activeItems, c.id).toLowerCase().includes(searchQ)

  const visibleRoots = useMemo(() => {
    const sorted = roots
      .slice()
      .sort(
        (a, b) =>
          (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name),
      )
    if (!searchQ) return sorted
    return sorted.filter((root) => {
      const cats = childrenOf(root.id)
      const hasMatch =
        matchesSearch(root) ||
        cats.some(
          (cat) =>
            matchesSearch(cat) || childrenOf(cat.id).some((sub) => matchesSearch(sub)),
        )
      return hasMatch
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roots, activeItems, searchQ])

  function resetForm() {
    setEditing(null)
    setName('')
    setDescription('')
    setParentId('')
    setSortOrder('0')
  }

  function startEdit(cat: Category) {
    setEditing(cat)
    setName(cat.name)
    setDescription(cat.description ?? '')
    setParentId(cat.parentId ?? '')
    setSortOrder(String(cat.sortOrder ?? 0))
    setError(null)
    setInfo(null)
    window.requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      nameInputRef.current?.focus()
      nameInputRef.current?.select()
    })
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    try {
      await adminUpsertCategory({
        id: editing?.id,
        name,
        description: description || undefined,
        parentId: parentId || null,
        status: editing?.status ?? 'published',
        sortOrder: Number(sortOrder) || 0,
        allCategories: items,
      })
      resetForm()
      await reload()
      setInfo('Classificação salva.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar')
    }
  }

  async function onArchiveToggle(cat: Category) {
    setError(null)
    try {
      if (cat.status !== 'archived') {
        const kids = childrenOf(cat.id)
        if (kids.length > 0) {
          setError(
            `Não é possível arquivar "${cat.name}" enquanto houver filhos (${kids.length}). Arquive ou mova os filhos antes.`,
          )
          return
        }
        const productCount = await adminCountProductsInCategory(cat.id)
        if (productCount > 0) {
          setError(
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao alterar status')
    }
  }

  function renderRow(cat: Category, indentClass: string) {
    const depth = categoryDepth(activeItems, cat.id)
    const level = categoryLevelLabel(depth)
    return (
      <tr
        key={cat.id}
        className={`border-t border-hf-line ${
          editing?.id === cat.id ? 'bg-hf-red/20' : depth > 1 ? 'bg-hf-bg/40' : ''
        }`}
      >
        <td className={`px-3 py-2 ${indentClass}`}>
          {depth > 1 ? <span className="text-hf-muted">{'↳ '.repeat(depth - 1)}</span> : null}
          <span className={depth === 1 ? 'font-bold' : ''}>{cat.name}</span>
          <div className="text-xs text-hf-muted">
            {level}
            {cat.description ? ` · ${cat.description}` : ''}
          </div>
        </td>
        <td className="px-3 py-2 text-xs text-hf-muted">{categoryPath(activeItems, cat.id)}</td>
        <td className="px-3 py-2">{cat.sortOrder}</td>
        <td className="px-3 py-2 text-hf-muted">{cat.slug}</td>
        <td className="px-3 py-2">{statusLabel(cat.status)}</td>
        <td className="space-x-2 px-3 py-2">
          <button
            type="button"
            className="font-semibold text-hf-auth-link"
            onClick={() => startEdit(cat)}
          >
            Editar
          </button>
          <button
            type="button"
            className="font-semibold text-hf-muted"
            onClick={() => void onArchiveToggle(cat)}
          >
            {cat.status === 'archived' ? 'Publicar' : 'Arquivar'}
          </button>
        </td>
      </tr>
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold text-hf-ink">Classificação</h1>
      <p className="text-sm text-hf-muted">
        Hierarquia de {CATEGORY_MAX_DEPTH} níveis: <strong>Categoria</strong> →{' '}
        <strong>Grupo</strong> → <strong>Subgrupo</strong> (igual ao CSV de importação). Quarto nível
        bloqueado. Categorias arquivadas não aparecem aqui nem no cadastro de produto.
      </p>
      <form
        ref={formRef}
        onSubmit={onSubmit}
        className={`grid gap-3 rounded-[14px] border bg-hf-surface p-4 md:grid-cols-2 ${
          editing ? 'border-hf-red ring-2 ring-hf-red/40' : 'border-hf-line'
        }`}
      >
        <Input
          ref={nameInputRef}
          label={
            editing
              ? `Editar ${categoryLevelLabel(categoryDepth(activeItems, editing.id)).toLowerCase()}`
              : `Novo ${categoryLevelLabel(resultingDepth).toLowerCase()}`
          }
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Input
          label="Descrição (opcional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-hf-ink">Pai (opcional)</span>
          <select
            className="w-full rounded-[10px] border border-hf-line bg-hf-surface px-3 py-2"
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
          >
            <option value="">(nenhum — cria Categoria raiz)</option>
            {parentOptions.map((p) => {
              const d = categoryDepth(activeItems, p.id)
              return (
                <option key={p.id} value={p.id}>
                  {categoryPath(activeItems, p.id)} ({categoryLevelLabel(d)})
                </option>
              )
            })}
          </select>
          <span className="mt-1 block text-[13px] text-hf-muted">
            Resultado: {categoryLevelLabel(resultingDepth)}
            {resultingDepth > CATEGORY_MAX_DEPTH
              ? ' — inválido (4º nível)'
              : resultingDepth === 3
                ? ' (folha)'
                : ''}
          </span>
        </label>
        <Input
          label="Ordem (sort_order)"
          inputMode="numeric"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          hint="Menor número aparece primeiro."
        />
        <div className="flex items-end gap-2 md:col-span-2">
          <Button type="submit" variant="primary" disabled={resultingDepth > CATEGORY_MAX_DEPTH}>
            {editing ? 'Salvar' : 'Criar'}
          </Button>
          {editing ? (
            <Button type="button" variant="light" onClick={resetForm}>
              Cancelar
            </Button>
          ) : null}
        </div>
      </form>

      <Input
        label="Buscar classificação"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Nome, path, slug ou descrição…"
      />

      {error ? <p className="text-sm text-hf-danger">{error}</p> : null}
      {info ? <p className="text-sm text-green-700">{info}</p> : null}
      {loading ? <Loading /> : null}

      <div className="overflow-x-auto rounded-[14px] border border-hf-line bg-hf-surface">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-hf-bg text-hf-muted">
            <tr>
              <th className="px-3 py-2">Nome</th>
              <th className="px-3 py-2">Path</th>
              <th className="px-3 py-2">Ordem</th>
              <th className="px-3 py-2">Slug</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {visibleRoots.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-hf-muted">
                  Nenhuma classificação encontrada.
                </td>
              </tr>
            ) : (
              visibleRoots.map((root) => {
                const cats = childrenOf(root.id)
                return (
                  <Fragment key={root.id}>
                    {(!searchQ ||
                      matchesSearch(root) ||
                      cats.some(
                        (c) =>
                          matchesSearch(c) ||
                          childrenOf(c.id).some((s) => matchesSearch(s)),
                      )) &&
                      renderRow(root, '')}
                    {cats.map((cat) => {
                      const subs = childrenOf(cat.id)
                      const showCat =
                        !searchQ ||
                        matchesSearch(root) ||
                        matchesSearch(cat) ||
                        subs.some(matchesSearch)
                      if (!showCat) return null
                      return (
                        <Fragment key={cat.id}>
                          {renderRow(cat, 'pl-4')}
                          {subs
                            .filter((s) => !searchQ || matchesSearch(s) || matchesSearch(cat))
                            .map((sub) => renderRow(sub, 'pl-8'))}
                        </Fragment>
                      )
                    })}
                  </Fragment>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
