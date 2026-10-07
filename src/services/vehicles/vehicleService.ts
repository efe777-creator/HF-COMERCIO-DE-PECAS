import { mockVehicleTree } from '@/data/mocks/vehicles'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { VehicleFilter, VehicleOptionTree } from '@/types'

function relationName(value: unknown): string | undefined {
  if (!value) return undefined
  if (Array.isArray(value)) {
    const first = value[0] as { name?: string } | undefined
    return first?.name
  }
  return (value as { name?: string }).name
}

/**
 * Opções de veículo a partir de manufacturers / models / vehicle_versions.
 * Fallback mock só sem Supabase configurado.
 */
export async function getVehicleOptions(): Promise<VehicleOptionTree> {
  if (!isSupabaseConfigured || !supabase) {
    return mockVehicleTree
  }

  const [{ data: makers, error: e1 }, { data: models, error: e2 }, { data: versions, error: e3 }] =
    await Promise.all([
      supabase.from('manufacturers').select('id, name').eq('status', 'active').order('name'),
      supabase
        .from('models')
        .select('id, name, manufacturer_id, manufacturers(name)')
        .eq('status', 'active')
        .order('name'),
      supabase
        .from('vehicle_versions')
        .select('year, engine, version_name, model_id, manufacturers(name), models(name)')
        .eq('status', 'active'),
    ])

  if (e1) throw e1
  if (e2) throw e2
  if (e3) throw e3

  const makerNames = (makers ?? []).map((m) => String(m.name))
  const modelsByMaker: Record<string, string[]> = {}
  const yearsByModel: Record<string, string[]> = {}
  const enginesByModelYear: Record<string, string[]> = {}
  const enginesByModel: Record<string, string[]> = {}
  const versionsByModel: Record<string, string[]> = {}

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
  }

  for (const v of versions ?? []) {
    const modelName = relationName(v.models)
    if (!modelName) continue

    if (v.year != null) {
      const year = String(v.year)
      yearsByModel[modelName] ??= []
      if (!yearsByModel[modelName].includes(year)) yearsByModel[modelName].push(year)

      if (v.engine) {
        const key = `${modelName}|${year}`
        enginesByModelYear[key] ??= []
        const engine = String(v.engine)
        if (!enginesByModelYear[key].includes(engine)) {
          enginesByModelYear[key].push(engine)
        }
      }
    }

    if (v.engine) {
      enginesByModel[modelName] ??= []
      const engine = String(v.engine)
      if (!enginesByModel[modelName].includes(engine)) {
        enginesByModel[modelName].push(engine)
      }
    }

    if (v.version_name) {
      versionsByModel[modelName] ??= []
      const vn = String(v.version_name)
      if (!versionsByModel[modelName].includes(vn)) {
        versionsByModel[modelName].push(vn)
      }
    }
  }

  for (const k of Object.keys(yearsByModel)) {
    yearsByModel[k].sort((a, b) => Number(b) - Number(a))
  }

  return {
    makers: makerNames,
    modelsByMaker,
    yearsByModel,
    enginesByModelYear,
    enginesByModel,
    versionsByModel,
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
