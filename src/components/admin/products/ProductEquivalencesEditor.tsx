import {
  CategoryCascadeSelects,
  categoryCascadeToLeafId,
  type CategoryCascadeValue,
} from '@/components/admin/CategoryCascadeSelects'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { productStatusLabel } from '@/lib/adminLabels'
import { pvcEngineOptions } from '@/lib/pvcVehicleCascade'
import {
  adminListCategories,
  collectCategorySubtreeIds,
} from '@/services/admin/adminCategoryService'
import { adminListManufacturers } from '@/services/admin/adminManufacturerService'
import {
  adminAddProductEquivalences,
  adminListProductEquivalences,
  adminRemoveProductEquivalence,
  type AdminEquivalenceRow,
} from '@/services/admin/adminProductEquivalenceService'
import { adminListProducts } from '@/services/admin/adminProductService'
import { adminListModels, adminListVersions } from '@/services/admin/adminVehicleService'
import type { Category, Manufacturer, Product, VehicleModel, VehicleVersion } from '@/types'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

type Props = {
  productId: string
  /** Categorias pré-carregadas (ficha); se omitido, carrega sozinho. */
  categories?: Category[]
  variant?: 'section' | 'embedded'
  onMutated?: () => void
}

type PendingPick = { id: string; sku: string; name: string }

const emptyCascade = (): CategoryCascadeValue => ({ rootId: '', groupId: '', subId: '' })

function friendlyEquivError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e)
  if (
    /product_equivalences/i.test(msg) &&
    /(schema cache|Could not find the table|PGRST205|does not exist)/i.test(msg)
  ) {
    return 'Tabela product_equivalences ausente no banco — rode a migration 25_product_equivalences e recarregue.'
  }
  return msg
}

