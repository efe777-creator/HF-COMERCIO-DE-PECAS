import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { AISearchInput, AISearchInterpretation, SearchAssistResponse } from './types'

/**
 * Contrato de provedor — Gemini (default), OpenAI/Claude no futuro.
 * Credenciais ficam só no backend (Edge). O front nunca chama a API do provedor.
 */
export interface AIProvider {
  interpretSearch(input: AISearchInput): Promise<AISearchInterpretation>
}

/** Flag front: liga invoke da Edge. Key Gemini NÃO vai aqui. */
export function isSearchAiAssistEnabled(): boolean {
  try {
    return String(import.meta.env.VITE_SEARCH_NL_LLM ?? '') === '1'
  } catch {
    return false
  }
}

export function noopInterpretation(query: string): AISearchInterpretation {
  return {
    correctedQuery: query.trim(),
    productTerms: [],
    vehicleTerms: {},
    possibleProducts: [],
    confidenceLevel: 'low',
    needsClarification: false,
    status: 'deterministic_required',
  }
}

async function defaultEdgeInvoke(
  name: string,
  body: AISearchInput,
): Promise<SearchAssistResponse | null> {
  if (!isSupabaseConfigured || !supabase) return null
  const { data, error } = await supabase.functions.invoke(name, { body })
  if (error) return null
  return (data ?? null) as SearchAssistResponse | null
}

/**
 * Provider cliente que chama a Edge `search-assist`.
 */
export async function invokeSearchAssist(
  input: AISearchInput,
  invoke: (
    name: string,
    body: AISearchInput,
  ) => Promise<SearchAssistResponse | null> = defaultEdgeInvoke,
): Promise<AISearchInterpretation> {
  if (!isSearchAiAssistEnabled()) {
    return noopInterpretation(input.query)
  }
  try {
    const res = await invoke('search-assist', input)
    if (!res?.ok || !res.interpretation) {
      return {
        ...noopInterpretation(input.query),
        status: 'provider_unavailable',
      }
    }
    return res.interpretation
  } catch {
    return {
      ...noopInterpretation(input.query),
      status: 'provider_unavailable',
    }
  }
}
