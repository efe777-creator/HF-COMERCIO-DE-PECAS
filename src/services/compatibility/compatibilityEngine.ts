import { normalizeEntityMatchKey } from '@/lib/entityNormalize'
import { yearMatchesVehicleApp } from '@/lib/vehicleAppYear'
import type { CompatibilityAppGroup, VehicleFilter } from '@/types'

/** Estados oficiais P1 — default seguro = não confirmada. */
export type CompatibilityState = 'confirmed' | 'probable' | 'unconfirmed'

export type CompatibilityEvidence = {
  code: string
  detail: string
}

export type CompatibilityVerdict = {
  state: CompatibilityState
  label: string
  evidences: CompatibilityEvidence[]
}

export type VehicleCompatInput = {
  maker?: string | null
  model?: string | null
  year?: number | string | null
  engine?: string | null
  version?: string | null
  versionId?: string | null
}

export type PvcCompatRow = {
  maker?: string | null
  model?: string | null
  yearStart?: number | null
  yearEnd?: number | null
  versionYear?: number | null
  engine?: string | null
  versionName?: string | null
  vehicleVersionId?: string | null
}

const STATE_LABEL: Record<CompatibilityState, string> = {
  confirmed: 'Compatibilidade confirmada',
  probable: 'Compatibilidade provável',
  unconfirmed: 'Compatibilidade não confirmada',
}

function norm(v: string | null | undefined): string {
  return (v ?? '').trim().toLowerCase()
}

function parseYear(raw: number | string | null | undefined): number | null {
  if (raw == null || raw === '') return null
  const n = typeof raw === 'number' ? raw : Number(String(raw).trim())
  return Number.isFinite(n) ? n : null
}

export function vehicleFilterToCompatInput(filter: VehicleFilter | null | undefined): VehicleCompatInput | null {
  if (!filter) return null
  if (!filter.maker?.trim() || !filter.model?.trim()) return null
  return {
    maker: filter.maker,
    model: filter.model,
    year: filter.year,
    engine: filter.engine,
    version: filter.version,
    versionId: filter.versionId,
  }
}

/** Converte grupos de vitrine em evidência fraca (sem year_start/end) — no máx. provável se só maker+model. */
export function appGroupsToPvcRows(groups: CompatibilityAppGroup[] | undefined | null): PvcCompatRow[] {
  if (!groups?.length) return []
  const rows: PvcCompatRow[] = []
  for (const g of groups) {
    for (const line of g.lines) {
      rows.push({
        maker: g.maker,
        model: line.model === '—' ? null : line.model,
        engine: line.engine,
        versionName: line.version,
        yearStart: null,
        yearEnd: null,
        versionYear: null,
        vehicleVersionId: null,
      })
    }
  }
  return rows
}

type RowFit = 'full' | 'partial' | 'none'

