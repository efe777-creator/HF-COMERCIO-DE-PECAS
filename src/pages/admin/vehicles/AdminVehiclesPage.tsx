import { VehicleWorkSurface } from '@/components/admin/vehicles/VehicleWorkSurface'
import { AdaptiveWorkspace } from '@/components/admin/workspace/AdaptiveWorkspace'
import { GuideStackPanels } from '@/components/admin/workspace/GuideStackPanels'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { useIdSplitTabs } from '@/hooks/useIdSplitTabs'
import { entityStatusLabel } from '@/lib/adminLabels'
import {
  formatVehicleConfigIdentity,
  formatVehicleIdentity,
  VEHICLE_HIERARCHY_SHORT,
} from '@/lib/pvcVehicleCascade'
import { formatVehicleAppYear } from '@/lib/vehicleAppYear'
import { adminListManufacturers } from '@/services/admin/adminManufacturerService'
import {
  ADMIN_VEHICLE_MODELS_PAGE_SIZE,
  adminListDistinctConfigValues,
  adminListModels,
  adminListVehicleModelsPage,
  VEHICLE_NEW_MODEL_TAB_ID,
  type AdminVehicleModelListItem,
} from '@/services/admin/adminVehicleService'
import type { Manufacturer, VehicleModel } from '@/types'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

const FILTERS_EXPANDED_KEY = 'hf.vehicles.filtersExpanded'

function readFiltersExpanded(): boolean {
  try {
    return sessionStorage.getItem(FILTERS_EXPANDED_KEY) === '1'
  } catch {
    return false
  }
}

function identityCell(m: AdminVehicleModelListItem): string {
  if (m.versionCount === 0) return 'Sem configs'
  if (m.versionCount === 1 && m.configPreviews[0]) {
    const c = m.configPreviews[0]
    return formatVehicleIdentity({
      maker: m.manufacturerName,
      model: m.name,
      generation: c.generation || undefined,
      version: c.versionName,
      engine: c.engine,
      fuel: c.fuel,
      wildcards: true,
    })
  }
  const samples = m.configPreviews
    .slice(0, 2)
    .map((c) => formatVehicleConfigIdentity(c))
    .join(' ··· ')
  return `${m.versionCount} configs${samples ? ` — ${samples}` : ''}`
}

