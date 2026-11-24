import { getSupabase } from '@/lib/supabase'
import { toSlug } from '@/lib/slug'
import type { VehicleModel, VehicleVersion } from '@/types'

export const ADMIN_VEHICLE_MODELS_PAGE_SIZE = 60
/** Guia de criação (ainda sem id no banco). */
export const VEHICLE_NEW_MODEL_TAB_ID = '__new__'

type ModelRow = {
  id: string
  manufacturer_id: string
  name: string
  slug: string
  status: string
  production_year_start?: number | null
  production_year_end?: number | null
  quality_status?: string | null
}

type VersionRow = {
  id: string
  manufacturer_id: string
  model_id: string
  year: number | null
  year_start?: number | null
  year_end?: number | null
  engine: string | null
  fuel: string | null
  version_name: string | null
  generation: string | null
  status: string
}

export type AdminVehicleConfigPreview = {
  generation: string | null
  versionName: string | null
  engine: string | null
  fuel: string | null
}

export type AdminVehicleModelListItem = VehicleModel & {
  manufacturerName: string
  versionCount: number
  /** Até 3 configs para identidade na lista. */
  configPreviews: AdminVehicleConfigPreview[]
}

export type AdminListVehicleModelsParams = {
  q?: string
  manufacturerId?: string
  modelId?: string
  status?: 'active' | 'inactive'
  generation?: string
  versionName?: string
  engine?: string
  fuel?: string
  limit?: number
  offset?: number
}

export type AdminDistinctConfigFilters = {
  manufacturerId?: string
  modelId?: string
  generation?: string
  versionName?: string
  engine?: string
}

function mapModel(row: ModelRow): VehicleModel {
  return {
    id: row.id,
    manufacturerId: row.manufacturer_id,
    name: row.name,
    slug: row.slug,
    status: row.status as VehicleModel['status'],
    productionYearStart: row.production_year_start ?? null,
    productionYearEnd: row.production_year_end ?? null,
    qualityStatus: row.quality_status ?? null,
  }
}

function mapVersion(row: VersionRow): VehicleVersion {
  const yearStart =
    row.year_start != null ? Number(row.year_start) : row.year != null ? Number(row.year) : null
  const yearEnd = row.year_end != null ? Number(row.year_end) : null
  return {
    id: row.id,
    manufacturerId: row.manufacturer_id,
    modelId: row.model_id,
    year: row.year,
    yearStart,
    yearEnd,
    engine: row.engine,
    fuel: row.fuel ?? null,
    versionName: row.version_name,
    generation: row.generation ?? null,
    status: row.status as VehicleVersion['status'],
  }
}

function asNamed(
  value: { name: string } | { name: string }[] | null | undefined,
): { name: string } | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

