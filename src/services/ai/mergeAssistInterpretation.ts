import { normalizeEntityMatchKey } from '@/lib/entityNormalize'
import type { SearchIntentVehicle, VehicleCatalogEntry } from '@/services/search/interpretSearchQuery'
import type { AISearchInterpretation } from './types'

/** Tokens significativos do productQuery precisam aparecer no raw (anti-alucinação estrita). */
export function productQuerySupportedByRaw(
  raw: string,
  productQuery: string | null | undefined,
): boolean {
  if (productQuery == null) return true
  const pq = productQuery.trim()
  if (!pq) return true
  const rawKey = normalizeEntityMatchKey(raw)
  const tokens = pq
    .split(/\s+/)
    .map((t) => normalizeEntityMatchKey(t))
    .filter((t) => t.length >= 2)
  if (!tokens.length) return true
  return tokens.every((t) => rawKey.includes(t))
}

/** Distância de edição simples (Levenshtein) — tipografia PT curta. */
export function editDistance(a: string, b: string): number {
  const s = normalizeEntityMatchKey(a)
  const t = normalizeEntityMatchKey(b)
  if (s === t) return 0
  const m = s.length
  const n = t.length
  if (!m) return n
  if (!n) return m
  const dp = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
    }
  }
  return dp[m][n]
}

/**
 * Aceita correção tipográfica óbvia (Pivor→Pivô, Termial→Terminal)
 * sem permitir peça totalmente inventada (I30→terminal).
 */
export function productTermSupportedByRawOrTypo(raw: string, term: string): boolean {
  const t = normalizeEntityMatchKey(term)
  if (t.length < 2) return true
  if (productQuerySupportedByRaw(raw, term)) return true
  const rawTokens = normalizeEntityMatchKey(raw)
    .split(/\s+/)
    .filter((x) => x.length >= 2)
  const maxDist = t.length <= 5 ? 2 : 3
  return rawTokens.some((rt) => {
    if (rt.includes(t) || t.includes(rt)) return Math.abs(rt.length - t.length) <= 2
    return editDistance(rt, t) <= maxDist
  })
}

export type VehicleValidationResult = {
  vehicleTerms: SearchIntentVehicle
  /** Maker/model da IA/web que não bateram no catálogo. */
  outsideCatalog: boolean
  suggestedVehicleLabel: string | null
}

function validateVehicle(
  vehicle: SearchIntentVehicle,
  catalog: VehicleCatalogEntry[],
): VehicleValidationResult {
  const out: SearchIntentVehicle = { ...vehicle }
  const rawLabelParts = [vehicle.maker, vehicle.model, vehicle.year].filter(Boolean)
  const rawLabel = rawLabelParts.length ? rawLabelParts.join(' ') : null

  if (!catalog.length) {
    const hadVehicle = Boolean(vehicle.maker || vehicle.model)
    delete out.maker
    delete out.model
    delete out.year
    delete out.engine
    delete out.version
    return {
      vehicleTerms: out,
      outsideCatalog: hadVehicle,
      suggestedVehicleLabel: hadVehicle ? rawLabel : null,
    }
  }

  let modelEntry: VehicleCatalogEntry | undefined
  if (out.model) {
    const key = normalizeEntityMatchKey(out.model)
    modelEntry = catalog.find((c) => normalizeEntityMatchKey(c.model) === key)
    if (modelEntry) {
      out.model = modelEntry.model
      out.maker = modelEntry.maker
    } else {
      delete out.model
      delete out.maker
      delete out.year
      delete out.engine
      delete out.version
      return {
        vehicleTerms: out,
        outsideCatalog: true,
        suggestedVehicleLabel: rawLabel,
      }
    }
  } else if (out.maker) {
    const makerKey = normalizeEntityMatchKey(out.maker)
    const makerOk = catalog.some((c) => normalizeEntityMatchKey(c.maker) === makerKey)
    if (!makerOk) {
      delete out.maker
      return {
        vehicleTerms: out,
        outsideCatalog: true,
        suggestedVehicleLabel: rawLabel,
      }
    }
  }

  if (out.version?.trim() && modelEntry?.versions?.length) {
    const vKey = normalizeEntityMatchKey(out.version)
    const canon = modelEntry.versions.find((v) => normalizeEntityMatchKey(v) === vKey)
    if (canon) out.version = canon
    else delete out.version
  } else if (out.version?.trim() && modelEntry && !modelEntry.versions?.length) {
    delete out.version
  }

  return { vehicleTerms: out, outsideCatalog: false, suggestedVehicleLabel: null }
}

