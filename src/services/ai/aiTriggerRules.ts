import type { SearchIntent } from '@/services/search/interpretSearchQuery'
import type { AIAssistReason } from './types'

export type AiTriggerContext = {
  intent: SearchIntent
  resultTotal: number
  /** Query bruta (para heurística informal). */
  rawQuery?: string
}

const INFORMAL_HINT =
  /\b(preciso|quero|tem|serve|liga|borracha|aquela|aquele|pe[cç]a que)\b/i

/**
 * Decide se a camada IA deve ser consultada.
 * Critérios no backend/orquestrador — não espalhar na UI.
 */
export function shouldAssistWithAi(ctx: AiTriggerContext): {
  assist: boolean
  reason: AIAssistReason | null
} {
  const { intent, resultTotal, rawQuery } = ctx

  // Código / code_search: busca convencional.
  if (intent.intentType === 'code_search' || intent.codeHint) {
    return { assist: false, reason: null }
  }

  if (intent.intentType === 'ambiguous' || intent.clarification === 'ambiguous') {
    return { assist: true, reason: 'ambiguous' }
  }

  const q = rawQuery ?? intent.raw
  if (INFORMAL_HINT.test(q) && (intent.intentType === 'product_only' || intent.intentType === 'unknown')) {
    return { assist: true, reason: 'informal_description' }
  }

  if (resultTotal === 0) {
    if (intent.intentType === 'unknown') {
      return { assist: true, reason: 'unknown_intent' }
    }
    return { assist: true, reason: 'no_results' }
  }

  // Hits suficientes com intent conhecido: não gasta LLM.
  if (intent.intentType !== 'unknown') {
    return { assist: false, reason: null }
  }

  return { assist: true, reason: 'unknown_intent' }
}