export function AdminVehiclesPage() {
  const splitTabs = useIdSplitTabs()
  const [items, setItems] = useState<AdminVehicleModelListItem[]>([])
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([])
  const [filterModels, setFilterModels] = useState<VehicleModel[]>([])
  const [generationOptions, setGenerationOptions] = useState<string[]>([])
  const [versionOptions, setVersionOptions] = useState<string[]>([])
  const [engineOptions, setEngineOptions] = useState<string[]>([])
  const [fuelOptions, setFuelOptions] = useState<string[]>([])

  const [q, setQ] = useState('')
  const [qDebounced, setQDebounced] = useState('')
  const [manufacturerId, setManufacturerId] = useState('')
  const [modelId, setModelId] = useState('')
  const [generation, setGeneration] = useState('')
  const [versionName, setVersionName] = useState('')
  const [engine, setEngine] = useState('')
  const [fuel, setFuel] = useState('')
  const [statusFilter, setStatusFilter] = useState<'' | 'active' | 'inactive'>('active')
  const [filtersExpanded, setFiltersExpanded] = useState(readFiltersExpanded)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const filterChips = useMemo(() => {
    const chips: string[] = []
    if (statusFilter === 'active') chips.push('Ativos')
    if (statusFilter === 'inactive') chips.push('Inativos')
    if (manufacturerId) {
      const m = manufacturers.find((x) => x.id === manufacturerId)
      if (m) chips.push(m.name)
    }
    if (modelId) {
      const mod = filterModels.find((x) => x.id === modelId)
      if (mod) chips.push(mod.name)
    }
    if (generation) chips.push(generation)
    if (versionName) chips.push(versionName)
    if (engine) chips.push(engine)
    if (fuel) chips.push(fuel)
    return chips
  }, [
    statusFilter,
    manufacturerId,
    modelId,
    generation,
    versionName,
    engine,
    fuel,
    manufacturers,
    filterModels,
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
    (offset: number) => ({
      q: qDebounced.trim() || undefined,
      manufacturerId: manufacturerId || undefined,
      modelId: modelId || undefined,
      generation: generation || undefined,
      versionName: versionName || undefined,
      engine: engine || undefined,
      fuel: fuel || undefined,
      status:
        statusFilter === 'active' || statusFilter === 'inactive' ? statusFilter : undefined,
      limit: ADMIN_VEHICLE_MODELS_PAGE_SIZE,
      offset,
    }),
    [qDebounced, manufacturerId, modelId, generation, versionName, engine, fuel, statusFilter],
  )

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { items: rows, hasMore: more } = await adminListVehicleModelsPage(buildListParams(0))
      setItems(rows)
      setHasMore(more)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao listar modelos')
    } finally {
      setLoading(false)
    }
  }, [buildListParams])

  useEffect(() => {
    void (async () => {
      try {
        const makers = await adminListManufacturers()
        setManufacturers(makers.filter((m) => m.status === 'active'))
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao carregar montadoras')
      }
    })()
  }, [])

  useEffect(() => {
    void adminListModels(manufacturerId || undefined)
      .then((list) => {
        const active = list.filter((m) => m.status === 'active')
        setFilterModels(active)
        // Só limpa modelo se a montadora nova não contém o modelo atual
        if (modelId && manufacturerId && !active.some((m) => m.id === modelId)) {
          setModelId('')
        }
      })
      .catch(() => setFilterModels([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- não apagar filtros livres ao mudar montadora
  }, [manufacturerId])

  useEffect(() => {
    void Promise.all([
      adminListDistinctConfigValues('generation', {
        manufacturerId: manufacturerId || undefined,
        modelId: modelId || undefined,
      }),
      adminListDistinctConfigValues('version_name', {
        manufacturerId: manufacturerId || undefined,
        modelId: modelId || undefined,
        generation: generation || undefined,
      }),
      adminListDistinctConfigValues('engine', {
        manufacturerId: manufacturerId || undefined,
        modelId: modelId || undefined,
        generation: generation || undefined,
        versionName: versionName || undefined,
      }),
      adminListDistinctConfigValues('fuel', {
        manufacturerId: manufacturerId || undefined,
        modelId: modelId || undefined,
        generation: generation || undefined,
        versionName: versionName || undefined,
        engine: engine || undefined,
      }),
    ])
      .then(([gens, vers, eng, fu]) => {
        setGenerationOptions(gens)
        setVersionOptions(vers)
        setEngineOptions(eng)
        setFuelOptions(fu)
        // Soft: remove valor só se deixou de existir nas opções filtradas
        if (generation && gens.length && !gens.includes(generation)) setGeneration('')
        if (versionName && vers.length && !vers.includes(versionName)) setVersionName('')
        if (engine && eng.length && !eng.includes(engine)) setEngine('')
        if (fuel && fu.length && !fu.includes(fuel)) setFuel('')
      })
      .catch(() => {
        setGenerationOptions([])
        setVersionOptions([])
        setEngineOptions([])
        setFuelOptions([])
      })
  }, [manufacturerId, modelId, generation, versionName, engine, fuel])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setQDebounced(q), 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [q])

  useEffect(() => {
    void reload()
  }, [reload])

  async function loadMore() {
    setLoadingMore(true)
    try {
      const { items: rows, hasMore: more } = await adminListVehicleModelsPage(
        buildListParams(items.length),
      )
      setItems((prev) => [...prev, ...rows])
      setHasMore(more)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar mais')
    } finally {
      setLoadingMore(false)
    }
  }

  function openGuide(id: string) {
    setHighlightId(id)
    splitTabs.openTab(id)
  }

  function openNewModel() {
    splitTabs.openTab(VEHICLE_NEW_MODEL_TAB_ID)
  }

  function patchItem(row: AdminVehicleModelListItem) {
    setItems((prev) => {
      const idx = prev.findIndex((x) => x.id === row.id)
      if (idx < 0) return [{ ...row, configPreviews: row.configPreviews ?? [] }, ...prev]
      const next = [...prev]
      next[idx] = {
        ...next[idx],
        ...row,
        configPreviews: row.configPreviews ?? next[idx].configPreviews,
      }
      return next
    })
  }

  function onCreated(created: AdminVehicleModelListItem, draftTabId: string) {
    splitTabs.closeTab(draftTabId)
    splitTabs.openTab(created.id)
    patchItem({ ...created, configPreviews: created.configPreviews ?? [] })
    setHighlightId(created.id)
  }

  function guideLabel(id: string) {
    if (splitTabs.openIds.includes(id)) {
      if (splitTabs.openIds.length > 1 && splitTabs.activeId !== id) return '+ Guia'
      return 'Na guia'
    }
    return 'Abrir guia'
  }

  const maisFiltrosLabel = filtersExpanded
    ? 'Recolher filtros'
    : filterChips.length
      ? `Filtros (${filterChips.length})`
      : 'Mais filtros'

  const contextualTitle =
    splitTabs.openIds.length > 1
      ? `${splitTabs.openIds.length} guias`
      : splitTabs.activeId === VEHICLE_NEW_MODEL_TAB_ID
        ? 'Novo modelo'
        : items.find((m) => m.id === splitTabs.activeId)?.name ??
          items.find((m) => m.id === splitTabs.openIds[0])?.name ??
          'Guia'

  const primary = (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="m-0 text-2xl font-extrabold text-hf-ink">Veículos</h1>
          <p className="mt-1 text-sm text-hf-muted">
            Cadastro do carro: {VEHICLE_HIERARCHY_SHORT}. Aplicação (na ficha do produto) só
            vincula versão · motor · período. Pesquise qualquer termo.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/montadoras">
            <Button variant="light">Montadoras</Button>
          </Link>
          <Button variant="primary" onClick={openNewModel}>
            Novo modelo
          </Button>
        </div>
      </div>

      <form
        className="space-y-3 rounded-[14px] border border-hf-line bg-hf-surface p-3"
        data-filters-expanded={filtersExpanded ? 'true' : 'false'}
        onSubmit={(e) => {
          e.preventDefault()
          void reload()
        }}
      >
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[240px] flex-1">
            <Input
              label="Pesquisar (qualquer termo)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Montadora, modelo, versão, motor, combustível…"
            />
          </div>
          <Button type="submit" variant="light">
            Buscar
          </Button>
          <Button
            type="button"
            variant="light"
            onClick={() => {
              setQ('')
              setQDebounced('')
              setManufacturerId('')
              setModelId('')
              setGeneration('')
              setVersionName('')
              setEngine('')
              setFuel('')
              setStatusFilter('active')
              setFilterModels([])
            }}
          >
            Limpar
          </Button>
          <Button
            type="button"
            variant="light"
            onClick={() => setFiltersExpandedPersist(!filtersExpanded)}
          >
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
          <div className="grid gap-3 border-t border-hf-line pt-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block text-sm">
              <span className="mb-1 block font-semibold">Montadora</span>
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
                onChange={(e) => setModelId(e.target.value)}
              >
                <option value="">Todos</option>
                {filterModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-semibold">Versão</span>
              <select
                className="w-full rounded-[10px] border border-hf-line px-3 py-2"
                value={versionName}
                onChange={(e) => setVersionName(e.target.value)}
              >
                <option value="">Todas</option>
                {versionOptions.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-semibold">Motor</span>
              <select
                className="w-full rounded-[10px] border border-hf-line px-3 py-2"
                value={engine}
                onChange={(e) => setEngine(e.target.value)}
              >
                <option value="">Todos</option>
                {engineOptions.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-semibold">Geração (opcional)</span>
              <select
                className="w-full rounded-[10px] border border-hf-line px-3 py-2"
                value={generation}
                onChange={(e) => setGeneration(e.target.value)}
              >
                <option value="">Todas</option>
                {generationOptions.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-semibold">Combustível (opcional)</span>
              <select
                className="w-full rounded-[10px] border border-hf-line px-3 py-2"
                value={fuel}
                onChange={(e) => setFuel(e.target.value)}
              >
                <option value="">Todos</option>
                {fuelOptions.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-semibold">Status</span>
              <select
                className="w-full rounded-[10px] border border-hf-line px-3 py-2"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as '' | 'active' | 'inactive')
                }
              >
                <option value="">Todos</option>
                <option value="active">Ativos</option>
                <option value="inactive">Inativos</option>
              </select>
            </label>
          </div>
        ) : null}
      </form>

      {error ? <p className="text-sm text-hf-danger">{error}</p> : null}

      <div className="overflow-hidden rounded-[14px] border border-hf-line bg-hf-surface">
        <div className="max-h-[min(60dvh,640px)] overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-hf-bg text-hf-muted shadow-sm">
              <tr>
                <th className="px-3 py-2">Montadora</th>
                <th className="px-3 py-2">Modelo</th>
                <th className="px-3 py-2">Fabricação</th>
                <th className="px-3 py-2">Identidade</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-hf-muted">
                    Carregando…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-hf-muted">
                    Nenhum modelo. Ajuste filtros ou{' '}
                    <button
                      type="button"
                      className="font-semibold text-hf-auth-link"
                      onClick={openNewModel}
                    >
                      cadastre um novo
                    </button>
                    .
                  </td>
                </tr>
              ) : (
                items.map((m) => (
                  <tr
                    key={m.id}
                    className={[
                      'cursor-pointer border-t border-hf-line',
                      highlightId === m.id || splitTabs.openIds.includes(m.id)
                        ? 'bg-hf-red/5'
                        : 'hover:bg-hf-bg/60',
                    ].join(' ')}
                    onClick={() => setHighlightId(m.id)}
                    onDoubleClick={() => openGuide(m.id)}
                    title={identityCell(m)}
                  >
                    <td className="px-3 py-2 text-hf-muted">{m.manufacturerName}</td>
                    <td className="px-3 py-2 font-semibold text-hf-ink">{m.name}</td>
                    <td className="px-3 py-2">
                      {formatVehicleAppYear({
                        yearStart: m.productionYearStart,
                        yearEnd: m.productionYearEnd,
                      }) ?? '—'}
                    </td>
                    <td className="max-w-[280px] truncate px-3 py-2 text-xs text-hf-ink">
                      {identityCell(m)}
                    </td>
                    <td className="px-3 py-2">{entityStatusLabel(m.status)}</td>
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="font-semibold text-hf-auth-link"
                        onClick={() => openGuide(m.id)}
                      >
                        {guideLabel(m.id)}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {hasMore ? (
          <div className="border-t border-hf-line p-2 text-center">
            <Button
              type="button"
              variant="light"
              disabled={loadingMore}
              onClick={() => void loadMore()}
            >
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
        if (id === VEHICLE_NEW_MODEL_TAB_ID) {
          return { id, label: 'Novo modelo', statusLabel: 'Rascunho' }
        }
        const m = items.find((x) => x.id === id)
        return {
          id,
          label: m?.name ?? id.slice(0, 8),
          statusLabel: m ? entityStatusLabel(m.status) : undefined,
        }
      })}
      onCloseTab={splitTabs.closeTab}
      render={(id) => (
        <VehicleWorkSurface
          modelId={id}
          manufacturers={manufacturers}
          onManufacturersChange={setManufacturers}
          onClose={() => splitTabs.closeTab(id)}
          onCreated={onCreated}
          onModelUpdated={patchItem}
        />
      )}
    />
  ) : null

  return (
    <AdaptiveWorkspace
      moduleKey="vehicles"
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