export type MergedAssistResult = {
  interpretation: AISearchInterpretation
  /** true se correctedQuery difere do raw (vale mostrar banner). */
  differsFromRaw: boolean
  suggestionLabel: string | null
}

/**
 * Sanitiza saída da Edge/alias contra catálogo + anti-alucinação tipográfica.
 * Não altera URL — só prepara sugestão para Aceitar/Rejeitar.
 */
export function mergeAssistInterpretation(
  rawQuery: string,
  assist: AISearchInterpretation | null | undefined,
  catalog: VehicleCatalogEntry[],
): MergedAssistResult | null {
  if (!assist) return null
  if (
    assist.status === 'deterministic_required' ||
    assist.status === 'provider_unavailable' ||
    assist.status === 'no_change'
  ) {
    return null
  }

  const raw = rawQuery.trim()
  let corrected = (assist.correctedQuery || raw).trim() || raw

  const validated = validateVehicle({ ...assist.vehicleTerms }, catalog)
  const vehicleTerms = validated.vehicleTerms

  const outsideFromAssist = Boolean(assist.vehicleRecognizedOutsideCatalog)
  const vehicleRecognizedOutsideCatalog =
    validated.outsideCatalog || outsideFromAssist
  const suggestedVehicleLabel =
    validated.suggestedVehicleLabel ||
    assist.suggestedVehicleLabel?.trim() ||
    undefined

  const productTerms = (assist.productTerms ?? []).filter((t) =>
    productTermSupportedByRawOrTypo(raw, t),
  )

  // correctedQuery: se peça inventada no corrected, reverte para raw.
  const correctedProductBits = productTerms.length
    ? productTerms
    : corrected
        .split(/\s+/)
        .filter((tok) => {
          const k = normalizeEntityMatchKey(tok)
          if (k.length < 3) return false
          const isVehicle =
            catalog.some((c) => normalizeEntityMatchKey(c.model) === k) ||
            catalog.some((c) => normalizeEntityMatchKey(c.maker) === k) ||
            /^(19|20)\d{2}$/.test(k) ||
            /^\d\.\d$/.test(k)
          if (isVehicle) return true
          return productTermSupportedByRawOrTypo(raw, tok)
        })

  if (!correctedProductBits.length && normalizeEntityMatchKey(corrected) !== normalizeEntityMatchKey(raw)) {
    if (editDistance(corrected, raw) > Math.max(3, Math.floor(raw.length * 0.35))) {
      corrected = raw
    }
  }

  const possibleProducts = (assist.possibleProducts ?? []).filter((p) =>
    productTermSupportedByRawOrTypo(raw, p),
  )

  const interpretation: AISearchInterpretation = {
    ...assist,
    correctedQuery: corrected,
    productTerms,
    vehicleTerms,
    possibleProducts,
    vehicleRecognizedOutsideCatalog: vehicleRecognizedOutsideCatalog || undefined,
    suggestedVehicleLabel: vehicleRecognizedOutsideCatalog
      ? suggestedVehicleLabel
      : undefined,
    status:
      assist.needsClarification || assist.status === 'clarification_needed'
        ? 'clarification_needed'
        : 'suggestion_available',
  }

  const differsFromRaw =
    normalizeEntityMatchKey(corrected) !== normalizeEntityMatchKey(raw) ||
    productTerms.length > 0 ||
    Boolean(vehicleTerms.model || vehicleTerms.maker) ||
    vehicleRecognizedOutsideCatalog ||
    interpretation.needsClarification

  if (!differsFromRaw) return null

  let suggestionLabel: string | null = null
  if (interpretation.needsClarification) {
    suggestionLabel = interpretation.clarificationQuestion?.trim() || null
  } else if (vehicleRecognizedOutsideCatalog && suggestedVehicleLabel) {
    suggestionLabel = suggestedVehicleLabel
  } else if (corrected !== raw) {
    suggestionLabel = corrected
  } else {
    suggestionLabel = productTerms[0] ?? possibleProducts[0] ?? null
  }

  return { interpretation, differsFromRaw, suggestionLabel }
}
