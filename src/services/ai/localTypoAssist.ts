import { normalizeEntityMatchKey } from '@/lib/entityNormalize'
import type { VehicleCatalogEntry } from '@/services/search/interpretSearchQuery'
import { editDistance } from './mergeAssistInterpretation'
import type { AISearchInterpretation } from './types'

/** Vocabulário de peça HF (correção local se Gemini falhar). */
const PRODUCT_TYPO_TARGETS = [
  'pivo',
  'pivô',
  'terminal',
  'axial',
  'amortecedor',
  'bandeja',
  'bieleta',
  'coxim',
  'bucha',
  'filtro',
  'pastilha',
  'disco',
  'embreagem',
  'ponteira',
  'barra',
]

function bestTypoFix(token: string, targets: string[]): string | null {
  const t = normalizeEntityMatchKey(token)
  if (t.length < 4) return null
  let best: { target: string; d: number } | null = null
  for (const target of targets) {
    const k = normalizeEntityMatchKey(target)
    if (t === k) return null
    // Evita CELTA→Bieleta: mesma inicial + distância curta.
    if (t[0] !== k[0]) continue
    const d = editDistance(t, k)
    const max = Math.min(2, Math.max(1, Math.floor(k.length / 4)))
    if (d > 0 && d <= max && (!best || d < best.d)) {
      best = { target, d }
    }
  }
  return best?.target ?? null
}

type ModelKey = { key: string; model: string; maker: string }

/**
 * Match de modelo por token: exact, ou fuzzy só se token ≥4 chars
 * (evita "ta"→KA com distância 1).
 */
function findModelForToken(tok: string, modelKeys: ModelKey[]): ModelKey | undefined {
  const k = normalizeEntityMatchKey(tok)
  if (!k) return undefined
  const exact = modelKeys.find((m) => m.key === k)
  if (exact) return exact
  if (k.length < 4) return undefined
  return modelKeys.find((m) => {
    const mk = m.key.replace(/\s/g, '')
    const kk = k.replace(/\s/g, '')
    if (!mk || mk[0] !== kk[0]) return false
    return editDistance(mk, kk) <= 1
  })
}

function findJoinedModel(
  a: string,
  b: string,
  modelKeys: ModelKey[],
): ModelKey | undefined {
  const compact = normalizeEntityMatchKey(a + b)
  const spaced = normalizeEntityMatchKey(`${a} ${b}`)
  return modelKeys.find((m) => m.key === compact || m.key === spaced)
}

/**
 * Correção tipográfica offline (Fase 3.2 fallback).
 * Ex.: Pivor HB20 → Pivô HB20; "cel ta" → CELTA (sem inventar KA).
 */
export function buildLocalTypoInterpretation(
  rawQuery: string,
  catalog: VehicleCatalogEntry[],
): AISearchInterpretation | null {
  const raw = rawQuery.trim()
  if (!raw) return null

  const tokens = raw.split(/\s+/).filter(Boolean)
  const modelKeys: ModelKey[] = catalog.map((c) => ({
    key: normalizeEntityMatchKey(c.model),
    model: c.model,
    maker: c.maker,
  }))
  const makerKeys = [...new Set(catalog.map((c) => c.maker))].map((m) => ({
    key: normalizeEntityMatchKey(m),
    maker: m,
  }))

  const productTerms: string[] = []
  const vehicleTerms: AISearchInterpretation['vehicleTerms'] = {}
  const outTokens: string[] = []
  let changed = false

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i]!

    // Colapsa par adjacente em modelo do catálogo ANTES do fuzzy
    // (cel+ta → CELTA; evita "ta"→KA).
    if (i < tokens.length - 1) {
      const joined = findJoinedModel(tok, tokens[i + 1]!, modelKeys)
      if (joined) {
        outTokens.push(joined.model)
        vehicleTerms.model = joined.model
        vehicleTerms.maker = joined.maker
        changed = true
        i += 1
        continue
      }
    }

    const modelHit = findModelForToken(tok, modelKeys)
    if (modelHit) {
      outTokens.push(modelHit.model)
      vehicleTerms.model = modelHit.model
      vehicleTerms.maker = modelHit.maker
      if (normalizeEntityMatchKey(tok) !== normalizeEntityMatchKey(modelHit.model)) {
        changed = true
      }
      continue
    }

    const k = normalizeEntityMatchKey(tok)
    const makerHit = makerKeys.find((m) => m.key === k)
    if (makerHit) {
      outTokens.push(makerHit.maker)
      vehicleTerms.maker = makerHit.maker
      continue
    }

    if (/^(19|20)\d{2}$/.test(k) || /^\d\.\d$/.test(k)) {
      if (/^(19|20)\d{2}$/.test(k)) vehicleTerms.year = k
      if (/^\d\.\d$/.test(k)) vehicleTerms.engine = k
      outTokens.push(tok)
      continue
    }

    const fix = bestTypoFix(tok, PRODUCT_TYPO_TARGETS)
    if (fix) {
      const display =
        fix === 'pivo' || fix === 'pivô'
          ? 'Pivô'
          : fix.charAt(0).toUpperCase() + fix.slice(1)
      productTerms.push(display)
      outTokens.push(display)
      changed = true
      continue
    }

    outTokens.push(tok)
  }

  if (!changed) return null

  const correctedQuery = outTokens.join(' ').replace(/\s+/g, ' ').trim()
  return {
    correctedQuery,
    productTerms,
    vehicleTerms,
    possibleProducts: productTerms,
    confidenceLevel: 'medium',
    needsClarification: false,
    status: 'suggestion_available',
  }
}
