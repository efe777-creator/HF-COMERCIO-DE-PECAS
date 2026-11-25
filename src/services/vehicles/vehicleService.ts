import { mockVehicleTree } from '@/data/mocks/vehicles'
import { expandYearsForSelector } from '@/lib/vehicleAppYear'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { VehicleCatalogEntry } from '@/services/search/interpretSearchQuery'
import { buildYearsByModelFromSources } from '@/services/vehicles/buildYearsByModel'
import type { VehicleFilter, VehicleOptionTree } from '@/types'

const VEHICLE_CATALOG_TTL_MS = 60_000
let vehicleCatalogCache: { at: number; entries: VehicleCatalogEntry[] } | null = null

/** Monta entradas maker×model(+versions) a partir da árvore pública — sem inventar combinações. */
export function buildVehicleCatalogEntriesFromTree(
  tree: VehicleOptionTree,
): VehicleCatalogEntry[] {
  const entries: VehicleCatalogEntry[] = []
  const seen = new Set<string>()
  for (const [maker, models] of Object.entries(tree.modelsByMaker)) {
    for (const model of models) {
      const key = `${maker.toLowerCase()}|${model.toLowerCase()}`
      if (seen.has(key)) continue
      seen.add(key)
      const versions = tree.versionsByModel[model] ?? []
      entries.push({
        maker,
        model,
        versions: versions.length ? [...versions] : undefined,
      })
    }
  }
  return entries
}

/** Distinct maker+model(+versions) para o interpretador de busca. Cache curto. */
export async function listVehicleCatalogEntries(): Promise<VehicleCatalogEntry[]> {
  const now = Date.now()
  if (vehicleCatalogCache && now - vehicleCatalogCache.at < VEHICLE_CATALOG_TTL_MS) {
    return vehicleCatalogCache.entries
  }
  const tree = await getVehicleOptions()
  const entries = buildVehicleCatalogEntriesFromTree(tree)
  vehicleCatalogCache = { at: now, entries }
  return entries
}

function relationName(value: unknown): string | undefined {
  if (!value) return undefined
  if (Array.isArray(value)) {
    const first = value[0] as { name?: string } | undefined
    return first?.name
  }
  return (value as { name?: string }).name
}

/** Chave composta modelo|versão para cascata pública. */
export function vehicleModelVersionKey(model: string, version: string): string {
  return `${model}|${version}`
}

function pushUnique(map: Record<string, string[]>, key: string, value: string) {
  map[key] ??= []
  if (!map[key].includes(value)) map[key].push(value)
}

function pushYear(map: Record<string, Set<number>>, key: string, year: number) {
  map[key] ??= new Set()
  map[key].add(year)
}

/**
 * Opções de veículo a partir de manufacturers / models / vehicle_versions / PVC.
 * Anos do seletor vêm da faixa PVC (+ vv.year / fab do modelo).
 * Fallback mock só sem Supabase configurado.
 */
