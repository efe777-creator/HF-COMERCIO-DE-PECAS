/**
 * Orquestrador HF Search (Fase 3.2+).
 * Encadeia interpretador determinístico + search_products + aliases + assist Edge.
 */
import {
  invokeSearchAssist,
  isSearchAiAssistEnabled,
  noopInterpretation,
} from '@/services/ai/aiProvider'
import { shouldAssistWithAi } from '@/services/ai/aiTriggerRules'
import { buildLocalTypoInterpretation } from '@/services/ai/localTypoAssist'
import { mergeAssistInterpretation } from '@/services/ai/mergeAssistInterpretation'
import type { AISearchInterpretation, AIAssistReason, AISearchFilters } from '@/services/ai/types'
import type { ProductSearchParams, ProductSearchResult } from '@/types'
import { resolveVehicleAliasesFromQuery } from '@/services/vehicles/vehicleAliases'
import {
  applyIntentToSearchParams,
  buildCatalogSearchParams,
} from './buildCatalogSearchParams'
import {
  interpretSearchQuery,
  type SearchIntent,
  type VehicleCatalogEntry,
} from './interpretSearchQuery'
import { searchCatalog } from './searchService'

export type OrchestratorSearchArgs = {
  rawQuery: string
  catalog: VehicleCatalogEntry[]
  current: ProductSearchParams
  page?: number
  pageSize?: number
}

export type OrchestratorAssistPayload = {
  attempted: boolean
  reason: AIAssistReason | null
  interpretation: AISearchInterpretation | null
  suggestionLabel: string | null
}

export type OrchestratorSearchResult = {
  intent: SearchIntent
  effectiveParams: ProductSearchParams
  catalogResult: ProductSearchResult
  assist: OrchestratorAssistPayload
}

export async function runDeterministicCatalogSearch(
  args: OrchestratorSearchArgs,
): Promise<OrchestratorSearchResult> {
  const intent = interpretSearchQuery(args.rawQuery, args.catalog)
  const { catalogParams } = buildCatalogSearchParams(intent)
  const effectiveParams = applyIntentToSearchParams(
    args.current,
    catalogParams,
    intent.intentType,
  )

  const catalogResult = await searchCatalog({
    ...effectiveParams,
    page: args.page ?? 1,
    pageSize: args.pageSize ?? 24,
  })

  return {
    intent,
    effectiveParams,
    catalogResult,
    assist: {
      attempted: false,
      reason: null,
      interpretation: null,
      suggestionLabel: null,
    },
  }
}

function filtersFromCurrent(current: ProductSearchParams): AISearchFilters {
  return {
    maker: current.maker ?? undefined,
    model: current.model ?? undefined,
    year: current.year ?? undefined,
    engine: current.engine ?? undefined,
    version: current.version ?? undefined,
    brand: current.brand ?? undefined,
    category: current.category ?? undefined,
  }
}

function buildAliasInterpretation(
  rawQuery: string,
  catalog: VehicleCatalogEntry[],
): AISearchInterpretation | null {
  const alias = resolveVehicleAliasesFromQuery(rawQuery, catalog)
  if (alias.status === 'none') return null

  if (alias.status === 'exact') {
    const label = alias.suggestedVehicleLabel ?? ''
    const parts = rawQuery
      .trim()
      .split(/\s+/)
      .filter((tok) => {
        const k = normalizeLoose(tok)
        if (!k) return false
        // Remove tokens que bateram no alias (gm, hrv…)
        if (alias.matchedFrom && normalizeLoose(alias.matchedFrom) === k) return false
        if (alias.vehicleTerms.model && normalizeLoose(alias.vehicleTerms.model) === k) return false
        if (alias.vehicleTerms.maker && normalizeLoose(alias.vehicleTerms.maker) === k) return false
        return true
      })
    const productBits = parts.join(' ').trim()
    const corrected = [productBits, label].filter(Boolean).join(' ').trim() || rawQuery
    return {
      correctedQuery: corrected,
      productTerms: productBits ? [productBits] : [],
      vehicleTerms: alias.vehicleTerms,
      possibleProducts: [],
      confidenceLevel: 'high',
      needsClarification: !productBits,
      clarificationQuestion: !productBits
        ? `Encontramos ${label}. Qual peça você procura?`
        : undefined,
      status: productBits ? 'suggestion_available' : 'clarification_needed',
    }
  }

  // not_in_catalog
  return {
    correctedQuery: rawQuery.trim(),
    productTerms: [],
    vehicleTerms: {},
    possibleProducts: [],
    confidenceLevel: 'medium',
    needsClarification: false,
    vehicleRecognizedOutsideCatalog: true,
    suggestedVehicleLabel: alias.suggestedVehicleLabel ?? undefined,
    status: 'suggestion_available',
  }
}

function normalizeLoose(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleUpperCase('pt-BR')
    .replace(/[^A-Z0-9]/g, '')
}

/**
 * Se trigger + flag: tipografia → aliases → Edge; sanitiza. Sem auto-aplicar URL.
 */