function fitRow(vehicle: VehicleCompatInput, row: PvcCompatRow): {
  fit: RowFit
  evidences: CompatibilityEvidence[]
} {
  const evidences: CompatibilityEvidence[] = []
  if (norm(vehicle.maker) !== norm(row.maker) || norm(vehicle.model) !== norm(row.model)) {
    return { fit: 'none', evidences }
  }
  evidences.push({
    code: 'maker_model',
    detail: `Aplicação ${row.maker} ${row.model}`,
  })

  const matches: string[] = []
  const missing: string[] = []

  const yearNum = parseYear(vehicle.year)
  const hasPvcYear =
    row.yearStart != null || row.yearEnd != null || row.versionYear != null

  if (yearNum != null && hasPvcYear) {
    if (
      yearMatchesVehicleApp(yearNum, row.yearStart, row.yearEnd, row.versionYear ?? null)
    ) {
      matches.push('year')
      evidences.push({ code: 'year', detail: `Ano ${yearNum} no período da aplicação` })
    } else {
      return { fit: 'none', evidences: [] }
    }
  } else if (yearNum == null && hasPvcYear) {
    missing.push('year')
    evidences.push({
      code: 'year_missing',
      detail: 'Aplicação tem período de ano; veículo sem ano informado',
    })
  }

  const pvcEngine = norm(row.engine)
  const vehEngine = norm(vehicle.engine)
  if (pvcEngine && vehEngine) {
    if (pvcEngine === vehEngine) {
      matches.push('engine')
      evidences.push({ code: 'engine', detail: `Motor ${row.engine}` })
    } else {
      return { fit: 'none', evidences: [] }
    }
  } else if (pvcEngine && !vehEngine) {
    missing.push('engine')
    evidences.push({
      code: 'engine_missing',
      detail: 'Aplicação exige motor; veículo sem motor informado',
    })
  }

  const pvcVersion = norm(row.versionName)
  const vehVersion = norm(vehicle.version)
  const pvcVid = norm(row.vehicleVersionId)
  const vehVid = norm(vehicle.versionId)
  let versionMatched = false

  if (pvcVid && vehVid && pvcVid === vehVid) {
    matches.push('versionId')
    versionMatched = true
    evidences.push({ code: 'version_id', detail: 'Mesmo version_id da aplicação' })
  }
  if (pvcVersion && vehVersion) {
    if (pvcVersion === vehVersion) {
      matches.push('version')
      versionMatched = true
      evidences.push({ code: 'version', detail: `Versão ${row.versionName}` })
    } else if (!versionMatched) {
      return { fit: 'none', evidences: [] }
    }
  } else if ((pvcVersion || pvcVid) && !vehVersion && !vehVid) {
    missing.push('version')
    evidences.push({
      code: 'version_missing',
      detail: 'Aplicação tem versão; veículo sem versão vinculada',
    })
  }

  if (missing.length) return { fit: 'partial', evidences }

  // version_id sozinho não basta para confirmada
  const strong = matches.filter((m) => m !== 'versionId')
  if (strong.length >= 1) return { fit: 'full', evidences }
  if (matches.includes('versionId')) return { fit: 'partial', evidences }

  // só maker+model → parcial (evidência insuficiente)
  evidences.push({
    code: 'maker_model_only',
    detail: 'Só montadora/modelo — faltam ano, motor ou versão para confirmar',
  })
  return { fit: 'partial', evidences }
}

/**
 * Motor técnico de compatibilidade (G5 / R3).
 * Frontend só renderiza o veredito — não inventa estado.
 */
export function classifyCompatibility(
  vehicle: VehicleCompatInput | null | undefined,
  pvcRows: PvcCompatRow[] | null | undefined,
): CompatibilityVerdict {
  if (!vehicle?.maker?.trim() || !vehicle?.model?.trim()) {
    return {
      state: 'unconfirmed',
      label: STATE_LABEL.unconfirmed,
      evidences: [
        {
          code: 'no_vehicle',
          detail: 'Sem veículo ativo com montadora e modelo',
        },
      ],
    }
  }

  const rows = pvcRows ?? []
  if (!rows.length) {
    return {
      state: 'unconfirmed',
      label: STATE_LABEL.unconfirmed,
      evidences: [
        {
          code: 'no_pvc',
          detail: 'Produto sem aplicações PVC cadastradas',
        },
      ],
    }
  }

  let best: RowFit = 'none'
  let bestEvidence: CompatibilityEvidence[] = []

  for (const row of rows) {
    const { fit, evidences } = fitRow(vehicle, row)
    if (fit === 'full') {
      return {
        state: 'confirmed',
        label: STATE_LABEL.confirmed,
        evidences,
      }
    }
    if (fit === 'partial' && best !== 'partial') {
      best = 'partial'
      bestEvidence = evidences
    }
  }

  if (best === 'partial') {
    return {
      state: 'probable',
      label: STATE_LABEL.probable,
      evidences: bestEvidence,
    }
  }

  return {
    state: 'unconfirmed',
    label: STATE_LABEL.unconfirmed,
    evidences: [
      {
        code: 'no_intersection',
        detail: 'Nenhuma aplicação PVC cruza com o veículo informado',
      },
    ],
  }
}

