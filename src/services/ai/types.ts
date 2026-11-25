import type { SearchIntent, SearchIntentType, SearchIntentVehicle } from '@/services/search/interpretSearchQuery'

/** Origem do filtro — prioridade: manual > texto > IA > herdado. */
export type FilterProvenance = 'manual' | 'text' | 'ai_suggestion' | 'inherited'

export type AISearchFilters = {
  maker?: string
  model?: string
  year?: string
  engine?: string
  version?: string
  brand?: string
  category?: string
}

export type AISearchFilterProvenance = Partial<Record<keyof AISearchFilters, FilterProvenance>>

/** Motivo configurável para acionar a camada IA. */
export type AIAssistReason =
  | 'no_results'
  | 'unknown_intent'
  | 'low_confidence'
  | 'informal_description'
  | 'ambiguous'
  | 'typo_suspected'
  | 'manual_request'

export type AISearchInput = {
  query: string
  filters?: AISearchFilters
  /** Proveniência dos filtros (opcional na 3.1; obrigatório preservar manual na 3.3). */
  filterProvenance?: AISearchFilterProvenance
  intentType?: SearchIntentType
  /** Intent determinístico já calculado (Etapa 2). */
  deterministicIntent?: SearchIntent
  reason: AIAssistReason
  /** total da última busca convencional (0 = sem hits). */
  resultTotal?: number
}

export type AISearchInterpretation = {
  correctedQuery: string
  productTerms: string[]
  vehicleTerms: SearchIntentVehicle
  possibleProducts: string[]
  confidenceLevel: 'high' | 'medium' | 'low'
  needsClarification: boolean
  clarificationQuestion?: string
  /**
   * Web/alias reconheceu o carro, mas não existe no catálogo HF.
   * UI mostra aviso; não aplicar maker/model.
   */
  vehicleRecognizedOutsideCatalog?: boolean
  /** Label só para display (ex.: "Honda HR-V"). */
  suggestedVehicleLabel?: string
  /** Status operacional para a UI inline. */
  status:
    | 'suggestion_available'
    | 'clarification_needed'
    | 'no_change'
    | 'deterministic_required'
    | 'provider_unavailable'
}

/** Resposta tipada da Edge `search-assist`. */
export type SearchAssistResponse = {
  ok: boolean
  mode: 'gemini' | 'noop' | 'deterministic_required' | 'llm_failed' | 'empty'
  interpretation: AISearchInterpretation | null
  message?: string
}