export async function assistIfNeeded(
  intent: SearchIntent,
  resultTotal: number,
  rawQuery: string,
  opts: {
    catalog?: VehicleCatalogEntry[]
    current?: ProductSearchParams
  } = {},
): Promise<{
  shouldAssist: boolean
  reason: AIAssistReason | null
  interpretation: AISearchInterpretation | null
  suggestionLabel: string | null
}> {
  const gate = shouldAssistWithAi({ intent, resultTotal, rawQuery })
  if (!gate.assist || !gate.reason) {
    return { shouldAssist: false, reason: null, interpretation: null, suggestionLabel: null }
  }

  const catalog = opts.catalog ?? []

  // 1) Tipografia local
  const local = buildLocalTypoInterpretation(rawQuery, catalog)

  // 2) Aliases (colheita FAL) — antes da Edge
  const fromAlias = buildAliasInterpretation(rawQuery, catalog)
  if (fromAlias) {
    const mergedAlias = mergeAssistInterpretation(rawQuery, fromAlias, catalog)
    if (mergedAlias) {
      // Alias exact com veículo no catálogo: boa o suficiente; não gasta Gemini.
      if (
        !fromAlias.vehicleRecognizedOutsideCatalog &&
        (fromAlias.vehicleTerms.model || fromAlias.vehicleTerms.maker)
      ) {
        return {
          shouldAssist: true,
          reason: gate.reason,
          interpretation: mergedAlias.interpretation,
          suggestionLabel: mergedAlias.suggestionLabel,
        }
      }
      // Fora do catálogo: ainda pode enriquecer peça via Gemini se flag ligada.
      if (fromAlias.vehicleRecognizedOutsideCatalog && !isSearchAiAssistEnabled()) {
        return {
          shouldAssist: true,
          reason: gate.reason,
          interpretation: mergedAlias.interpretation,
          suggestionLabel: mergedAlias.suggestionLabel,
        }
      }
    }
  }

  if (!isSearchAiAssistEnabled()) {
    if (local) {
      const mergedLocal = mergeAssistInterpretation(rawQuery, local, catalog)
      if (mergedLocal) {
        return {
          shouldAssist: true,
          reason: gate.reason,
          interpretation: mergedLocal.interpretation,
          suggestionLabel: mergedLocal.suggestionLabel,
        }
      }
    }
    if (fromAlias) {
      const mergedAlias = mergeAssistInterpretation(rawQuery, fromAlias, catalog)
      if (mergedAlias) {
        return {
          shouldAssist: true,
          reason: gate.reason,
          interpretation: mergedAlias.interpretation,
          suggestionLabel: mergedAlias.suggestionLabel,
        }
      }
    }
    return {
      shouldAssist: true,
      reason: gate.reason,
      interpretation: noopInterpretation(rawQuery),
      suggestionLabel: null,
    }
  }

  // 3) Gemini (+ grounding na Edge)
  const raw = await invokeSearchAssist({
    query: rawQuery,
    filters: opts.current ? filtersFromCurrent(opts.current) : undefined,
    intentType: intent.intentType,
    deterministicIntent: intent,
    reason: gate.reason,
    resultTotal,
  })

  const fromGemini =
    raw.status !== 'provider_unavailable' && raw.status !== 'deterministic_required'
      ? mergeAssistInterpretation(rawQuery, raw, catalog)
      : null

  if (fromGemini) {
    // Preserva flag fora-cadastro do alias se Gemini não trouxe veículo.
    if (
      fromAlias?.vehicleRecognizedOutsideCatalog &&
      !fromGemini.interpretation.vehicleTerms.model &&
      !fromGemini.interpretation.vehicleRecognizedOutsideCatalog
    ) {
      fromGemini.interpretation.vehicleRecognizedOutsideCatalog = true
      fromGemini.interpretation.suggestedVehicleLabel =
        fromAlias.suggestedVehicleLabel ?? fromGemini.interpretation.suggestedVehicleLabel
      if (!fromGemini.suggestionLabel && fromAlias.suggestedVehicleLabel) {
        fromGemini.suggestionLabel = fromAlias.suggestedVehicleLabel
      }
    }
    return {
      shouldAssist: true,
      reason: gate.reason,
      interpretation: fromGemini.interpretation,
      suggestionLabel: fromGemini.suggestionLabel,
    }
  }

  // Fallback: alias fora do cadastro
  if (fromAlias) {
    const mergedAlias = mergeAssistInterpretation(rawQuery, fromAlias, catalog)
    if (mergedAlias) {
      return {
        shouldAssist: true,
        reason: gate.reason,
        interpretation: mergedAlias.interpretation,
        suggestionLabel: mergedAlias.suggestionLabel,
      }
    }
  }

  // Fallback tipográfico se Gemini key inválida / falhou.
  if (local) {
    const mergedLocal = mergeAssistInterpretation(rawQuery, local, catalog)
    if (mergedLocal) {
      return {
        shouldAssist: true,
        reason: gate.reason,
        interpretation: mergedLocal.interpretation,
        suggestionLabel: mergedLocal.suggestionLabel,
      }
    }
  }

  return {
    shouldAssist: true,
    reason: gate.reason,
    interpretation: raw,
    suggestionLabel: null,
  }
}

export async function runCatalogSearchWithAssistHook(
  args: OrchestratorSearchArgs,
): Promise<OrchestratorSearchResult> {
  const base = await runDeterministicCatalogSearch(args)
  const assist = await assistIfNeeded(base.intent, base.catalogResult.total, args.rawQuery, {
    catalog: args.catalog,
    current: args.current,
  })
  return {
    ...base,
    assist: {
      attempted: assist.shouldAssist,
      reason: assist.reason,
      interpretation: assist.interpretation,
      suggestionLabel: assist.suggestionLabel,
    },
  }
}
