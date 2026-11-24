import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { PvcCompatRow } from '@/services/compatibility/compatibilityEngine'

type Named = { name: string }

function asNamed(value: unknown): Named | null {
  if (!value) return null
  if (Array.isArray(value)) {
    const first = value[0] as Named | undefined
    return first?.name ? first : null
  }
  const obj = value as Named
  return obj.name ? obj : null
}

/** Carrega evidência PVC completa (ano início/fim) para o motor G5. */
export async function loadPvcEvidenceByProductIds(
  productIds: string[],
): Promise<Map<string, PvcCompatRow[]>> {
  const map = new Map<string, PvcCompatRow[]>()
  const unique = [...new Set(productIds.filter(Boolean))]
  if (!unique.length || !isSupabaseConfigured || !supabase) return map

  const chunkSize = 100
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize)
    const { data, error } = await supabase
      .from('product_vehicle_compatibility')
      .select(
        `
        product_id,
        year_start,
        year_end,
        vehicle_version_id,
        vehicle_versions (
          year, engine, version_name,
          manufacturers ( name ),
          models ( name )
        )
      `,
      )
      .in('product_id', chunk)
    if (error) throw error

    for (const row of data ?? []) {
      const productId = String(row.product_id)
      const raw = row.vehicle_versions as unknown
      const v = (Array.isArray(raw) ? raw[0] : raw) as
        | {
            year: number | null
            engine: string | null
            version_name: string | null
            manufacturers: unknown
            models: unknown
          }
        | null

      const evidence: PvcCompatRow = {
        maker: asNamed(v?.manufacturers)?.name ?? null,
        model: asNamed(v?.models)?.name ?? null,
        yearStart: row.year_start == null ? null : Number(row.year_start),
        yearEnd: row.year_end == null ? null : Number(row.year_end),
        versionYear: v?.year ?? null,
        engine: v?.engine ?? null,
        versionName: v?.version_name ?? null,
        vehicleVersionId: row.vehicle_version_id
          ? String(row.vehicle_version_id)
          : null,
      }
      if (!evidence.maker && !evidence.model) continue
      const list = map.get(productId) ?? []
      list.push(evidence)
      map.set(productId, list)
    }
  }

  return map
}