/** IDs de modelo cujo nome de montadora ou config bate com o termo. */
async function resolveModelIdsByBroadTerm(term: string): Promise<string[]> {
  const safe = term.trim().replace(/[,()"]/g, ' ').trim()
  if (!safe || safe.length < 2) return []
  const sb = getSupabase()
  const like = `%${safe}%`
  const ids = new Set<string>()

  const [{ data: makers }, { data: versions }] = await Promise.all([
    sb.from('manufacturers').select('id').ilike('name', like).limit(40),
    sb
      .from('vehicle_versions')
      .select('model_id')
      .eq('status', 'active')
      .or(
        `engine.ilike."${like}",fuel.ilike."${like}",version_name.ilike."${like}",generation.ilike."${like}"`,
      )
      .limit(200),
  ])

  const makerIds = (makers ?? []).map((m) => String(m.id))
  if (makerIds.length) {
    const { data: models } = await sb
      .from('models')
      .select('id')
      .in('manufacturer_id', makerIds)
      .limit(200)
    for (const m of models ?? []) ids.add(String(m.id))
  }
  for (const v of versions ?? []) ids.add(String(v.model_id))
  return [...ids]
}

/** IDs de modelo que têm config batendo com filtros exatos/ilike de versão/motor/combustível. */
async function resolveModelIdsByConfigFilters(params: {
  generation?: string
  versionName?: string
  engine?: string
  fuel?: string
}): Promise<string[] | null> {
  const generation = params.generation?.trim()
  const versionName = params.versionName?.trim()
  const engine = params.engine?.trim()
  const fuel = params.fuel?.trim()
  if (!generation && !versionName && !engine && !fuel) return null

  let q = getSupabase().from('vehicle_versions').select('model_id').eq('status', 'active')
  if (generation) q = q.ilike('generation', generation)
  if (versionName) q = q.ilike('version_name', versionName)
  if (engine) q = q.ilike('engine', engine)
  if (fuel) q = q.ilike('fuel', fuel)
  const { data, error } = await q.limit(500)
  if (error) throw error
  return [...new Set((data ?? []).map((r) => String(r.model_id)))]
}

function mapConfigPreviews(
  rows:
    | {
        generation?: string | null
        version_name?: string | null
        engine?: string | null
        fuel?: string | null
      }[]
    | null
    | undefined,
): AdminVehicleConfigPreview[] {
  return (rows ?? []).slice(0, 3).map((r) => ({
    generation: r.generation ?? null,
    versionName: r.version_name ?? null,
    engine: r.engine ?? null,
    fuel: r.fuel ?? null,
  }))
}

export async function adminListModels(manufacturerId?: string): Promise<VehicleModel[]> {
  let q = getSupabase()
    .from('models')
    .select(
      'id, manufacturer_id, name, slug, status, production_year_start, production_year_end, quality_status',
    )
    .order('name')
  if (manufacturerId) q = q.eq('manufacturer_id', manufacturerId)
  const { data, error } = await q
  if (error) throw error
  return (data as ModelRow[]).map(mapModel)
}

export async function adminGetVehicleModel(id: string): Promise<AdminVehicleModelListItem | null> {
  const { data, error } = await getSupabase()
    .from('models')
    .select(
      `id, manufacturer_id, name, slug, status, production_year_start, production_year_end, quality_status,
       manufacturers ( name ),
       vehicle_versions ( id, generation, version_name, engine, fuel, status )`,
    )
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const row = data as ModelRow & {
    manufacturers?: { name: string } | { name: string }[] | null
    vehicle_versions?: {
      id: string
      generation?: string | null
      version_name?: string | null
      engine?: string | null
      fuel?: string | null
      status?: string | null
    }[] | null
  }
  const maker = asNamed(row.manufacturers)
  const activeVersions = (row.vehicle_versions ?? []).filter((v) => v.status !== 'inactive')
  return {
    ...mapModel(row),
    manufacturerName: maker?.name ?? '—',
    versionCount: activeVersions.length,
    configPreviews: mapConfigPreviews(activeVersions),
  }
}

/**
 * Lista paginada de modelos com montadora + contagem/preview de configs.
 * q ampla: modelo, montadora, versão, motor, combustível.
 */
export async function adminListVehicleModelsPage(
  params?: AdminListVehicleModelsParams,
): Promise<{ items: AdminVehicleModelListItem[]; hasMore: boolean }> {
  const limit = params?.limit ?? ADMIN_VEHICLE_MODELS_PAGE_SIZE
  const offset = params?.offset ?? 0

  const byConfig = await resolveModelIdsByConfigFilters({
    generation: params?.generation,
    versionName: params?.versionName,
    engine: params?.engine,
    fuel: params?.fuel,
  })
  if (byConfig && byConfig.length === 0) return { items: [], hasMore: false }

  let q = getSupabase()
    .from('models')
    .select(
      `id, manufacturer_id, name, slug, status, production_year_start, production_year_end, quality_status,
       manufacturers ( name ),
       vehicle_versions ( id, generation, version_name, engine, fuel, status )`,
    )
    .order('name')

  if (params?.manufacturerId) q = q.eq('manufacturer_id', params.manufacturerId)
  if (params?.modelId) q = q.eq('id', params.modelId)
  if (params?.status) q = q.eq('status', params.status)
  if (byConfig) q = q.in('id', byConfig)

  if (params?.q?.trim()) {
    const safe = params.q.trim().replace(/[,()"]/g, ' ').trim()
    if (safe) {
      const like = `%${safe}%`
      const broadIds = await resolveModelIdsByBroadTerm(safe)
      const parts = [`name.ilike."${like}"`]
      if (broadIds.length) parts.push(`id.in.(${broadIds.join(',')})`)
      q = q.or(parts.join(','))
    }
  }

  q = q.range(offset, offset + limit)
  const { data, error } = await q
  if (error) throw error

  const rows = (data ?? []) as (ModelRow & {
    manufacturers?: { name: string } | { name: string }[] | null
    vehicle_versions?: {
      id: string
      generation?: string | null
      version_name?: string | null
      engine?: string | null
      fuel?: string | null
      status?: string | null
    }[] | null
  })[]

  const mapped: AdminVehicleModelListItem[] = rows.map((row) => {
    const maker = asNamed(row.manufacturers)
    const activeVersions = (row.vehicle_versions ?? []).filter((v) => v.status !== 'inactive')
    return {
      ...mapModel(row),
      manufacturerName: maker?.name ?? '—',
      versionCount: activeVersions.length,
      configPreviews: mapConfigPreviews(activeVersions),
    }
  })

  const hasMore = mapped.length > limit
  return { items: hasMore ? mapped.slice(0, limit) : mapped, hasMore }
}

/** Valores distintos de config para cascata de filtros da lista. */
export async function adminListDistinctConfigValues(
  field: 'generation' | 'version_name' | 'engine' | 'fuel',
  filters?: AdminDistinctConfigFilters,
): Promise<string[]> {
  let q = getSupabase()
    .from('vehicle_versions')
    .select('generation, version_name, engine, fuel, manufacturer_id, model_id')
    .eq('status', 'active')
    .limit(800)
  if (filters?.manufacturerId) q = q.eq('manufacturer_id', filters.manufacturerId)
  if (filters?.modelId) q = q.eq('model_id', filters.modelId)
  if (filters?.generation?.trim()) q = q.ilike('generation', filters.generation.trim())
  if (filters?.versionName?.trim()) q = q.ilike('version_name', filters.versionName.trim())
  if (filters?.engine?.trim()) q = q.ilike('engine', filters.engine.trim())

  const { data, error } = await q
  if (error) throw error
  const set = new Set<string>()
  for (const row of data ?? []) {
    const raw = (row as Record<string, string | null>)[field]
    const v = String(raw ?? '').trim()
    if (v) set.add(v)
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

/** @deprecated use adminListDistinctConfigValues('engine', …) */
export async function adminListDistinctEngines(manufacturerId?: string): Promise<string[]> {
  return adminListDistinctConfigValues('engine', { manufacturerId })
}

export async function adminListDistinctVersionNames(manufacturerId?: string): Promise<string[]> {
  return adminListDistinctConfigValues('version_name', { manufacturerId })
}

export async function adminUpsertModel(input: {
  id?: string
  manufacturerId: string
  name: string
  slug?: string
  status?: VehicleModel['status']
  productionYearStart?: number | null
  productionYearEnd?: number | null
  qualityStatus?: string | null
}): Promise<VehicleModel> {
  const payload = {
    manufacturer_id: input.manufacturerId,
    name: input.name.trim(),
    slug: (input.slug?.trim() || toSlug(input.name)) || toSlug(`model-${Date.now()}`),
    status: input.status ?? 'active',
    production_year_start: input.productionYearStart ?? null,
    production_year_end: input.productionYearEnd ?? null,
    quality_status: input.qualityStatus ?? 'ok',
  }
  const q = getSupabase().from('models')
  const { data, error } = input.id
    ? await q.update(payload).eq('id', input.id).select().single()
    : await q.insert(payload).select().single()
  if (error) throw error
  return mapModel(data as ModelRow)
}

export async function adminListVersions(modelId?: string): Promise<VehicleVersion[]> {
  let q = getSupabase()
    .from('vehicle_versions')
    .select(
      'id, manufacturer_id, model_id, year, year_start, year_end, engine, fuel, version_name, generation, status',
    )
    .order('year_start', { ascending: false, nullsFirst: false })
  if (modelId) q = q.eq('model_id', modelId)
  const { data, error } = await q
  if (error) throw error
  return (data as VersionRow[]).map(mapVersion)
}

export async function adminUpsertVersion(input: {
  id?: string
  manufacturerId: string
  modelId: string
  year?: number | null
  yearStart?: number | null
  yearEnd?: number | null
  engine?: string | null
  fuel?: string | null
  versionName?: string | null
  generation?: string | null
  status?: VehicleVersion['status']
}): Promise<VehicleVersion> {
  const yearStart = input.yearStart ?? null
  const yearEnd = input.yearEnd ?? null
  // Mantém `year` legado alinhado ao início (compat / imports antigos).
  const legacyYear = yearStart ?? input.year ?? null
  const payload = {
    manufacturer_id: input.manufacturerId,
    model_id: input.modelId,
    year: legacyYear,
    year_start: yearStart,
    year_end: yearEnd,
    engine: input.engine?.trim() || null,
    fuel: input.fuel?.trim() || null,
    version_name: input.versionName?.trim() || null,
    generation: input.generation?.trim() || null,
    status: input.status ?? 'active',
  }
  const q = getSupabase().from('vehicle_versions')
  const { data, error } = input.id
    ? await q.update(payload).eq('id', input.id).select().single()
    : await q.insert(payload).select().single()
  if (error) throw error
  return mapVersion(data as VersionRow)
}

export async function adminSetModelStatus(id: string, status: VehicleModel['status']) {
  const { error } = await getSupabase().from('models').update({ status }).eq('id', id)
  if (error) throw error
}

export async function adminSetVersionStatus(id: string, status: VehicleVersion['status']) {
  const { error } = await getSupabase().from('vehicle_versions').update({ status }).eq('id', id)
  if (error) throw error
}
