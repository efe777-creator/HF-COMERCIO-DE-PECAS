/**
 * Aliases de veículo HF (colheita FAL — builtins leves).
 * Resolve apelidos (GM, HRV, VW…) para canônicos e valida no catálogo HF.
 */
import { normalizeEntityMatchKey } from '@/lib/entityNormalize'
import type { SearchIntentVehicle, VehicleCatalogEntry } from '@/services/search/interpretSearchQuery'

export type VehicleAliasKind = 'maker' | 'model'

export type VehicleAlias = {
  kind: VehicleAliasKind
  fromNorm: string
  toCanonical: string
  /** Escopo opcional de montadora (modelos). */
  makerScope?: string
}

/** Seed embutido — espelha o núcleo útil da FAL INV_BUILTIN_ALIASES. */
export const HF_BUILTIN_VEHICLE_ALIASES: VehicleAlias[] = [
  { kind: 'maker', fromNorm: 'chev', toCanonical: 'Chevrolet' },
  { kind: 'maker', fromNorm: 'gm', toCanonical: 'Chevrolet' },
  { kind: 'maker', fromNorm: 'vw', toCanonical: 'Volkswagen' },
  { kind: 'model', fromNorm: 'hrv', toCanonical: 'HR-V', makerScope: 'Honda' },
  { kind: 'model', fromNorm: 'hr-v', toCanonical: 'HR-V', makerScope: 'Honda' },
  { kind: 'model', fromNorm: 'saveira', toCanonical: 'Saveiro', makerScope: 'Volkswagen' },
  { kind: 'model', fromNorm: 'corollacross', toCanonical: 'Corolla Cross', makerScope: 'Toyota' },
  { kind: 'model', fromNorm: 'hb20s', toCanonical: 'HB20S', makerScope: 'Hyundai' },
  { kind: 'model', fromNorm: 'hb 20', toCanonical: 'HB20', makerScope: 'Hyundai' },
]

export type ResolveVehicleAliasResult = {
  status: 'exact' | 'not_in_catalog' | 'none'
  vehicleTerms: SearchIntentVehicle
  /** Label sugerido quando reconhecido (mesmo fora do catálogo). */
  suggestedVehicleLabel: string | null
  /** Token bruto que bateu no alias. */
  matchedFrom: string | null
}

function findCatalogModel(
  catalog: VehicleCatalogEntry[],
  modelCanon: string,
  makerHint?: string,
): VehicleCatalogEntry | undefined {
  const mKey = normalizeEntityMatchKey(modelCanon)
  const makerKey = makerHint ? normalizeEntityMatchKey(makerHint) : ''
  const hits = catalog.filter((c) => normalizeEntityMatchKey(c.model) === mKey)
  if (!hits.length) return undefined
  if (makerKey) {
    const scoped = hits.find((c) => normalizeEntityMatchKey(c.maker) === makerKey)
    if (scoped) return scoped
  }
  return hits[0]
}

function findCatalogMaker(catalog: VehicleCatalogEntry[], makerCanon: string): string | undefined {
  const key = normalizeEntityMatchKey(makerCanon)
  const hit = catalog.find((c) => normalizeEntityMatchKey(c.maker) === key)
  return hit?.maker
}

/**
 * Varre tokens da query contra builtins; valida no catálogo HF.
 * Não promove filho→pai (Corolla Cross ≠ Corolla) — aliases já são explícitos.
 */
export function resolveVehicleAliasesFromQuery(
  rawQuery: string,
  catalog: VehicleCatalogEntry[],
  aliases: VehicleAlias[] = HF_BUILTIN_VEHICLE_ALIASES,
): ResolveVehicleAliasResult {
  const raw = rawQuery.trim()
  if (!raw) {
    return { status: 'none', vehicleTerms: {}, suggestedVehicleLabel: null, matchedFrom: null }
  }

  const rawKey = normalizeEntityMatchKey(raw)
  const tokens = rawKey.split(/\s+/).filter(Boolean)
  // Também tenta bigrams (ex.: "hb 20", "corolla cross" já normalizado).
  const candidates: string[] = [...tokens]
  for (let i = 0; i < tokens.length - 1; i++) {
    candidates.push(`${tokens[i]} ${tokens[i + 1]}`)
  }
  // Compacta sem espaço para fromNorm tipo corollacross / hrv
  const compact = rawKey.replace(/\s+/g, '')
  if (compact && !candidates.includes(compact)) candidates.push(compact)

  let makerHit: VehicleAlias | undefined
  let modelHit: VehicleAlias | undefined
  let matchedFrom: string | null = null

  for (const cand of candidates) {
    const key = cand.replace(/\s+/g, '')
    const keySpaced = cand
    for (const a of aliases) {
      const from = a.fromNorm.replace(/\s+/g, '')
      const fromSpaced = a.fromNorm
      const match =
        key === from ||
        keySpaced === fromSpaced ||
        normalizeEntityMatchKey(cand) === normalizeEntityMatchKey(a.fromNorm)
      if (!match) continue
      if (a.kind === 'maker' && !makerHit) {
        makerHit = a
        matchedFrom = cand
      }
      if (a.kind === 'model' && !modelHit) {
        modelHit = a
        matchedFrom = cand
      }
    }
  }

  if (!makerHit && !modelHit) {
    return { status: 'none', vehicleTerms: {}, suggestedVehicleLabel: null, matchedFrom: null }
  }

  if (modelHit) {
    const entry = findCatalogModel(catalog, modelHit.toCanonical, modelHit.makerScope)
    if (entry) {
      return {
        status: 'exact',
        vehicleTerms: { maker: entry.maker, model: entry.model },
        suggestedVehicleLabel: `${entry.maker} ${entry.model}`,
        matchedFrom,
      }
    }
    const label = modelHit.makerScope
      ? `${modelHit.makerScope} ${modelHit.toCanonical}`
      : modelHit.toCanonical
    return {
      status: 'not_in_catalog',
      vehicleTerms: {},
      suggestedVehicleLabel: label,
      matchedFrom,
    }
  }

  // Só maker
  const makerCanon = makerHit!.toCanonical
  const inCatalog = findCatalogMaker(catalog, makerCanon)
  if (inCatalog) {
    return {
      status: 'exact',
      vehicleTerms: { maker: inCatalog },
      suggestedVehicleLabel: inCatalog,
      matchedFrom,
    }
  }
  return {
    status: 'not_in_catalog',
    vehicleTerms: {},
    suggestedVehicleLabel: makerCanon,
    matchedFrom,
  }
}
