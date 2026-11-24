import {
  CategoryCascadeSelects,
  categoryCascadeToLeafId,
  type CategoryCascadeValue,
} from '@/components/admin/CategoryCascadeSelects'
import { AdaptiveWorkspace } from '@/components/admin/workspace/AdaptiveWorkspace'
import { GuideStackPanels } from '@/components/admin/workspace/GuideStackPanels'
import { ProductWorkSurface } from '@/components/admin/products/ProductWorkSurface'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { useIdSplitTabs } from '@/hooks/useIdSplitTabs'
import { productStatusLabel } from '@/lib/adminLabels'
import { pvcEngineOptions } from '@/lib/pvcVehicleCascade'
import { CODIGO_REFERENCIA_LABEL } from '@/lib/productLabels'
import {
  adminListCategories,
  categoryPath,
  collectCategorySubtreeIds,
} from '@/services/admin/adminCategoryService'
import { adminListManufacturers } from '@/services/admin/adminManufacturerService'
import {
  DEFAULT_PRODUCT_LIST_LIFECYCLE,
  patchLifecycle,
  productLifecycleChipLabel,
  resolveProductStatusQuery,
  type ProductListLifecycle,
} from '@/services/admin/adminProductLifecycle'
import { adminMapEquivalenceSkus } from '@/services/admin/adminProductEquivalenceService'
import {
  ADMIN_PRODUCTS_PAGE_SIZE,
  adminListProductsPage,
  adminReleaseProductToStore,
  adminReleaseProductsToStore,
  adminSetProductStatus,
} from '@/services/admin/adminProductService'
import { adminListModels, adminListVersions } from '@/services/admin/adminVehicleService'
import type { Category, Manufacturer, Product, VehicleModel, VehicleVersion } from '@/types'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

const emptyCascade = (): CategoryCascadeValue => ({ rootId: '', groupId: '', subId: '' })

const FILTERS_EXPANDED_KEY = 'hf.products.filtersExpanded'

function readFiltersExpanded(): boolean {
  try {
    return sessionStorage.getItem(FILTERS_EXPANDED_KEY) === '1'
  } catch {
    return false
  }
}

