import { isSupabaseConfigured, supabase } from '@/lib/supabase'

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

function formatAppLine(parts: {
  maker?: string | null
  model?: string | null
  year?: number | null
  engine?: string | null
  version?: string | null
  /** Card compacto: montadora + modelo + ano (sem motor/versão). */
  compact?: boolean
}): string {
  if (parts.compact) {
    return [parts.maker, parts.model, parts.year].filter(Boolean).join(' ')
  }
  return [parts.maker, parts.model, parts.year, parts.engine, parts.version]
    .filter(Boolean)
    .join(' ')
}

/**
 * Resumo de aplicações por product_id.
 * Deduplica por "Montadora Modelo Ano" no modo compacto (cards).
 */
export async function loadCompatibilitySummaries(
  productIds: string[],
  opts?: { compact?: boolean; maxEntries?: number },
): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  const unique = [...new Set(productIds.filter(Boolean))]
  if (!unique.length || !isSupabaseConfigured || !supabase) return map

  const compact = opts?.compact ?? true
  const maxEntries = opts?.maxEntries ?? 4
  const chunkSize = 200

  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize)
    const { data, error } = await supabase
      .from('product_vehicle_compatibility')
      .select(
        `
        product_id,
        notes,
        vehicle_versions (
          year, engine, version_name,
          manufacturers ( name ),
          models ( name )
        )
      `,
      )
      .in('product_id', chunk)
    if (error) throw error

    const linesByProduct = new Map<string, string[]>()
    const seenByProduct = new Map<string, Set<string>>()

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

      let line = ''
      if (v) {
        line = formatAppLine({
          maker: asNamed(v.manufacturers)?.name,
          model: asNamed(v.models)?.name,
          year: v.year,
          engine: v.engine,
          version: v.version_name,
          compact,
        })
      } else {
        line = ((row.notes as string | null) ?? '').trim()
      }
      if (!line) continue

      const seen = seenByProduct.get(productId) ?? new Set<string>()
      const key = line.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      seenByProduct.set(productId, seen)

      const list = linesByProduct.get(productId) ?? []
      list.push(line)
      linesByProduct.set(productId, list)
    }

    for (const [productId, lines] of linesByProduct) {
      const shown = lines.slice(0, maxEntries)
      const extra = lines.length - shown.length
      const summary =
        extra > 0 ? `${shown.join(' · ')} · +${extra}` : shown.join(' · ')
      map.set(productId, summary)
    }
  }

  return map
}

/** Anexa compatibilitySummary aos produtos (in-place friendly — retorna novos objetos). */
export async function attachCompatibilitySummaries<T extends { id: string; compatibilitySummary?: string }>(
  products: T[],
  opts?: { compact?: boolean; maxEntries?: number },
): Promise<T[]> {
  if (!products.length) return products
  const summaries = await loadCompatibilitySummaries(
    products.map((p) => p.id),
    opts,
  )
  return products.map((p) => {
    const summary = summaries.get(p.id)
    if (!summary) return p
    return { ...p, compatibilitySummary: summary }
  })
}