/** Copy E.1 do card — independente das labels longas do motor/PDP. */
export type CardSealKind = 'compatible' | 'similar' | 'check' | 'hide'

export type CardSeal = {
  kind: CardSealKind
  label: string
  micro?: string
}

export function resolveCardSeal(
  verdict: CompatibilityVerdict | null | undefined,
): CardSeal {
  if (!verdict) return { kind: 'hide', label: '' }
  if (verdict.state === 'confirmed') return { kind: 'compatible', label: 'Compatível' }
  if (verdict.state === 'probable') {
    return { kind: 'similar', label: 'Compatível', micro: 'similar' }
  }
  if (verdict.evidences.some((e) => e.code === 'no_intersection')) {
    return { kind: 'hide', label: 'Incompatível' }
  }
  return { kind: 'check', label: 'A verificar' }
}

export function cardSealRank(kind: CardSealKind): number {
  if (kind === 'compatible') return 0
  if (kind === 'similar') return 1
  if (kind === 'check') return 2
  return 99
}

/** Pontuação M25 — maker+model base; +ano/motor/versão. */
export function fitSpecificityScore(filter: VehicleFilter | null | undefined): number {
  if (!filter?.maker?.trim() || !filter?.model?.trim()) return 0
  let score = 2
  if (filter.year?.trim()) score += 1
  if (filter.engine?.trim()) score += 1
  if (filter.version?.trim() || filter.versionId?.trim()) score += 1
  return score
}

/**
 * M25: chip/sessão vs URL da tela.
 * Conflito maker/model (ex.: busca Cerato com garagem HB20): **página vence** —
 * senão a grade esconde peças “do carro errado” e parece busca quebrada.
 * Mesmo veículo: desempate por especificidade; empate → chip.
 */
export function resolveFitContext(
  chipFilter: VehicleFilter | null | undefined,
  pageFilter: VehicleFilter | null | undefined,
): VehicleFilter | null {
  const chipScore = fitSpecificityScore(chipFilter)
  const pageScore = fitSpecificityScore(pageFilter)
  if (chipScore === 0 && pageScore === 0) return null

  if (chipScore > 0 && pageScore > 0 && chipFilter && pageFilter) {
    const sameVehicle =
      normalizeEntityMatchKey(chipFilter.maker) === normalizeEntityMatchKey(pageFilter.maker) &&
      normalizeEntityMatchKey(chipFilter.model) === normalizeEntityMatchKey(pageFilter.model)
    if (!sameVehicle) return pageFilter
  }

  if (pageScore > chipScore) return pageFilter ?? null
  if (chipScore > 0) return chipFilter ?? null
  return pageFilter ?? null
}

/**
 * @deprecated Preferir classifyCardCompatibility — apps fraca não eleva selo.
 * Mantido para testes legados: PVC se houver; senão apps.
 */
export function resolveCardEvidence(
  pvcRows: PvcCompatRow[] | null | undefined,
  groups: CompatibilityAppGroup[] | null | undefined,
): PvcCompatRow[] {
  if (pvcRows && pvcRows.length > 0) return pvcRows
  return appGroupsToPvcRows(groups)
}

/**
 * Classificação do selo no card (E.1 honesto):
 * - Com PVC → motor G5 normal (Compatível / similar / hide).
 * - Sem PVC → sempre A verificar (nunca confirmed/similar via apps fraca).
 */
export function classifyCardCompatibility(
  vehicle: VehicleCompatInput | null | undefined,
  pvcRows: PvcCompatRow[] | null | undefined,
): CompatibilityVerdict {
  if (pvcRows && pvcRows.length > 0) {
    return classifyCompatibility(vehicle, pvcRows)
  }
  if (!vehicle?.maker?.trim() || !vehicle?.model?.trim()) {
    return classifyCompatibility(vehicle, [])
  }
  return {
    state: 'unconfirmed',
    label: STATE_LABEL.unconfirmed,
    evidences: [
      {
        code: 'no_pvc',
        detail: 'Sem aplicação PVC completa — compatibilidade a verificar',
      },
    ],
  }
}