/** Vincular vários itens do cadastro como equivalentes (bidirecional A↔B). */
export function ProductEquivalencesEditor({
  productId,
  categories: categoriesProp,
  variant = 'section',
  onMutated,
}: Props) {
  const compact = variant === 'embedded'
  const [rows, setRows] = useState<AdminEquivalenceRow[]>([])
  const [categories, setCategories] = useState<Category[]>(categoriesProp ?? [])
  const [cascade, setCascade] = useState<CategoryCascadeValue>(emptyCascade)
  const [q, setQ] = useState('')
  const [qDebounced, setQDebounced] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [makers, setMakers] = useState<Manufacturer[]>([])
  const [models, setModels] = useState<VehicleModel[]>([])
  const [versions, setVersions] = useState<VehicleVersion[]>([])
  const [makerId, setMakerId] = useState('')
  const [modelId, setModelId] = useState('')
  const [engine, setEngine] = useState('')
  const [pickerId, setPickerId] = useState('')
  const [catalog, setCatalog] = useState<Product[]>([])
  const [loadingCatalog, setLoadingCatalog] = useState(false)
  const [pending, setPending] = useState<PendingPick[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const linkedIds = useMemo(
    () => new Set(rows.map((r) => r.equivalentProductId)),
    [rows],
  )
  const pendingIds = useMemo(() => new Set(pending.map((p) => p.id)), [pending])

  const engineOptions = useMemo(() => pvcEngineOptions(versions), [versions])

  const availableCatalog = useMemo(
    () => catalog.filter((p) => p.id !== productId && !linkedIds.has(p.id)),
    [catalog, productId, linkedIds],
  )

  const leafCategoryId = categoryCascadeToLeafId(cascade)

  async function reload() {
    setRows(await adminListProductEquivalences(productId))
    onMutated?.()
  }

  useEffect(() => {
    if (categoriesProp) {
      setCategories(categoriesProp)
      return
    }
    void adminListCategories()
      .then((cats) => setCategories(cats.filter((c) => c.status === 'published')))
      .catch(() => setCategories([]))
  }, [categoriesProp])

  useEffect(() => {
    void adminListManufacturers()
      .then((list) => setMakers(list.filter((m) => m.status === 'active')))
      .catch(() => setMakers([]))
  }, [])

  useEffect(() => {
    if (!makerId) {
      setModels([])
      setModelId('')
      setEngine('')
      setVersions([])
      return
    }
    void adminListModels(makerId)
      .then((list) => setModels(list.filter((m) => m.status === 'active')))
      .catch(() => setModels([]))
    setModelId('')
    setEngine('')
    setVersions([])
  }, [makerId])

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
    void reload().catch((e) => setError(friendlyEquivError(e)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId])

  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q.trim()), 250)
    return () => clearTimeout(t)
  }, [q])

  const loadCatalog = useCallback(async () => {
    setLoadingCatalog(true)
    try {
      const categoryIds = leafCategoryId
        ? collectCategorySubtreeIds(categories, leafCategoryId)
        : undefined
      const list = await adminListProducts({
        q: qDebounced || undefined,
        broadSearch: true,
        status: filterStatus || undefined,
        statusNeq: !filterStatus ? 'archived' : undefined,
        productKind: 'item',
        categoryIds,
        manufacturerId: makerId || undefined,
        modelId: modelId || undefined,
        engine: engine || undefined,
        limit: 100,
      })
      setCatalog(list)
    } catch (e) {
      setError(friendlyEquivError(e))
      setCatalog([])
    } finally {
      setLoadingCatalog(false)
    }
  }, [qDebounced, leafCategoryId, filterStatus, categories, makerId, modelId, engine])

  useEffect(() => {
    void loadCatalog()
  }, [loadCatalog])

  function addPending(p: { id: string; sku: string; name: string }) {
    if (p.id === productId || linkedIds.has(p.id)) return
    setPending((prev) => {
      if (prev.some((x) => x.id === p.id)) return prev
      return [...prev, p]
    })
  }

  function togglePending(p: Product) {
    setPending((prev) => {
      if (prev.some((x) => x.id === p.id)) return prev.filter((x) => x.id !== p.id)
      return [...prev, { id: p.id, sku: p.sku, name: p.name }]
    })
  }

  function removePending(id: string) {
    setPending((prev) => prev.filter((x) => x.id !== id))
  }

  function onPickerChange(id: string) {
    setPickerId('')
    if (!id) return
    const hit = availableCatalog.find((p) => p.id === id)
    if (!hit) return
    addPending({ id: hit.id, sku: hit.sku, name: hit.name })
  }

  async function linkSelected() {
    if (!pending.length) return
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const { linked, skipped } = await adminAddProductEquivalences(
        productId,
        pending.map((p) => p.id),
      )
      setPending([])
      setQ('')
      setPickerId('')
      await reload()
      await loadCatalog()
      setMessage(
        skipped
          ? `${linked} vinculado(s); ${skipped} já existia(m) ou inválido(s). Aparece no cadastro de todos.`
          : `${linked} equivalência(s) vinculada(s) (A↔B em todos).`,
      )
    } catch (e) {
      setError(friendlyEquivError(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'} data-equivalences-editor={variant}>
      <p className="m-0 text-xs text-hf-muted">
        Filtre por categoria/grupo/subgrupo, aplicação (carro) ou pesquise qualquer termo (peça,
        referência, montadora, modelo, motor). O vínculo é bidirecional A↔B.
      </p>
      {error ? <p className="m-0 text-xs text-hf-danger">{error}</p> : null}
      {message ? <p className="m-0 text-xs font-semibold text-hf-ink">{message}</p> : null}

      <CategoryCascadeSelects
        categories={categories}
        value={cascade}
        onChange={setCascade}
        idPrefix={compact ? 'eq-emb' : 'eq'}
      />

      <div className={compact ? 'grid gap-2' : 'grid gap-3 sm:grid-cols-2 lg:grid-cols-4'}>
        <label className="text-sm">
          <span className="mb-1 block font-semibold">Montadora (aplicação)</span>
          <select
            className="w-full rounded-[10px] border border-hf-line px-3 py-2"
            value={makerId}
            onChange={(e) => setMakerId(e.target.value)}
          >
            <option value="">Todas</option>
            {makers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-semibold">Modelo</span>
          <select
            className="w-full rounded-[10px] border border-hf-line px-3 py-2"
            value={modelId}
            disabled={!makerId}
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
        <label className="text-sm">
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
        <label className="text-sm">
          <span className="mb-1 block font-semibold">Status</span>
          <select
            className="w-full rounded-[10px] border border-hf-line px-3 py-2"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">Ativos (não arquivados)</option>
            <option value="draft">Rascunho</option>
            <option value="published">Publicado</option>
            <option value="archived">Arquivado</option>
          </select>
        </label>
      </div>

      <div className={compact ? 'grid gap-2' : 'grid gap-3 sm:grid-cols-2'}>
        <Input
          label="Pesquisar (peça, aplicação, carro)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="SKU, nome, ref, Gol, 1.0, flex…"
        />
        <label className="text-sm">
          <span className="mb-1 block font-semibold">Seletor de item</span>
          <select
            className="w-full rounded-[10px] border border-hf-line px-3 py-2"
            value={pickerId}
            onChange={(e) => onPickerChange(e.target.value)}
            disabled={loadingCatalog || availableCatalog.length === 0}
          >
            <option value="">
              {loadingCatalog
                ? 'Carregando…'
                : availableCatalog.length
                  ? `Escolher (${availableCatalog.length})…`
                  : 'Nenhum item no filtro'}
            </option>
            {availableCatalog.map((p) => (
              <option key={p.id} value={p.id} disabled={pendingIds.has(p.id)}>
                {p.sku} · {p.name}
                {pendingIds.has(p.id) ? ' (já na seleção)' : ''}
              </option>
            ))}
          </select>
        </label>
      </div>

      {availableCatalog.length > 0 ? (
        <div className="rounded-[10px] border border-hf-line bg-hf-bg/40 p-2">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-hf-muted">
              Lista filtrada — marque vários
            </p>
            <button
              type="button"
              className="text-[11px] font-semibold text-hf-auth-link"
              onClick={() => {
                setPending((prev) => {
                  const map = new Map(prev.map((x) => [x.id, x]))
                  for (const h of availableCatalog) {
                    if (!map.has(h.id)) map.set(h.id, { id: h.id, sku: h.sku, name: h.name })
                  }
                  return [...map.values()]
                })
              }}
            >
              Marcar todos da lista
            </button>
          </div>
          <ul className="m-0 max-h-40 list-none space-y-1 overflow-y-auto p-0 text-xs">
            {availableCatalog.map((hit) => {
              const checked = pendingIds.has(hit.id)
              return (
                <li key={hit.id} className="flex items-center gap-2 border-b border-hf-line py-1">
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => togglePending(hit)}
                    />
                    <span className="truncate">
                      <strong>{hit.sku}</strong> · {hit.name}
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        </div>
      ) : loadingCatalog ? (
        <p className="m-0 text-xs text-hf-muted">Carregando itens…</p>
      ) : (
        <p className="m-0 text-xs text-hf-muted">
          Nenhum item com estes filtros (ou já estão vinculados).
        </p>
      )}

      {pending.length > 0 ? (
        <div className="space-y-2 rounded-[10px] border border-hf-red/30 bg-hf-red/5 p-2">
          <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-hf-ink">
            Selecionados ({pending.length})
          </p>
          <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0 text-xs">
            {pending.map((p) => (
              <li
                key={p.id}
                className="inline-flex items-center gap-1 rounded-full border border-hf-line bg-hf-surface px-2 py-0.5"
              >
                <span className="font-mono font-semibold">{p.sku}</span>
                <button
                  type="button"
                  className="font-bold text-hf-danger"
                  aria-label={`Remover ${p.sku}`}
                  onClick={() => removePending(p.id)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={busy} onClick={() => void linkSelected()}>
              {busy ? 'Vinculando…' : `Vincular ${pending.length} selecionado(s)`}
            </Button>
            <Button type="button" variant="light" disabled={busy} onClick={() => setPending([])}>
              Limpar seleção
            </Button>
          </div>
        </div>
      ) : null}

      <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-hf-muted">
        Equivalências deste produto ({rows.length})
      </p>
      <ul
        className={[
          'm-0 list-none space-y-1 p-0 text-xs',
          compact ? 'max-h-48 overflow-y-auto' : '',
        ].join(' ')}
      >
        {rows.length === 0 ? (
          <li className="text-hf-muted">Nenhuma equivalência.</li>
        ) : (
          rows.map((r) => (
            <li
              key={r.equivalentProductId}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-hf-line py-1"
            >
              <span>
                <strong>{r.sku}</strong> · {r.name} · {productStatusLabel(r.status)}
              </span>
              <span className="flex gap-2">
                <Link
                  className="font-semibold text-hf-auth-link"
                  to={`/admin/produtos/${r.equivalentProductId}`}
                >
                  Cadastro
                </Link>
                <button
                  type="button"
                  className="font-semibold text-hf-danger"
                  disabled={busy}
                  onClick={() => {
                    if (!window.confirm(`Remover equivalência com ${r.sku}? (remove dos dois lados)`))
                      return
                    setBusy(true)
                    void adminRemoveProductEquivalence(productId, r.equivalentProductId)
                      .then(async () => {
                        await reload()
                        await loadCatalog()
                        setMessage('Equivalência removida dos dois cadastros.')
                      })
                      .catch((e) => setError(friendlyEquivError(e)))
                      .finally(() => setBusy(false))
                  }}
                >
                  Remover
                </button>
              </span>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}
