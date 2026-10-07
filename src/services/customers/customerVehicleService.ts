import { getSupabase } from '@/lib/supabase'
import { getCurrentCustomerId } from '@/services/customers/customerService'
import type { CustomerSavedVehicle } from '@/types'

type Row = {
  id: string
  customer_id: string
  manufacturer_id: string | null
  model_id: string | null
  version_id: string | null
  year: number | null
  engine: string | null
  nickname: string | null
  is_primary: boolean
  manufacturers?: { name: string } | { name: string }[] | null
  models?: { name: string } | { name: string }[] | null
  vehicle_versions?: { version_name: string | null; year: number | null; engine: string | null } | { version_name: string | null; year: number | null; engine: string | null }[] | null
}

function relName(value: unknown): string | undefined {
  if (!value) return undefined
  if (Array.isArray(value)) return (value[0] as { name?: string } | undefined)?.name
  return (value as { name?: string }).name
}

function mapVehicle(row: Row): CustomerSavedVehicle {
  const vv = Array.isArray(row.vehicle_versions) ? row.vehicle_versions[0] : row.vehicle_versions
  return {
    id: String(row.id),
    customerId: String(row.customer_id),
    manufacturerId: row.manufacturer_id,
    modelId: row.model_id,
    versionId: String(row.version_id),
    year: row.year ?? vv?.year ?? null,
    engine: row.engine ?? vv?.engine ?? null,
    nickname: row.nickname,
    isPrimary: Boolean(row.is_primary),
    makerName: relName(row.manufacturers),
    modelName: relName(row.models),
    versionName: vv?.version_name ?? null,
  }
}

export async function listSavedVehicles(): Promise<CustomerSavedVehicle[]> {
  const customerId = await getCurrentCustomerId()
  if (!customerId) return []
  const { data, error } = await getSupabase()
    .from('customer_vehicles')
    .select(
      `
      id, customer_id, manufacturer_id, model_id, version_id, year, engine, nickname, is_primary,
      manufacturers ( name ),
      models ( name ),
      vehicle_versions ( version_name, year, engine )
    `,
    )
    .eq('customer_id', customerId)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as Row[])
    .filter((r) => r.version_id)
    .map(mapVehicle)
}

export async function resolveVersionId(input: {
  maker: string
  model: string
  year?: string
  engine?: string
  version?: string
}): Promise<{
  versionId: string
  manufacturerId: string
  modelId: string
  year: number | null
  engine: string | null
} | null> {
  const sb = getSupabase()
  let q = sb
    .from('vehicle_versions')
    .select('id, manufacturer_id, model_id, year, engine, version_name, manufacturers!inner(name), models!inner(name)')
    .eq('status', 'active')

  if (input.year?.trim()) q = q.eq('year', Number(input.year))
  if (input.engine?.trim()) q = q.eq('engine', input.engine.trim())
  if (input.version?.trim()) q = q.eq('version_name', input.version.trim())

  const { data, error } = await q
  if (error) throw error

  const match = (data ?? []).find((v) => {
    const maker = relName(v.manufacturers)
    const model = relName(v.models)
    return (
      maker?.toLowerCase() === input.maker.toLowerCase() &&
      model?.toLowerCase() === input.model.toLowerCase()
    )
  })
  if (!match) return null
  return {
    versionId: String(match.id),
    manufacturerId: String(match.manufacturer_id),
    modelId: String(match.model_id),
    year: match.year == null ? null : Number(match.year),
    engine: (match.engine as string | null) ?? null,
  }
}

export async function addSavedVehicle(input: {
  versionId: string
  manufacturerId: string
  modelId: string
  year?: number | null
  engine?: string | null
  nickname?: string | null
  isPrimary?: boolean
}): Promise<CustomerSavedVehicle> {
  const customerId = await getCurrentCustomerId()
  if (!customerId) throw new Error('Cliente não encontrado')

  if (input.isPrimary) {
    await getSupabase()
      .from('customer_vehicles')
      .update({ is_primary: false })
      .eq('customer_id', customerId)
  }

  const { data, error } = await getSupabase()
    .from('customer_vehicles')
    .insert({
      customer_id: customerId,
      version_id: input.versionId,
      manufacturer_id: input.manufacturerId,
      model_id: input.modelId,
      year: input.year ?? null,
      engine: input.engine ?? null,
      nickname: input.nickname?.trim() || null,
      is_primary: Boolean(input.isPrimary),
    })
    .select(
      `
      id, customer_id, manufacturer_id, model_id, version_id, year, engine, nickname, is_primary,
      manufacturers ( name ),
      models ( name ),
      vehicle_versions ( version_name, year, engine )
    `,
    )
    .single()
  if (error) throw error
  return mapVehicle(data as Row)
}

export async function removeSavedVehicle(id: string): Promise<void> {
  const customerId = await getCurrentCustomerId()
  if (!customerId) throw new Error('Cliente não encontrado')
  const { error } = await getSupabase()
    .from('customer_vehicles')
    .delete()
    .eq('id', id)
    .eq('customer_id', customerId)
  if (error) throw error
}

export async function setPrimaryVehicle(id: string): Promise<void> {
  const customerId = await getCurrentCustomerId()
  if (!customerId) throw new Error('Cliente não encontrado')
  const sb = getSupabase()
  const { error: clearErr } = await sb
    .from('customer_vehicles')
    .update({ is_primary: false })
    .eq('customer_id', customerId)
  if (clearErr) throw clearErr
  const { error } = await sb
    .from('customer_vehicles')
    .update({ is_primary: true })
    .eq('id', id)
    .eq('customer_id', customerId)
  if (error) throw error
}