export async function getVehicleOptions(): Promise<VehicleOptionTree> {
  if (!isSupabaseConfigured || !supabase) {
    return mockVehicleTree
  }

  const [
    { data: makers, error: e1 },
    { data: models, error: e2 },
    { data: versions, error: e3 },
    { data: pvcRows, error: e4 },
  ] = await Promise.all([
    supabase.from('manufacturers').select('id, name').eq('status', 'active').order('name'),
    supabase
      .from('models')
      .select(
        'id, name, manufacturer_id, production_year_start, production_year_end, manufacturers(name)',
      )
      .eq('status', 'active')
      .order('name'),
    supabase
      .from('vehicle_versions')
      .select('id, year, engine, version_name, model_id, manufacturers(name), models(name)')
      .eq('status', 'active'),
    supabase.from('product_vehicle_compatibility').select('vehicle_version_id, year_start, year_end'),
  ])

  if (e1) throw e1
  if (e2) throw e2
  if (e3) throw e3
  if (e4) throw e4

  const makerNames = (makers ?? []).map((m) => String(m.name))
  const modelsByMaker: Record<string, string[]> = {}
  const enginesByModelYear: Record<string, string[]> = {}
  const enginesByModel: Record<string, string[]> = {}
  const versionsByModel: Record<string, string[]> = {}
  const enginesByModelVersion: Record<string, string[]> = {}
  const yearsByModelVersionSets: Record<string, Set<number>> = {}

  const modelMeta = new Map<
    string,
    { name: string; productionYearStart: number | null; productionYearEnd: number | null }
  >()

  for (const m of models ?? []) {
    const makerName =
      relationName(m.manufacturers) ??
      makers?.find((x) => x.id === m.manufacturer_id)?.name
    if (!makerName) continue
    const modelName = String(m.name)
    modelsByMaker[makerName] ??= []
    if (!modelsByMaker[makerName].includes(modelName)) {
      modelsByMaker[makerName].push(modelName)
    }
    modelMeta.set(String(m.id), {
      name: modelName,
      productionYearStart:
        m.production_year_start == null ? null : Number(m.production_year_start),
      productionYearEnd: m.production_year_end == null ? null : Number(m.production_year_end),
    })
  }

  const versionById = new Map<
    string,
    {
      modelName: string
      year: number | null
      engine: string | null
      versionName: string | null
    }
  >()

  for (const v of versions ?? []) {
    const modelName = relationName(v.models)
    if (!modelName) continue
    const id = String(v.id)
    const year = v.year == null ? null : Number(v.year)
    const engine = v.engine ? String(v.engine) : null
    const versionName = v.version_name ? String(v.version_name) : null
    versionById.set(id, { modelName, year, engine, versionName })

    if (year != null && engine) {
      pushUnique(enginesByModelYear, `${modelName}|${year}`, engine)
    }

    if (engine) {
      pushUnique(enginesByModel, modelName, engine)
    }

    if (versionName) {
      pushUnique(versionsByModel, modelName, versionName)
      const mvKey = vehicleModelVersionKey(modelName, versionName)
      if (engine) pushUnique(enginesByModelVersion, mvKey, engine)
      if (year != null) pushYear(yearsByModelVersionSets, mvKey, year)
    }
  }

  const yearSources: Parameters<typeof buildYearsByModelFromSources>[0] = []

  for (const pvc of pvcRows ?? []) {
    const vv = versionById.get(String(pvc.vehicle_version_id))
    if (!vv) continue
    const yearStart = pvc.year_start == null ? null : Number(pvc.year_start)
    const yearEnd = pvc.year_end == null ? null : Number(pvc.year_end)
    yearSources.push({
      modelName: vv.modelName,
      versionYear: vv.year,
      yearStart,
      yearEnd,
    })
    if (vv.versionName) {
      const mvKey = vehicleModelVersionKey(vv.modelName, vv.versionName)
      for (const y of expandYearsForSelector(yearStart, yearEnd, vv.year)) {
        pushYear(yearsByModelVersionSets, mvKey, y)
      }
    }
  }

  // Garante anos mesmo sem PVC: vv.year + fab do modelo.
  for (const [modelId, meta] of modelMeta) {
    const modelVersions = (versions ?? []).filter((v) => String(v.model_id) === modelId)
    if (modelVersions.length === 0) {
      yearSources.push({
        modelName: meta.name,
        versionYear: null,
        yearStart: null,
        yearEnd: null,
        productionYearStart: meta.productionYearStart,
        productionYearEnd: meta.productionYearEnd,
      })
      continue
    }
    for (const v of modelVersions) {
      const hasPvc = (pvcRows ?? []).some((p) => String(p.vehicle_version_id) === String(v.id))
      if (hasPvc) continue
      yearSources.push({
        modelName: meta.name,
        versionYear: v.year == null ? null : Number(v.year),
        yearStart: null,
        yearEnd: null,
        productionYearStart: meta.productionYearStart,
        productionYearEnd: meta.productionYearEnd,
      })
    }
  }

  const yearsByModel = buildYearsByModelFromSources(yearSources)
  const yearsByModelVersion: Record<string, string[]> = {}
  for (const [key, set] of Object.entries(yearsByModelVersionSets)) {
    yearsByModelVersion[key] = [...set].sort((a, b) => b - a).map(String)
  }

  return {
    makers: makerNames,
    modelsByMaker,
    yearsByModel,
    enginesByModelYear,
    enginesByModel,
    versionsByModel,
    enginesByModelVersion,
    yearsByModelVersion,
  }
}

export function buildVehicleQuery(filter: VehicleFilter): URLSearchParams {
  const params = new URLSearchParams()
  const entries: [keyof VehicleFilter, string | undefined][] = [
    ['maker', filter.maker],
    ['model', filter.model],
    ['year', filter.year],
    ['engine', filter.engine],
    ['version', filter.version],
  ]
  const selected = entries.filter(([, v]) => Boolean(v))
  if (selected.length) {
    params.set('vehicle', '1')
    selected.forEach(([k, v]) => {
      if (v) params.set(k, v)
    })
  }
  return params
}
