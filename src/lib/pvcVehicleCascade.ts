import type { VehicleVersion } from '@/types'

/** Copy única — hub Aplicações + ficha produto + Veículos. */
export const PVC_CASCADE_HINT =
  'Veículo cadastra: montadora → modelo → versão → motor → período (+ geração/combustível só se precisar). Aplicação vincula o produto a versão · motor · período já cadastrados. Período do veículo = anos da combinação no carro; período da aplicação = anos em que a peça serve. Campo vazio = coringa.'

export const VEHICLE_HIERARCHY_SHORT =
  'Montadora → Modelo → Versão → Motor → Período (+ Geração/Combustível opcionais)'

export type VehicleIdentityParts = {
  maker?: string | null
  model?: string | null
  generation?: string | null
  version?: string | null
  engine?: string | null
  fuel?: string | null
  /**
   * Se true, versão/motor vazios viram “todas…”.
   * Geração e combustível só entram se preenchidos (nunca “todas gerações” por default).
   */
  wildcards?: boolean
}

/** Rótulo canônico: Montadora · Modelo · Versão · Motor · [Combustível] · [Geração]. */
export function formatVehicleIdentity(parts: VehicleIdentityParts): string {
  const out: string[] = []
  const maker = parts.maker?.trim()
  const model = parts.model?.trim()
  if (maker) out.push(maker)
  if (model) out.push(model)

  const version = parts.version?.trim() ?? ''
  const engine = parts.engine?.trim() ?? ''
  const fuel = parts.fuel?.trim() ?? ''
  const generation = parts.generation?.trim() ?? ''
  const wild = Boolean(parts.wildcards)

  if (version) out.push(version)
  else if (wild) out.push('todas versões')

  if (engine) out.push(engine)
  else if (wild) out.push('todos motores')

  if (fuel) out.push(fuel)

  if (generation) out.push(generation)

  return out.join(' · ')
}

/** Identidade da config: versão · motor · [fuel] · [geração] [· período]. */
export function formatVehicleConfigIdentity(
  v: Pick<VehicleVersion, 'generation' | 'versionName' | 'engine' | 'fuel'> & {
    year?: number | null
    yearStart?: number | null
    yearEnd?: number | null
  },
  opts?: { includeYear?: boolean; includeGenerationWildcard?: boolean },
): string {
  const gen = v.generation?.trim() || null
  const base = formatVehicleIdentity({
    generation: opts?.includeGenerationWildcard ? (gen ?? '') : gen || undefined,
    version: v.versionName,
    engine: v.engine,
    fuel: v.fuel,
    wildcards: true,
  })
  if (!opts?.includeYear) return base
  const start = v.yearStart ?? v.year ?? null
  const end = v.yearEnd ?? null
  if (start == null && end == null) return base
  if (start != null && end != null) {
    if (start === end) return `${base} · ${start}`
    return `${base} · ${start}–${end}`
  }
  if (start != null) return `${base} · ${start}–…`
  return `${base} · …–${end}`
}

/** @deprecated use formatVehicleConfigIdentity */
export function pvcConfigLabel(v: VehicleVersion): string {
  return formatVehicleConfigIdentity(v, { includeYear: true })
}

export function pvcGenerationOptions(versions: VehicleVersion[]): string[] {
  const set = new Set<string>()
  for (const v of versions) {
    const g = (v.generation ?? '').trim()
    if (g) set.add(g)
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

/** Versões distintas (filtros opcionais de motor/fuel/geração). */
export function pvcVersionNameOptions(
  versions: VehicleVersion[],
  generation = '',
  engine = '',
  fuel = '',
): string[] {
  const filtered = versions.filter((v) => {
    if (generation && (v.generation ?? '').trim() !== generation) return false
    if (engine && (v.engine ?? '').trim() !== engine) return false
    if (fuel && (v.fuel ?? '').trim() !== fuel) return false
    return true
  })
  const set = new Set<string>()
  for (const v of filtered) {
    const name = (v.versionName ?? '').trim()
    if (name) set.add(name)
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

/** Motores distintos após versão (+ filtros opcionais). */
export function pvcEngineOptions(
  versions: VehicleVersion[],
  generation = '',
  versionName = '',
  fuel = '',
): string[] {
  const filtered = versions.filter((v) => {
    if (generation && (v.generation ?? '').trim() !== generation) return false
    if (versionName && (v.versionName ?? '').trim() !== versionName) return false
    if (fuel && (v.fuel ?? '').trim() !== fuel) return false
    return true
  })
  const set = new Set<string>()
  for (const v of filtered) {
    const e = (v.engine ?? '').trim()
    if (e) set.add(e)
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

/** Combustíveis distintos após versão + motor (+ geração opcional). */
export function pvcFuelOptions(
  versions: VehicleVersion[],
  generation = '',
  versionName = '',
  engine = '',
): string[] {
  const filtered = versions.filter((v) => {
    if (generation && (v.generation ?? '').trim() !== generation) return false
    if (versionName && (v.versionName ?? '').trim() !== versionName) return false
    if (engine && (v.engine ?? '').trim() !== engine) return false
    return true
  })
  const set = new Set<string>()
  for (const v of filtered) {
    const f = (v.fuel ?? '').trim()
    if (f) set.add(f)
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

/** Match: versão → motor → (geração/combustível se preenchidos). */
export function pvcMatchingVersions(
  versions: VehicleVersion[],
  generation: string,
  versionName: string,
  engine: string,
  fuel = '',
): VehicleVersion[] {
  return versions.filter((v) => {
    if (generation && (v.generation ?? '').trim() !== generation) return false
    if (versionName && (v.versionName ?? '').trim() !== versionName) return false
    if (engine && (v.engine ?? '').trim() !== engine) return false
    if (fuel && (v.fuel ?? '').trim() !== fuel) return false
    return true
  })
}

/** Filtro local por qualquer termo nos campos da config. */
export function pvcConfigMatchesTerm(
  v: Pick<VehicleVersion, 'generation' | 'versionName' | 'engine' | 'fuel'>,
  term: string,
): boolean {
  const t = term.trim().toLowerCase()
  if (!t) return true
  const hay = [v.generation, v.versionName, v.engine, v.fuel, formatVehicleConfigIdentity(v)]
    .map((x) => (x ?? '').toLowerCase())
    .join(' ')
  return hay.includes(t)
}