export function AdminProductsPage() {
  const splitTabs = useIdSplitTabs()
  const [items, setItems] = useState<Product[]>([])
  const [equivSkus, setEquivSkus] = useState<Map<string, string[]>>(() => new Map())
  const [categories, setCategories] = useState<Category[]>([])
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([])
  const [q, setQ] = useState('')
  const [qDebounced, setQDebounced] = useState('')
  const [fineStatus, setFineStatus] = useState('')
  const [lifecycle, setLifecycle] = useState<ProductListLifecycle>(DEFAULT_PRODUCT_LIST_LIFECYCLE)
  const [manufacturerId, setManufacturerId] = useState('')
  const [modelId, setModelId] = useState('')
  const [engine, setEngine] = useState('')
  const [models, setModels] = useState<VehicleModel[]>([])
  const [versions, setVersions] = useState<VehicleVersion[]>([])
  const [cascade, setCascade] = useState<CategoryCascadeValue>(emptyCascade)
  const [withoutImage, setWithoutImage] = useState(false)
  const [filtersExpanded, setFiltersExpanded] = useState(readFiltersExpanded)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [busyBulk, setBusyBulk] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const leafCategoryId = categoryCascadeToLeafId(cascade)
  const engineOptions = useMemo(() => pvcEngineOptions(versions), [versions])

  const filterChips = useMemo(() => {
    const chips: string[] = []
    const life = productLifecycleChipLabel(lifecycle)
    if (life) chips.push(life)
    if (fineStatus) chips.push(productStatusLabel(fineStatus))
    if (manufacturerId) {
      const m = manufacturers.find((x) => x.id === manufacturerId)
      if (m) chips.push(m.name)
    }
    if (modelId) {
      const mod = models.find((x) => x.id === modelId)
      if (mod) chips.push(mod.name)
    }
    if (engine) chips.push(engine)
    if (leafCategoryId) chips.push(categoryPath(categories, leafCategoryId))
    if (withoutImage) chips.push('Sem imagem')
    return chips
  }, [
    lifecycle,
    fineStatus,
    manufacturerId,
    modelId,
    engine,
    leafCategoryId,
    withoutImage,
    manufacturers,
    models,
    categories,
  ])

  const setFiltersExpandedPersist = useCallback((open: boolean) => {
    setFiltersExpanded(open)
    try {
      sessionStorage.setItem(FILTERS_EXPANDED_KEY, open ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [])

  const buildListParams = useCallback(
    (offset: number) => {
      const statusQ = resolveProductStatusQuery({
        lifecycle,
        status: lifecycle.showActive && fineStatus ? fineStatus : null,
      })
      if (statusQ.kind === 'empty') return null
      const categoryIds = leafCategoryId
        ? collectCategorySubtreeIds(categories, leafCategoryId)
        : undefined
      return {
        q: qDebounced.trim() || undefined,
        broadSearch: true,
        status: statusQ.kind === 'eq' ? statusQ.status : undefined,
        statusNeq: statusQ.kind === 'neq' ? statusQ.status : undefined,
        withoutImage: withoutImage || undefined,
        productKind: 'item' as const,
        categoryIds,
        manufacturerId: manufacturerId || undefined,
        modelId: modelId || undefined,
        engine: engine || undefined,
        limit: ADMIN_PRODUCTS_PAGE_SIZE,
        offset,
      }
    },
    [
      lifecycle,
      fineStatus,
      leafCategoryId,
      categories,
      qDebounced,
      withoutImage,
      manufacturerId,
      modelId,
      engine,
    ],
  )

  const reload = useCallback(
    async (opts?: { keepSelection?: boolean }) => {
      const params = buildListParams(0)
      if (!params) {
        setItems([])
        setHasMore(false)
        setLoading(false)
        return
      }
      setLoading(true)
      setError(null)
      if (!opts?.keepSelection) setSelected(new Set())
      try {
        const { items: rows, hasMore: more } = await adminListProductsPage(params)
        setItems(rows)
        setHasMore(more)
        void adminMapEquivalenceSkus(rows.map((r) => r.id))
          .then(setEquivSkus)
          .catch(() => setEquivSkus(new Map()))
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao listar produtos')
      } finally {
        setLoading(false)
      }
    },
    [buildListParams],
  )

  useEffect(() => {
    void (async () => {
      try {
        const [cats, makers] = await Promise.all([
          adminListCategories(),
          adminListManufacturers(),
        ])
        setCategories(cats)
        setManufacturers(makers.filter((m) => m.status === 'active'))
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao carregar filtros')
      }
    })()
  }, [])

  useEffect(() => {
    if (!manufacturerId) {
      setModels([])
      setModelId('')
      setEngine('')
      setVersions([])
      return
    }
    void adminListModels(manufacturerId)
      .then((list) => setModels(list.filter((m) => m.status === 'active')))
      .catch(() => setModels([]))
    setModelId('')
    setEngine('')
    setVersions([])
  }, [manufacturerId])

  useEffect(() => {
    if (!modelId) {
      setVersions([])
      setEngine('')
      return
    }
    void adminListVersions(modelId)
      .then(setVersions)
      .catch(() => setVersions([]))
    setEngine('')
  }, [modelId])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setQDebounced(q), 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [q])

  useEffect(() => {
    void reload({ keepSelection: true })
  }, [reload])

  async function loadMore() {
    const params = buildListParams(items.length)
    if (!params) return
    setLoadingMore(true)
    try {
      const { items: rows, hasMore: more } = await adminListProductsPage(params)
      setItems((prev) => [...prev, ...rows])
      setHasMore(more)
      void adminMapEquivalenceSkus(rows.map((r) => r.id))
        .then((next) => {
          setEquivSkus((prev) => {
            const merged = new Map(prev)
            for (const [k, v] of next) merged.set(k, v)
            return merged
          })
        })
        .catch(() => undefined)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar mais')
    } finally {
      setLoadingMore(false)
    }
  }

  const patchItem = useCallback((p: Product) => {
    setItems((prev) => prev.map((row) => (row.id === p.id ? { ...row, ...p } : row)))
  }, [])

  function openGuide(id: string) {
    setHighlightId(id)
    splitTabs.openTab(id)
  }

  function guideLabel(id: string) {
    if (splitTabs.openIds.includes(id)) {
      if (splitTabs.openIds.length > 1 && splitTabs.activeId !== id) return '+ Guia'
      return 'Na guia'
    }
    return 'Abrir guia'
  }

  const allPageSelected = items.length > 0 && items.every((p) => selected.has(p.id))

  function toggleSelectAllPage() {
    if (allPageSelected) {
      setSelected(new Set())
      return
    }
    setSelected(new Set(items.map((p) => p.id)))
  }

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function toggleArchive(p: Product) {
    const next = p.status === 'archived' ? 'published' : 'archived'
    if (next === 'archived') {
      const ok = window.confirm(
        `Remover "${p.name}" do catálogo público?\n\nO produto será arquivado.`,
      )
      if (!ok) return
    }
    setMessage(null)
    setError(null)
    try {
      await adminSetProductStatus(p.id, next)
      if (next === 'archived' && !lifecycle.showInactive) {
        setItems((prev) => prev.filter((x) => x.id !== p.id))
        splitTabs.closeTab(p.id)
      } else {
        patchItem({ ...p, status: next })
      }
      setMessage(next === 'archived' ? 'Produto arquivado.' : 'Produto publicado novamente.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao alterar status')
    }
  }

  async function liberarOne(p: Product) {
    setBusyBulk(true)
    setError(null)
    try {
      const r = await adminReleaseProductToStore({ productId: p.id, publishIfNeeded: true })
      if (!r.ok) {
        setError(r.reason)
        return
      }
      const next = { ...p, status: 'published' as const, available: true }
      patchItem(next)
      setMessage('Liberado na loja.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao liberar')
    } finally {
      setBusyBulk(false)
    }
  }

  async function bulkSetStatus(next: 'published' | 'archived') {
    const ids = [...selected]
    if (ids.length === 0) return
    if (next === 'archived') {
      const ok = window.confirm(`Arquivar ${ids.length} produto(s)?`)
      if (!ok) return
    }
    setBusyBulk(true)
    setError(null)
    try {
      await Promise.all(ids.map((id) => adminSetProductStatus(id, next)))
      if (next === 'archived' && !lifecycle.showInactive) {
        setItems((prev) => prev.filter((p) => !selected.has(p.id)))
        for (const id of ids) splitTabs.closeTab(id)
      } else {
        setItems((prev) =>
          prev.map((p) => (selected.has(p.id) ? { ...p, status: next } : p)),
        )
      }
      setSelected(new Set())
      setMessage(`${ids.length} produto(s) atualizados.`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha em lote')
    } finally {
      setBusyBulk(false)
    }
  }

  async function bulkLiberar() {
    const ids = [...selected]
    if (!ids.length) return
    setBusyBulk(true)
    setError(null)
    try {
      const { released, failed } = await adminReleaseProductsToStore({
        productIds: ids,
        publishIfNeeded: true,
      })
      setItems((prev) =>
        prev.map((p) =>
          selected.has(p.id) ? { ...p, status: 'published', available: true } : p,
        ),
      )
      setSelected(new Set())
      setMessage(
        failed.length
          ? `${released} liberado(s); ${failed.length} falha(s).`
          : `${released} liberado(s) na loja.`,
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao liberar')
    } finally {
      setBusyBulk(false)
    }
  }

  const contextualTitle =
    splitTabs.openIds.length > 1
      ? `${splitTabs.openIds.length} guias`
      : items.find((p) => p.id === splitTabs.activeId)?.name ??
        items.find((p) => p.id === splitTabs.openIds[0])?.name ??
        'Guia'

  const maisFiltrosLabel = filtersExpanded
    ? 'Recolher filtros'
    : filterChips.length
      ? `Filtros (${filterChips.length})`
      : 'Mais filtros'

  const primary = (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="m-0 text-2xl font-extrabold text-hf-ink">Produtos</h1>
          <p className="mt-1 text-sm text-hf-muted">
            Lista + guia (duplo clique). Cadastro completo também em Abrir cadastro. Marcas em{' '}
            <Link className="font-semibold text-hf-auth-link" to="/admin/produtos/marcas">
              Marcas
            </Link>
            .
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/produtos/marcas">
            <Button variant="light">Marcas (peça)</Button>
          </Link>
          <Link to="/admin/kits">
            <Button variant="light">Kits</Button>
          </Link>
          <Link to="/admin/produtos/importacoes">
            <Button variant="light">Importações</Button>
          </Link>
          <Link to="/admin/produtos/novo">
            <Button variant="primary">Novo produto</Button>
          </Link>
        </div>
      </div>

      <form
        className="admin-products-filters space-y-3 rounded-[14px] border border-hf-line bg-hf-surface p-3"
        data-filters-expanded={filtersExpanded ? 'true' : 'false'}
        onSubmit={(e) => {
          e.preventDefault()
          void reload()
        }}
      >
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <Input
              label="Pesquisar (peça, aplicação, carro)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="SKU, nome, ref, Gol, 1.0, flex…"
            />
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={lifecycle.showActive}
              onChange={(e) =>
                setLifecycle((prev) => patchLifecycle(prev, { showActive: e.target.checked }))
              }
            />
            Ativos
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={lifecycle.showInactive}
              onChange={(e) =>
                setLifecycle((prev) => patchLifecycle(prev, { showInactive: e.target.checked }))
              }
            />
            Inativos
          </label>
          <Button type="submit" variant="light">
            Buscar
          </Button>
          <Button
            type="button"
            variant="light"
            onClick={() => {
              setQ('')
              setQDebounced('')
              setFineStatus('')
              setLifecycle(DEFAULT_PRODUCT_LIST_LIFECYCLE)
              setManufacturerId('')
              setModelId('')
              setEngine('')
              setModels([])
              setVersions([])
              setCascade(emptyCascade())
              setWithoutImage(false)
            }}
          >
            Limpar
          </Button>
          <Button type="button" variant="light" onClick={() => setFiltersExpandedPersist(!filtersExpanded)}>
            {maisFiltrosLabel}
          </Button>
        </div>

        {!filtersExpanded && filterChips.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {filterChips.map((c) => (
              <span
                key={c}
                className="rounded-full border border-hf-line bg-hf-bg px-2 py-0.5 font-semibold text-hf-ink"
              >
                {c}
              </span>
            ))}
            <button
              type="button"
              className="font-semibold text-hf-auth-link"
              onClick={() => setFiltersExpandedPersist(true)}
            >
              Editar
            </button>
          </div>
        ) : null}

        {filtersExpanded ? (
          <div className="space-y-3 border-t border-hf-line pt-3">
            <CategoryCascadeSelects
              categories={categories}
              value={cascade}
              onChange={setCascade}
              idPrefix="list-cat"
            />
            <div className="grid gap-3 md:grid-cols-4">
              <label className="block text-sm">
                <span className="mb-1 block font-semibold">Situação (ativos)</span>
                <select
                  className="w-full rounded-[10px] border border-hf-line px-3 py-2"
                  value={fineStatus}
                  disabled={!lifecycle.showActive}
                  onChange={(e) => setFineStatus(e.target.value)}
                >
                  <option value="">Todos ativos</option>
                  <option value="draft">Rascunho</option>
                  <option value="published">Publicado</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-semibold">Montadora (aplicação)</span>
                <select
                  className="w-full rounded-[10px] border border-hf-line px-3 py-2"
                  value={manufacturerId}
                  onChange={(e) => setManufacturerId(e.target.value)}
                >
                  <option value="">Todas</option>
                  {manufacturers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-semibold">Modelo</span>
                <select
                  className="w-full rounded-[10px] border border-hf-line px-3 py-2"
                  value={modelId}
                  disabled={!manufacturerId}
                  onChange={(e) => setModelId(e.target.value)}
                >
                  <option value="">Todos</option>
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-semibold">Motor</span>
                <select
                  className="w-full rounded-[10px] border border-hf-line px-3 py-2"
                  value={engine}
                  disabled={!modelId}
                  onChange={(e) => setEngine(e.target.value)}
                >
                  <option value="">Todas</option>
                  {engineOptions.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={withoutImage}
                onChange={(e) => setWithoutImage(e.target.checked)}
              />
              Sem imagem / incompletos
            </label>
          </div>
        ) : null}
      </form>

      {selected.size > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-[12px] border border-hf-line bg-hf-bg px-3 py-2 text-sm">
          <span className="font-semibold">{selected.size} selecionado(s)</span>
          <Button type="button" variant="light" disabled={busyBulk} onClick={() => void bulkLiberar()}>
            Liberar na loja
          </Button>
          <Button
            type="button"
            variant="light"
            disabled={busyBulk}
            onClick={() => void bulkSetStatus('published')}
          >
            Publicar
          </Button>
          <Button
            type="button"
            variant="light"
            disabled={busyBulk}
            onClick={() => void bulkSetStatus('archived')}
          >
            Arquivar
          </Button>
        </div>
      ) : null}

      {error ? <p className="text-sm text-hf-danger">{error}</p> : null}
      {message ? <p className="text-sm font-semibold text-hf-ink">{message}</p> : null}

      <div className="overflow-hidden rounded-[14px] border border-hf-line bg-hf-surface">
        <div className="max-h-[min(60dvh,640px)] overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-hf-bg text-hf-muted shadow-sm">
              <tr>
                <th className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={toggleSelectAllPage}
                    aria-label="Selecionar página"
                  />
                </th>
                <th className="px-3 py-2">{CODIGO_REFERENCIA_LABEL}</th>
                <th className="px-3 py-2">Nome</th>
                <th className="px-3 py-2">Equivalências</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Disp.</th>
                <th className="px-3 py-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-hf-muted">
                    Carregando…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-hf-muted">
                    Nenhum produto. Ajuste filtros ou{' '}
                    <Link className="font-semibold text-hf-auth-link" to="/admin/produtos/novo">
                      cadastre um novo
                    </Link>
                    .
                  </td>
                </tr>
              ) : (
                items.map((p) => (
                  <tr
                    key={p.id}
                    className={[
                      'border-t border-hf-line cursor-pointer',
                      highlightId === p.id || splitTabs.openIds.includes(p.id)
                        ? 'bg-hf-red/5'
                        : 'hover:bg-hf-bg/60',
                    ].join(' ')}
                    onClick={() => setHighlightId(p.id)}
                    onDoubleClick={() => openGuide(p.id)}
                  >
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(p.id)}
                        onChange={() => toggleRow(p.id)}
                        aria-label={`Selecionar ${p.sku}`}
                      />
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{p.sku}</td>
                    <td className="px-3 py-2 font-semibold text-hf-ink">{p.name}</td>
                    <td className="px-3 py-2 text-xs text-hf-muted">
                      {(equivSkus.get(p.id) ?? []).length
                        ? (equivSkus.get(p.id) ?? []).join(', ')
                        : '—'}
                    </td>
                    <td className="px-3 py-2">{productStatusLabel(p.status)}</td>
                    <td className="px-3 py-2">{p.available ? 'Sim' : 'Não'}</td>
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="font-semibold text-hf-auth-link"
                          onClick={() => openGuide(p.id)}
                        >
                          {guideLabel(p.id)}
                        </button>
                        <Link
                          className="font-semibold text-hf-ink underline"
                          to={`/admin/produtos/${p.id}`}
                        >
                          Abrir cadastro
                        </Link>
                        <button
                          type="button"
                          className="font-semibold text-hf-danger"
                          onClick={() => void toggleArchive(p)}
                        >
                          {p.status === 'archived' ? 'Desarquivar' : 'Arquivar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {hasMore ? (
          <div className="border-t border-hf-line p-2 text-center">
            <Button type="button" variant="light" disabled={loadingMore} onClick={() => void loadMore()}>
              {loadingMore ? 'Carregando…' : 'Carregar mais'}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )

  const contextual = splitTabs.hasOpen ? (
    <GuideStackPanels
      ids={splitTabs.openIds}
      meta={splitTabs.openIds.map((id) => {
        const p = items.find((x) => x.id === id)
        return {
          id,
          label: p?.name ?? id.slice(0, 8),
          statusLabel: p ? productStatusLabel(p.status) : undefined,
        }
      })}
      onCloseTab={splitTabs.closeTab}
      render={(id) => {
        const fromList = items.find((p) => p.id === id)
        const focused = fromList ?? ({ id } as Product)
        return (
          <ProductWorkSurface
            focused={focused}
            categories={categories}
            busy={busyBulk}
            onClose={() => splitTabs.closeTab(id)}
            onProductUpdated={patchItem}
            onLiberar={(p) => void liberarOne(p)}
            onArchiveToggle={(p) => void toggleArchive(p)}
          />
        )
      }}
    />
  ) : null

  return (
    <AdaptiveWorkspace
      moduleKey="products"
      primary={primary}
      contextual={contextual}
      contextualOpen={splitTabs.hasOpen}
      onContextualOpenChange={(open) => {
        if (!open) splitTabs.closeAll()
      }}
      contextualTitle={contextualTitle}
    />
  )
}
