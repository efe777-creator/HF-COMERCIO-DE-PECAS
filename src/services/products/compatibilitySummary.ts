import { formatModelDisplayName, toCommercialTitleCase } from '@/lib/entityNormalize'
import { formatVehicleAppYear } from '@/lib/vehicleAppYear'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { CompatibilityAppGroup, CompatibilityAppLine } from '@/types'

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
  yearLabel?: string | null
  engine?: string | null
  version?: string | null
}): string {
  // Inclui motor/versão: dedupe alinhado ao bloco completo (senão +N subconta).
  return [parts.maker, parts.model, parts.yearLabel, parts.engine, parts.version]
    .filter(Boolean)
    .join(' ')
}

/** Chave estável alinhada a `groupCompatibilityApps` (modelo+motor+versão+ano). */
export function compatibilityAppDedupeKey(parts: {
  maker?: string | null
  model?: string | null
  yearLabel?: string | null
  engine?: string | null
  version?: string | null
}): string {
  return [
    parts.maker ?? '',
    parts.model ?? '',
    parts.engine ?? '',
    parts.version ?? '',
    parts.yearLabel ?? '',
  ]
    .join('|')
    .toLowerCase()
}

type RawAppRow = {
  productId: string
  maker: string | null
  model: string | null
  engine: string | null
  version: string | null
  yearLabel: string | null
  notes: string | null
}

