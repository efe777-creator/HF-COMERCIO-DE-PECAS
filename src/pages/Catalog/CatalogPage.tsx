import { Button } from '@/components/common/Button'
import { Container } from '@/components/layout/Container'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { Select } from '@/components/common/Select'
import { ProductCard } from '@/components/product/ProductCard'
import { SavedVehiclesQuickPick } from '@/components/vehicle/SavedVehiclesQuickPick'
import { features } from '@/config/features'
import { listActiveBrands } from '@/services/brands/brandService'
import { listCategories } from '@/services/categories/categoryService'
import { searchCatalog } from '@/services/search/searchService'
import { getVehicleOptions } from '@/services/vehicles/vehicleService'
import type { Category, Product, ProductBrand, ProductSearchSort, VehicleOptionTree } from '@/types'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

const PAGE_SIZE = 24

const SORT_OPTIONS: Array<{ value: ProductSearchSort; label: string }> = [
  { value: 'relevance', label: 'Relevância' },
  ...(features.price_enabled
    ? ([
        { value: 'price_asc', label: 'Menor preço' },
        { value: 'price_desc', label: 'Maior preço' },
      ] as const)
    : []),
  { value: 'name_asc', label: 'Nome A–Z' },
  { value: 'name_desc', label: 'Nome Z–A' },
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
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loadedPage, setLoadedPage] = useState(1)
  const [rootCategories, setRootCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<ProductBrand[]>([])
  const [vehicleTree, setVehicleTree] = useState<VehicleOptionTree | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestId = useRef(0)

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
      try {
        const first = await searchCatalog({
          ...searchArgs,
          page: 1,
          pageSize: PAGE_SIZE,
        })
        if (id !== requestId.current) return

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
    if (!vehicleTree || !maker) return []
    return (vehicleTree.modelsByMaker[maker] ?? []).map((m) => ({ value: m, label: m }))
  }, [vehicleTree, maker])

  const yearOptions = useMemo(() => {
    if (!vehicleTree || !model) return []
    return (vehicleTree.yearsByModel[model] ?? []).map((y) => ({ value: y, label: y }))
  }, [vehicleTree, model])

  const engineOptions = useMemo(() => {
    if (!vehicleTree || !model) return []
    if (year) {
      const key = `${model}|${year}`
      const byYear = vehicleTree.enginesByModelYear[key] ?? []
      if (byYear.length) return byYear.map((e) => ({ value: e, label: e }))
    }
    return (vehicleTree.enginesByModel[model] ?? []).map((e) => ({ value: e, label: e }))
  }, [vehicleTree, model, year])

  const versionOptions = useMemo(() => {
    if (!vehicleTree || !model) return []
    return (vehicleTree.versionsByModel[model] ?? []).map((v) => ({ value: v, label: v }))
  }, [vehicleTree, model])

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

  function applySearch(e?: FormEvent) {
    e?.preventDefault()
    patchParams({ q: searchDraft.trim() || null })
  }

  function clearFilters() {
    setSearchDraft('')
    setParams({}, { replace: true })
  }

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

  return (
    <Container className="py-8">
      <p className="mb-2 text-[13px] text-hf-muted">
        <Link to="/" className="hover:underline">
          Início
        </Link>{' '}
        / Catálogo
      </p>
      <h1 className="mt-0 mb-2 text-[28px] font-extrabold sm:text-[34px]">Catálogo</h1>
      <p className="text-hf-muted">
        Busque por texto ou refine por categoria e veículo. Filtros podem ser usados sozinhos ou
        combinados.
      </p>

      <form
        onSubmit={applySearch}
        className="mt-5 grid grid-cols-1 gap-3 rounded-hf border border-hf-line bg-hf-surface p-3.5 sm:p-4 lg:grid-cols-[1fr_auto]"
      >
        <Input
          label="Busca"
          name="catalog-q"
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.target.value)}
          placeholder="Peça, código ou referência"
        />
        <div className="flex items-end gap-2">
          <Button type="submit" variant="primary">
            Buscar
          </Button>
          {activeChips.length ? (
            <Button type="button" variant="light" onClick={clearFilters}>
              Limpar
            </Button>
          ) : null}
        </div>
      </form>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <Select
          label="Categoria"
          name="cat"
          placeholder="Todas"
          value={cat}
          options={rootCategories.map((c) => ({ value: c.slug, label: c.name }))}
          onChange={(e) => patchParams({ cat: e.target.value || null })}
        />
        <Select
          label="Fabricante"
          name="brand"
          placeholder="Todos / opcional"
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
          placeholder="Todas / opcional"
          value={maker}
          options={(vehicleTree?.makers ?? []).map((m) => ({ value: m, label: m }))}
          onChange={(e) =>
            patchParams({
              maker: e.target.value || null,
              model: null,
              year: null,
              engine: null,
              version: null,
            })
          }
        />
        <Select
          label="Modelo"
          name="model"
          placeholder="Todos / opcional"
          value={model}
          options={modelOptions}
          disabled={!maker}
          onChange={(e) =>
            patchParams({
              model: e.target.value || null,
              year: null,
              engine: null,
              version: null,
            })
          }
        />
        <Select
          label="Ano"
          name="year"
          placeholder="Todos / opcional"
          value={year}
          options={yearOptions}
          disabled={!model}
          onChange={(e) =>
            patchParams({
              year: e.target.value || null,
            })
          }
        />
        <Select
          label="Motor"
          name="engine"
          placeholder="Todos / opcional"
          value={engine}
          options={engineOptions}
          disabled={!model}
          onChange={(e) => patchParams({ engine: e.target.value || null })}
        />
        <Select
          label="Versão"
          name="version"
          placeholder="Todas / opcional"
          value={version}
          options={versionOptions}
          disabled={!model}
          onChange={(e) => patchParams({ version: e.target.value || null })}
        />
      </div>

      <div className="mt-3 rounded-hf border border-dashed border-[#d8dee3] bg-hf-surface-2 px-3 py-2.5">
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
        <div className="mt-4 flex flex-wrap gap-2">
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              className="rounded-full border border-[#d8dee3] bg-[#f7f9fa] px-2.5 py-1.5 text-xs hover:border-hf-line"
              onClick={() => {
                if (chip.key === 'maker') {
                  patchParams({ maker: null, model: null, year: null, engine: null, version: null })
                } else if (chip.key === 'model') {
                  patchParams({ model: null, year: null, engine: null, version: null })
                } else if (chip.key === 'year') {
                  patchParams({ year: null })
                } else if (chip.key === 'sort') {
                  patchParams({ sort: null })
                } else {
                  patchParams({ [chip.key]: null })
                }
                if (chip.key === 'q') setSearchDraft('')
              }}
            >
              {chip.label} ×
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-6">
        {loading ? <Loading /> : null}
        {error ? <ErrorState message={error} /> : null}
        {!loading && !error && products.length === 0 ? (
          <EmptyState
            title="Nenhum produto encontrado"
            description="Ajuste a busca ou os filtros para ver outros resultados."
            actionLabel="Limpar filtros"
            actionTo="/catalogo"
          />
        ) : null}
        {!loading && !error && products.length > 0 ? (
          <>
            <p className="mb-3 text-sm text-hf-muted">
              {total} produto{total === 1 ? '' : 's'}
              {products.length < total ? ` · mostrando ${products.length}` : ''}
            </p>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-[18px] lg:grid-cols-4">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
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
    </Container>
  )
}
