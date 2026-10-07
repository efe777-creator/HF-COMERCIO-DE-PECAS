import { getSupabase } from '@/lib/supabase'
import { toSlug } from '@/lib/slug'
import type { VehicleModel, VehicleVersion } from '@/types'

type ModelRow = {
  id: string
  manufacturer_id: string
  name: string
  slug: string
  status: string
}

type VersionRow = {
  id: string
  manufacturer_id: string
  model_id: string
  year: number | null
  engine: string | null
  version_name: string | null
  status: string
}

function mapModel(row: ModelRow): VehicleModel {
  return {
    id: row.id,
    manufacturerId: row.manufacturer_id,
    name: row.name,
    slug: row.slug,
    status: row.status as VehicleModel['status'],
  }
}

function mapVersion(row: VersionRow): VehicleVersion {
  return {
    id: row.id,
    manufacturerId: row.manufacturer_id,
    modelId: row.model_id,
    year: row.year,
    engine: row.engine,
    versionName: row.version_name,
    status: row.status as VehicleVersion['status'],
  }
}

export async function adminListModels(manufacturerId?: string): Promise<VehicleModel[]> {
  let q = getSupabase()
    .from('models')
    .select('id, manufacturer_id, name, slug, status')
    .order('name')
  if (manufacturerId) q = q.eq('manufacturer_id', manufacturerId)
  const { data, error } = await q
  if (error) throw error
  return (data as ModelRow[]).map(mapModel)
}

export async function adminUpsertModel(input: {
  id?: string
  manufacturerId: string
  name: string
  slug?: string
  status?: VehicleModel['status']
}): Promise<VehicleModel> {
  const payload = {
    manufacturer_id: input.manufacturerId,
    name: input.name.trim(),
    slug: (input.slug?.trim() || toSlug(input.name)) || toSlug(`model-${Date.now()}`),
    status: input.status ?? 'active',
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
    .select('id, manufacturer_id, model_id, year, engine, version_name, status')
    .order('year', { ascending: false, nullsFirst: false })
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
  engine?: string | null
  versionName?: string | null
  status?: VehicleVersion['status']
}): Promise<VehicleVersion> {
  const payload = {
    manufacturer_id: input.manufacturerId,
    model_id: input.modelId,
    year: input.year ?? null,
    engine: input.engine?.trim() || null,
    version_name: input.versionName?.trim() || null,
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