async function loadRawAppRows(productIds: string[]): Promise<RawAppRow[]> {
  const unique = [...new Set(productIds.filter(Boolean))]
  if (!unique.length || !isSupabaseConfigured || !supabase) return []

  const out: RawAppRow[] = []
  const chunkSize = 200

  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize)
    const { data, error } = await supabase
      .from('product_vehicle_compatibility')
      .select(
        `
        product_id,
        notes,
        year_start,
        year_end,
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

      const yearLabel = formatVehicleAppYear({
        yearStart: row.year_start == null ? null : Number(row.year_start),
        yearEnd: row.year_end == null ? null : Number(row.year_end),
        versionYear: v?.year ?? null,
      })

      if (v) {
        out.push({
          productId,
          maker: asNamed(v.manufacturers)?.name ?? null,
          model: asNamed(v.models)?.name ?? null,
          engine: v.engine,
          version: v.version_name,
          yearLabel,
          notes: null,
        })
      } else {
        const notes = ((row.notes as string | null) ?? '').trim() || null
        if (!notes && !yearLabel) continue
        out.push({
          productId,
          maker: null,
          model: notes,
          engine: null,
          version: null,
          yearLabel,
          notes,
        })
      }
    }
  }

  return out
}

function isBoundedLimit(n: number | null | undefined): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n >= 0
}

/** Agrupa apps por montadora. Deduplica linhas iguais. Sem limite por padrão (MARCHA UI). */
export function groupCompatibilityApps(
  rows: RawAppRow[],
  maxLinesPerMaker: number | null = null,
): CompatibilityAppGroup[] {
  const byMaker = new Map<string, { display: string; lines: CompatibilityAppLine[]; seen: Set<string> }>()
  const capped = isBoundedLimit(maxLinesPerMaker)

  for (const row of rows) {
    const makerRaw = row.maker?.trim() || 'Outros'
    const makerKey = makerRaw.toLocaleLowerCase('pt-BR')
    const makerDisplay = toCommercialTitleCase(makerRaw)
    const model = formatModelDisplayName(row.model ?? '')
    if (!model && !row.yearLabel) continue

    const line: CompatibilityAppLine = {
      model: model || '—',
      engine: row.engine ? collapseEngine(row.engine) : null,
      version: row.version ? toCommercialTitleCase(row.version) : null,
      yearLabel: row.yearLabel,
    }
    const dedupeKey = [line.model, line.engine ?? '', line.version ?? '', line.yearLabel ?? '']
      .join('|')
      .toLowerCase()

    let bucket = byMaker.get(makerKey)
    if (!bucket) {
      bucket = { display: makerDisplay, lines: [], seen: new Set() }
      byMaker.set(makerKey, bucket)
    }
    if (bucket.seen.has(dedupeKey)) continue
    bucket.seen.add(dedupeKey)
    if (capped && bucket.lines.length >= maxLinesPerMaker) continue
    bucket.lines.push(line)
  }

  return [...byMaker.values()].map((b) => ({ maker: b.display, lines: b.lines }))
}

function collapseEngine(engine: string): string {
  return engine.replace(/\s+/g, ' ').trim()
}

/**
 * Monta mapa productId → resumo a partir de linhas já carregadas (testável).
 * Deduplica como o bloco completo (maker/modelo/motor/versão/ano).
 */
export function summarizeCompatibilityRows(
  rows: RawAppRow[],
  opts?: { maxEntries?: number },
): Map<string, string> {
  const map = new Map<string, string>()
  const maxEntries = opts?.maxEntries ?? 4
  const linesByProduct = new Map<string, string[]>()
  const seenByProduct = new Map<string, Set<string>>()

  for (const row of rows) {
    const line = row.maker
      ? formatAppLine({
          maker: row.maker,
          model: row.model,
          yearLabel: row.yearLabel,
          engine: row.engine,
          version: row.version,
        })
      : [row.model, row.yearLabel].filter(Boolean).join(' ')
    if (!line) continue

    const seen = seenByProduct.get(row.productId) ?? new Set<string>()
    const key = compatibilityAppDedupeKey({
      maker: row.maker,
      model: row.model,
      yearLabel: row.yearLabel,
      engine: row.engine,
      version: row.version,
    })
    if (seen.has(key)) continue
    seen.add(key)
    seenByProduct.set(row.productId, seen)

    const list = linesByProduct.get(row.productId) ?? []
    list.push(line)
    linesByProduct.set(row.productId, list)
  }

  for (const [productId, lines] of linesByProduct) {
    const shown = lines.slice(0, maxEntries)
    const extra = lines.length - shown.length
    const summary = extra > 0 ? `${shown.join(' · ')} · +${extra}` : shown.join(' · ')
    map.set(productId, summary)
  }

  return map
}

/** Resumo de aplicações por product_id. */
export async function loadCompatibilitySummaries(
  productIds: string[],
  opts?: { compact?: boolean; maxEntries?: number },
): Promise<Map<string, string>> {
  void opts?.compact
  const rows = await loadRawAppRows(productIds)
  return summarizeCompatibilityRows(rows, { maxEntries: opts?.maxEntries })
}

/**
 * Carrega groups por produto.
 * Default MARCHA UI: sem truncate (limiar visual fica no CompatibilityAppsBlock).
 * Passe maxMakers / maxLinesPerMaker finitos só se precisar cortar na carga.
 */
export async function loadCompatibilityGroups(
  productIds: string[],
  opts?: { maxMakers?: number | null; maxLinesPerMaker?: number | null },
): Promise<Map<string, CompatibilityAppGroup[]>> {
  const map = new Map<string, CompatibilityAppGroup[]>()
  const rows = await loadRawAppRows(productIds)
  const byProduct = new Map<string, RawAppRow[]>()
  for (const row of rows) {
    const list = byProduct.get(row.productId) ?? []
    list.push(row)
    byProduct.set(row.productId, list)
  }
  const maxMakers = opts?.maxMakers ?? null
  const maxLines = opts?.maxLinesPerMaker ?? null
  for (const [productId, productRows] of byProduct) {
    let groups = groupCompatibilityApps(productRows, maxLines)
    if (isBoundedLimit(maxMakers)) {
      groups = groups.slice(0, maxMakers)
    }
    if (groups.length) map.set(productId, groups)
  }
  return map
}

/** Anexa compatibilitySummary (+ groups) aos produtos. */
export async function attachCompatibilitySummaries<
  T extends { id: string; compatibilitySummary?: string; compatibilityGroups?: CompatibilityAppGroup[] },
>(
  products: T[],
  opts?: {
    compact?: boolean
    maxEntries?: number
    withGroups?: boolean
    maxMakers?: number | null
    maxLinesPerMaker?: number | null
  },
): Promise<T[]> {
  if (!products.length) return products
  const ids = products.map((p) => p.id)
  const withGroups = opts?.withGroups ?? true
  const [summaries, groups] = await Promise.all([
    loadCompatibilitySummaries(ids, opts),
    withGroups
      ? loadCompatibilityGroups(ids, {
          maxMakers: opts?.maxMakers ?? null,
          maxLinesPerMaker: opts?.maxLinesPerMaker ?? null,
        })
      : Promise.resolve(new Map()),
  ])
  return products.map((p) => {
    const summary = summaries.get(p.id)
    const g = groups.get(p.id)
    if (!summary && !g) return p
    return {
      ...p,
      ...(summary ? { compatibilitySummary: summary } : {}),
      ...(g ? { compatibilityGroups: g } : {}),
    }
  })
}
