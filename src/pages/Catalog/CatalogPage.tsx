import { Button } from '@/components/common/Button'
import { Container } from '@/components/layout/Container'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { Select } from '@/components/common/Select'
import { WhatsAppButton } from '@/components/common/WhatsAppButton'
import { AISearchAssistant } from '@/components/navigation/AISearchAssistant'
import { ProductCard } from '@/components/product/ProductCard'
import { SavedVehiclesQuickPick } from '@/components/vehicle/SavedVehiclesQuickPick'
import { features } from '@/config/features'
import { useProductCompatVerdicts } from '@/hooks/useProductCompatVerdicts'
import { buildNotFoundWhatsAppMessage } from '@/lib/whatsapp'
import type { AISearchInterpretation } from '@/services/ai/types'
import { assistIfNeeded } from '@/services/search/searchOrchestrator'
import { listActiveBrands } from '@/services/brands/brandService'
import { listCategories } from '@/services/categories/categoryService'
import { mapEquivalentSkus } from '@/services/products/equivalenceLinksService'
import {
  applyIntentToSearchParams,
  buildCatalogSearchParams,
} from '@/services/search/buildCatalogSearchParams'
import {
  hintFromSearchIntent,
  interpretSearchQuery,
  type SearchIntent,
} from '@/services/search/interpretSearchQuery'
import {
  resolveSearchEmptyOutcome,
  searchEmptyCopy,
} from '@/services/search/resolveSearchEmptyOutcome'
import { searchCatalog } from '@/services/search/searchService'
import {
  getVehicleOptions,
  listVehicleCatalogEntries,
  vehicleModelVersionKey,
} from '@/services/vehicles/vehicleService'
import type {
  Category,
  Product,
  ProductBrand,
  ProductSearchParams,
  ProductSearchSort,
  VehicleFilter,
  VehicleOptionTree,
} from '@/types'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

function effectiveToPatch(p: ProductSearchParams): Record<string, string | null> {
  return {
    q: p.q?.trim() || null,
    maker: p.maker?.trim() || null,
    model: p.model?.trim() || null,
    year: p.year?.trim() || null,
    engine: p.engine?.trim() || null,
    version: p.version?.trim() || null,
  }
}

function sameVehicleAndQ(
  a: ProductSearchParams,
  b: { q: string; maker: string; model: string; year: string; engine: string; version: string },
): boolean {
  return (
    (a.q?.trim() || '') === b.q.trim() &&
    (a.maker?.trim() || '') === b.maker.trim() &&
    (a.model?.trim() || '') === b.model.trim() &&
    (a.year?.trim() || '') === b.year.trim() &&
    (a.engine?.trim() || '') === b.engine.trim() &&
    (a.version?.trim() || '') === b.version.trim()
  )
}

const PAGE_SIZE = 24

const SORT_OPTIONS: Array<{ value: ProductSearchSort; label: string }> = [
  { value: 'relevance', label: 'Relevância' },
  { value: 'name_asc', label: 'Nome A–Z' },
  { value: 'name_desc', label: 'Nome Z–A' },
  { value: 'sku_asc', label: 'Código A–Z' },
  { value: 'sku_desc', label: 'Código Z–A' },
  ...(features.price_enabled
    ? ([
        { value: 'price_asc', label: 'Menor preço' },
        { value: 'price_desc', label: 'Maior preço' },
      ] as const)
    : []),
]

function parseSort(value: string | null): ProductSearchSort {
  const allowed = SORT_OPTIONS.map((o) => o.value)
  if (value && (allowed as string[]).includes(value)) return value as ProductSearchSort
  return 'relevance'
}

function parsePage(value: string | null): number {
  const n = Number(value)
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1
}

export function CatalogPage() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const cat = params.get('cat') ?? ''
  const maker = params.get('maker') ?? ''
  const model = params.get('model') ?? ''
  const year = params.get('year') ?? ''
  const engine = params.get('engine') ?? ''
  const version = params.get('version') ?? ''
  const brand = params.get('brand') ?? ''
  const sort = parseSort(params.get('sort'))
  const urlPage = parsePage(params.get('page'))

  const [searchDraft, setSearchDraft] = useState(q)
  const [products, setProducts] = useState<Product[]>([])
  const [equivSkus, setEquivSkus] = useState<Map<string, string[]>>(() => new Map())
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loadedPage, setLoadedPage] = useState(1)
  const [rootCategories, setRootCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<ProductBrand[]>([])
  const [vehicleTree, setVehicleTree] = useState<VehicleOptionTree | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [searchHint, setSearchHint] = useState<string | null>(null)
  const [lastIntent, setLastIntent] = useState<SearchIntent | null>(null)
  const [softApplied, setSoftApplied] = useState(false)
  const [assistUi, setAssistUi] = useState<{
    originalQuery: string
    suggestionLabel: string
    interpretation: AISearchInterpretation
  } | null>(null)
  /** Evita reprocessar o mesmo `q` bruto já aplicado (anti-loop URL). */
  const lastInterpretedRawRef = useRef<string | null>(null)
  const lastAssistRawRef = useRef<string | null>(null)
  const interpretGen = useRef(0)
  const assistGen = useRef(0)

  useEffect(() => {
    if (!products.length) {
      setEquivSkus(new Map())
      return
    }
    let active = true
    void mapEquivalentSkus(products.map((p) => p.id))
      .then((m) => {
        if (active) setEquivSkus(m)
      })
      .catch(() => {
        if (active) setEquivSkus(new Map())
      })
    return () => {
      active = false
    }
  }, [products])
  const requestId = useRef(0)

  const vehicleFilter: VehicleFilter | null = useMemo(() => {
    if (!maker && !model && !year && !engine && !version) return null
    return {
      maker: maker || undefined,
      model: model || undefined,
      year: year || undefined,
      engine: engine || undefined,
      version: version || undefined,
    }
  }, [maker, model, year, engine, version])

  const productIds = useMemo(() => products.map((p) => p.id), [products])
  const { verdicts } = useProductCompatVerdicts(productIds, vehicleFilter)

  useEffect(() => {
    setSearchDraft(q)
  }, [q])

  useEffect(() => {
    void (async () => {
      try {
        const [cats, vehicles, brandList] = await Promise.all([
          listCategories(),
          getVehicleOptions(),
          listActiveBrands(),
        ])
        setRootCategories(cats)
        setVehicleTree(vehicles)
        setBrands(brandList)
      } catch {
        /* filtros ficam vazios; listagem ainda tenta carregar */
      }
    })()
  }, [])

  const searchArgs = useMemo(
    () => ({
      q,
      category: cat,
      brand,
      maker,
      model,
      year,
      engine,
      version,
      sort,
    }),
    [q, cat, brand, maker, model, year, engine, version, sort],
  )

  useEffect(() => {
    const id = ++requestId.current
    const targetPage = urlPage
    void (async () => {
      setLoading(true)
      setError(null)
      setSoftApplied(false)
      try {
        let first = await searchCatalog({
          ...searchArgs,
          page: 1,
          pageSize: PAGE_SIZE,
        })
        if (id !== requestId.current) return

        const hasVehicle = Boolean(
          searchArgs.maker ||
            searchArgs.model ||
            searchArgs.year ||
            searchArgs.engine ||
            searchArgs.version,
        )
        const hasQ = Boolean((searchArgs.q ?? '').trim())

        // Inteligência: se peça/código + veículo zera, relaxa filtros (versão → só texto)
        // para não esconder peça existente. Chips de veículo permanecem na URL.
        if (first.total === 0 && hasVehicle && hasQ) {
          if (searchArgs.version) {
            const noVersion = await searchCatalog({
              ...searchArgs,
              version: null,
              page: 1,
              pageSize: PAGE_SIZE,
            })
            if (id !== requestId.current) return
            if (noVersion.total > 0) {
              first = noVersion
              setSoftApplied(true)
              setSearchHint(
                'Sem aplicação nesta versão. Mostrando peças compatíveis com o modelo.',
              )
            }
          }
          if (first.total === 0) {
            const soft = await searchCatalog({
              ...searchArgs,
              maker: null,
              model: null,
              year: null,
              engine: null,
              version: null,
              page: 1,
              pageSize: PAGE_SIZE,
            })
            if (id !== requestId.current) return
            if (soft.total > 0) {
              first = soft
              setSoftApplied(true)
              setSearchHint(
                'Nenhuma aplicação cadastrada para este veículo com essa peça/código. Mostrando resultados da busca.',
              )
            }
          }
        }

        if (targetPage <= 1) {
          setProducts(first.items)
          setTotal(first.total)
          setHasMore(first.hasMore)
          setLoadedPage(1)
          return
        }

        const rest = await Promise.all(
          Array.from({ length: targetPage - 1 }, (_, i) =>
            searchCatalog({
              ...searchArgs,
              page: i + 2,
              pageSize: PAGE_SIZE,
            }),
          ),
        )
        if (id !== requestId.current) return
        const last = rest[rest.length - 1] ?? first
        setProducts([...first.items, ...rest.flatMap((p) => p.items)])
        setTotal(first.total)
        setHasMore(last.hasMore)
        setLoadedPage(targetPage)
      } catch (e) {
        if (id === requestId.current)
          setError(e instanceof Error ? e.message : 'Erro ao carregar o catálogo')
      } finally {
        if (id === requestId.current) setLoading(false)
      }
    })()
    // urlPage lido no momento em que searchArgs muda (filtros resetam page; deep-link na 1ª carga).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadMore não deve refetch
  }, [searchArgs])

  const modelOptions = useMemo(() => {
    if (!vehicleTree) return []
    const list = maker
      ? (vehicleTree.modelsByMaker[maker] ?? [])
      : [...new Set(Object.values(vehicleTree.modelsByMaker).flat())].sort((a, b) =>
          a.localeCompare(b, 'pt-BR'),
        )
    return list.map((m) => ({ value: m, label: m }))
  }, [vehicleTree, maker])

  const versionOptions = useMemo(() => {
    if (!vehicleTree) return []
    const list = model
      ? (vehicleTree.versionsByModel[model] ?? [])
      : [...new Set(Object.values(vehicleTree.versionsByModel).flat())].sort((a, b) =>
          a.localeCompare(b, 'pt-BR'),
        )
    return list.map((v) => ({ value: v, label: v }))
  }, [vehicleTree, model])

  const engineOptions = useMemo(() => {
    if (!vehicleTree) return []
    if (model && version) {
      const byVersion =
        vehicleTree.enginesByModelVersion[vehicleModelVersionKey(model, version)] ?? []
      if (byVersion.length) return byVersion.map((e) => ({ value: e, label: e }))
    }
    if (model) {
      return (vehicleTree.enginesByModel[model] ?? []).map((e) => ({ value: e, label: e }))
    }
    return [...new Set(Object.values(vehicleTree.enginesByModel).flat())]
      .sort((a, b) => a.localeCompare(b, 'pt-BR'))
      .map((e) => ({ value: e, label: e }))
  }, [vehicleTree, model, version])

  const yearOptions = useMemo(() => {
    if (!vehicleTree) return []
    if (model && version) {
      const byVersion =
        vehicleTree.yearsByModelVersion[vehicleModelVersionKey(model, version)] ?? []
      if (byVersion.length) return byVersion.map((y) => ({ value: y, label: y }))
    }
    if (model) {
      return (vehicleTree.yearsByModel[model] ?? []).map((y) => ({ value: y, label: y }))
    }
    return [...new Set(Object.values(vehicleTree.yearsByModel).flat())]
      .sort((a, b) => a.localeCompare(b, 'pt-BR'))
      .map((y) => ({ value: y, label: y }))
  }, [vehicleTree, model, version])

  const brandOptions = useMemo(
    () => brands.map((b) => ({ value: b.name, label: b.name })),
    [brands],
  )

  function patchParams(next: Record<string, string | null>, resetPage = true) {
    const draft = new URLSearchParams(params)
    for (const [key, value] of Object.entries(next)) {
      if (!value) draft.delete(key)
      else draft.set(key, value)
    }
    if (resetPage && !('page' in next)) {
      draft.delete('page')
    }
    setParams(draft, { replace: true })
  }

  async function applyInterpretedQuery(rawInput: string) {
    const raw = rawInput.trim()
    if (!raw) {
      lastInterpretedRawRef.current = null
      lastAssistRawRef.current = null
      setSearchHint(null)
      setLastIntent(null)
      setAssistUi(null)
      patchParams({ q: null })
      return
    }

    const gen = ++interpretGen.current
    setAssistUi(null)
    lastAssistRawRef.current = null
    const catalog = await listVehicleCatalogEntries()
    if (gen !== interpretGen.current) return

    const intent = interpretSearchQuery(raw, catalog)
    setLastIntent(intent)
    const { catalogParams } = buildCatalogSearchParams(intent)
    const current: ProductSearchParams = {
      q,
      maker,
      model,
      year,
      engine,
      version,
      brand,
      category: cat,
      sort,
    }
    const effective = applyIntentToSearchParams(current, catalogParams, intent.intentType)
    const hint = hintFromSearchIntent(intent)
    setSearchHint(hint)

    if (
      sameVehicleAndQ(effective, { q, maker, model, year, engine, version }) &&
      lastInterpretedRawRef.current === raw
    ) {
      return
    }

    lastInterpretedRawRef.current = raw
    const patch = effectiveToPatch(effective)
    setSearchDraft(patch.q ?? '')
    patchParams(patch)
  }

  function applySearch(e?: FormEvent) {
    e?.preventDefault()
    void applyInterpretedQuery(searchDraft)
  }

  /** Deep-link / header SearchBar: interpreta `q` da URL uma vez. */
  useEffect(() => {
    const raw = q.trim()
    if (!raw) return
    if (lastInterpretedRawRef.current === raw) return
    void applyInterpretedQuery(raw)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só reage a q novo da URL
  }, [q])

  function clearFilters() {
    setSearchDraft('')
    setSearchHint(null)
    setLastIntent(null)
    setSoftApplied(false)
    setAssistUi(null)
    lastInterpretedRawRef.current = null
    lastAssistRawRef.current = null
    setParams({}, { replace: true })
  }

  /** Fase 3.2: após busca, avalia trigger e pode sugerir correção (sem auto-aplicar). */
  useEffect(() => {
    if (loading) return
    const raw = (lastInterpretedRawRef.current || q).trim()
    if (!raw || !lastIntent) return
    if (lastAssistRawRef.current === raw) return
    lastAssistRawRef.current = raw

    const gen = ++assistGen.current
    void (async () => {
      try {
        const catalog = await listVehicleCatalogEntries()
        if (gen !== assistGen.current) return
        const current: ProductSearchParams = {
          q,
          maker,
          model,
          year,
          engine,
          version,
          brand,
          category: cat,
          sort,
        }
        const assist = await assistIfNeeded(lastIntent, total, raw, { catalog, current })
        if (gen !== assistGen.current) return
        if (assist.suggestionLabel && assist.interpretation) {
          setAssistUi({
            originalQuery: raw,
            suggestionLabel: assist.suggestionLabel,
            interpretation: assist.interpretation,
          })
        } else {
          setAssistUi(null)
        }
      } catch {
        if (gen === assistGen.current) setAssistUi(null)
      }
    })()
  }, [loading, total, lastIntent, q, maker, model, year, engine, version, brand, cat, sort])

  const emptyOutcome = useMemo(() => {
    if (loading || error || products.length > 0) return null
    // Filtros manuais YMM sem intent de texto: ainda dá para reconhecer veículo.
    // Se a URL já tem veículo e o intent veio unknown, preferir o veículo da URL no empty.
    const intentForEmpty: SearchIntent | null =
      lastIntent &&
      lastIntent.intentType === 'unknown' &&
      (maker || model)
        ? {
            ...lastIntent,
            intentType: 'vehicle_only',
            vehicle: {
              maker: maker || undefined,
              model: model || undefined,
              year: year || undefined,
              engine: engine || undefined,
              version: version || undefined,
            },
          }
        : lastIntent

    const synthetic: SearchIntent | null =
      intentForEmpty ??
      (maker || model
        ? {
            raw: q,
            normalizedQuery: q.trim().toLowerCase(),
            intentType: 'vehicle_only',
            productQuery: q.trim() || null,
            vehicle: {
              maker: maker || undefined,
              model: model || undefined,
              year: year || undefined,
              engine: engine || undefined,
              version: version || undefined,
            },
            matchedEntities: [],
            needsClarification: false,
          }
        : q.trim()
          ? {
              raw: q,
              normalizedQuery: q.trim().toLowerCase(),
              intentType: 'unknown',
              productQuery: q.trim(),
              vehicle: {},
              matchedEntities: [],
              needsClarification: false,
            }
          : null)
    const outcome = resolveSearchEmptyOutcome(synthetic, {
      total: products.length,
      softApplied,
    })
    return outcome ? searchEmptyCopy(outcome, synthetic) : null
  }, [loading, error, products.length, lastIntent, maker, model, year, engine, version, q, softApplied])

  async function loadMore() {
    if (loadingMore || !hasMore) return
    const nextPage = loadedPage + 1
    setLoadingMore(true)
    setError(null)
    try {
      const result = await searchCatalog({
        ...searchArgs,
        page: nextPage,
        pageSize: PAGE_SIZE,
      })
      setProducts((prev) => {
        const seen = new Set(prev.map((p) => p.id))
        return [...prev, ...result.items.filter((p) => !seen.has(p.id))]
      })
      setTotal(result.total)
      setHasMore(result.hasMore)
      setLoadedPage(nextPage)
      patchParams({ page: String(nextPage) }, false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar mais produtos')
    } finally {
      setLoadingMore(false)
    }
  }

  const activeChips = [
    q && { key: 'q', label: `Busca: ${q}` },
    cat && {
      key: 'cat',
      label: `Categoria: ${rootCategories.find((c) => c.slug === cat)?.name ?? cat}`,
    },
    maker && { key: 'maker', label: `Montadora: ${maker}` },
    model && { key: 'model', label: `Modelo: ${model}` },
    year && { key: 'year', label: `Ano: ${year}` },
    engine && { key: 'engine', label: `Motor: ${engine}` },
    version && { key: 'version', label: `Versão: ${version}` },
    brand && { key: 'brand', label: `Fabricante: ${brand}` },
    sort !== 'relevance' && {
      key: 'sort',
      label: `Ordenar: ${SORT_OPTIONS.find((o) => o.value === sort)?.label ?? sort}`,
    },
  ].filter(Boolean) as Array<{ key: string; label: string }>

  const filtersPanel = (
    <div className="space-y-3">
      <Select
        label="Categoria"
        name="cat"
        placeholder="Todas"
        value={cat}
        options={rootCategories.map((c) => ({ value: c.slug, label: c.name }))}
        onChange={(e) => patchParams({ cat: e.target.value || null })}
      />
      <Select
        label="Marca"
        name="brand"
        placeholder="Todas"
        value={brand}
        options={brandOptions}
        onChange={(e) => patchParams({ brand: e.target.value || null })}
      />
      <Select
        label="Ordenar"
        name="sort"
        value={sort}
        options={SORT_OPTIONS}
        onChange={(e) =>
          patchParams({
            sort: e.target.value === 'relevance' ? null : e.target.value || null,
          })
        }
      />
      <Select
        label="Montadora"
        name="maker"
        placeholder="Todas"
        value={maker}
        options={(vehicleTree?.makers ?? []).map((m) => ({ value: m, label: m }))}
        onChange={(e) => {
          const nextMaker = e.target.value || null
          const allowedModels = nextMaker
            ? (vehicleTree?.modelsByMaker[nextMaker] ?? [])
            : null
          const modelOk = !nextMaker || !model || (allowedModels?.includes(model) ?? false)
          patchParams({
            maker: nextMaker,
            ...(modelOk
              ? {}
              : { model: null, version: null, engine: null, year: null }),
          })
        }}
      />
      <Select
        label="Modelo"
        name="model"
        placeholder="Todos"
        value={model}
        options={modelOptions}
        onChange={(e) => {
          const nextModel = e.target.value || null
          const versionOk =
            !nextModel ||
            !version ||
            (vehicleTree?.versionsByModel[nextModel] ?? []).includes(version)
          patchParams({
            model: nextModel,
            ...(versionOk ? {} : { version: null, engine: null, year: null }),
          })
        }}
      />
      <Select
        label="Versão"
        name="version"
        placeholder="Todas"
        value={version}
        options={versionOptions}
        onChange={(e) => patchParams({ version: e.target.value || null })}
      />
      <Select
        label="Motor"
        name="engine"
        placeholder="Todos"
        value={engine}
        options={engineOptions}
        onChange={(e) => patchParams({ engine: e.target.value || null })}
      />
      <Select
        label="Ano"
        name="year"
        placeholder="Todos"
        value={year}
        options={yearOptions}
        onChange={(e) => patchParams({ year: e.target.value || null })}
      />
      <div className="rounded-[10px] border border-dashed border-hf-line bg-hf-bg px-3 py-2.5">
        <SavedVehiclesQuickPick
          onPick={(v) =>
            patchParams({
              maker: v.makerName || null,
              model: v.modelName || null,
              year: v.year != null ? String(v.year) : null,
              engine: v.engine || null,
              version: v.versionName || null,
            })
          }
        />
      </div>
      {activeChips.length ? (
        <Button type="button" variant="light" fullWidth onClick={clearFilters}>
          Limpar filtros
        </Button>
      ) : null}
    </div>
  )

  return (
    <Container className="py-8">
      <p className="mb-2 text-[13px] text-hf-muted">
        <Link to="/" className="hover:underline">
          Início
        </Link>{' '}
        / Catálogo
      </p>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="mt-0 mb-2 text-[28px] font-extrabold sm:text-[34px]">Catálogo</h1>
          <p className="text-hf-muted">Busque e filtre — autorização no servidor (RLS).</p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="lg:hidden"
          onClick={() => setFiltersOpen(true)}
        >
          Filtrar
        </Button>
      </div>

      <form
        onSubmit={applySearch}
        className="mt-5 grid grid-cols-1 gap-3 rounded-hf border border-hf-line bg-hf-surface p-3.5 sm:p-4 lg:grid-cols-[1fr_auto]"
      >
        <Input
          label="Busca"
          name="catalog-q"
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.target.value)}
          placeholder="Peça, código, marca ou aplicação"
        />
        <div className="flex items-end gap-2">
          <Button type="submit" variant="primary">
            Buscar
          </Button>
        </div>
      </form>
      {searchHint ? (
        <p className="mt-2 text-sm font-semibold text-hf-muted" role="status">
          {searchHint}
        </p>
      ) : null}

      {assistUi ? (
        <AISearchAssistant
          originalQuery={assistUi.originalQuery}
          suggestionLabel={assistUi.suggestionLabel}
          interpretation={assistUi.interpretation}
          onAccept={() => {
            const interp = assistUi.interpretation
            // Fora do catálogo sem peça útil: só fecha (OK tratado no banner).
            if (
              interp.vehicleRecognizedOutsideCatalog &&
              !interp.productTerms?.length &&
              (!interp.correctedQuery?.trim() ||
                interp.correctedQuery.trim().toLowerCase() ===
                  assistUi.originalQuery.trim().toLowerCase())
            ) {
              setAssistUi(null)
              return
            }
            const vt = interp.vehicleTerms
            const productBits =
              interp.productTerms?.length > 0
                ? interp.productTerms.join(' ')
                : ''
            // Re-busca no sistema: peça + veículo canônico quando no catálogo.
            const next =
              !interp.vehicleRecognizedOutsideCatalog && (vt.model || vt.maker)
                ? [productBits || interp.correctedQuery.trim(), vt.maker, vt.model, vt.year, vt.engine]
                    .filter(Boolean)
                    .filter((v, i, a) => a.indexOf(v) === i)
                    .join(' ')
                    .trim()
                : (productBits || interp.correctedQuery.trim())
            setAssistUi(null)
            if (next) void applyInterpretedQuery(next)
          }}
          onDismiss={() => setAssistUi(null)}
        />
      ) : null}

      {activeChips.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              className="rounded-full border border-hf-line bg-hf-surface px-2.5 py-1.5 text-xs text-hf-ink hover:border-hf-red"
              onClick={() => {
                if (chip.key === 'sort') patchParams({ sort: null })
                else patchParams({ [chip.key]: null })
                if (chip.key === 'q') setSearchDraft('')
              }}
            >
              {chip.label} ×
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="hidden rounded-hf border border-hf-line bg-hf-surface p-4 lg:block">
          <h2 className="m-0 mb-3 text-sm font-extrabold tracking-wide text-hf-muted uppercase">
            Filtros
          </h2>
          {filtersPanel}
        </aside>

        <div>
          {loading ? <Loading /> : null}
          {error ? <ErrorState message={error} /> : null}
          {!loading && !error && products.length === 0 ? (
            <div className="space-y-4">
              <EmptyState
                title={emptyOutcome?.title ?? 'Nenhum produto encontrado'}
                description={
                  emptyOutcome?.description ??
                  'Ajuste a busca ou os filtros. Se precisar, fale com a HF.'
                }
                actionLabel="Limpar filtros"
                actionTo="/catalogo"
              />
              <div className="flex justify-center">
                <WhatsAppButton message={buildNotFoundWhatsAppMessage(q)}>
                  Falar com a HF
                </WhatsAppButton>
              </div>
            </div>
          ) : null}
          {!loading && !error && products.length > 0 ? (
            <>
              <p className="mb-3 text-sm text-hf-muted">
                {total} produto{total === 1 ? '' : 's'}
                {products.length < total ? ` · mostrando ${products.length}` : ''}
              </p>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-[18px] lg:grid-cols-4">
                {products.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    verdict={verdicts.get(p.id)}
                    fitFilter={vehicleFilter}
                    equivalentSkus={equivSkus.get(p.id)}
                  />
                ))}
              </div>
              {hasMore ? (
                <div className="mt-6 flex justify-center">
                  <Button
                    type="button"
                    variant="light"
                    onClick={() => void loadMore()}
                    disabled={loadingMore}
                  >
                    {loadingMore ? 'Carregando…' : 'Carregar mais'}
                  </Button>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      {filtersOpen ? (
        <div className="fixed inset-0 z-[200] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Fechar filtros"
            onClick={() => setFiltersOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 flex w-[min(100%,360px)] flex-col bg-hf-bg shadow-hf">
            <div className="flex items-center justify-between border-b border-hf-line px-4 py-3">
              <h2 className="m-0 text-lg font-extrabold">Filtrar</h2>
              <button
                type="button"
                className="text-sm font-semibold text-hf-muted"
                onClick={() => setFiltersOpen(false)}
              >
                Fechar
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">{filtersPanel}</div>
            <div className="border-t border-hf-line p-4">
              <Button type="button" variant="primary" fullWidth onClick={() => setFiltersOpen(false)}>
                Ver resultados
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </Container>
  )
}
