import type { ProductSearchParams } from '@/types'
import type { SearchIntent } from './interpretSearchQuery'

export function buildCatalogSearchParams(intent: SearchIntent): {
  searchParams: URLSearchParams
  catalogParams: ProductSearchParams
} {
  const sp = new URLSearchParams()
  const catalogParams: ProductSearchParams = {}

  // Ambíguo: não inventa YMM; preserva q original no motor textual
  if (intent.intentType === 'ambiguous') {
    const q = (intent.productQuery ?? intent.raw.trim()) || null
    if (q) {
      sp.set('q', q)
      catalogParams.q = q
    }
    return { searchParams: sp, catalogParams }
  }

  const qFinal = intent.productQuery ?? intent.codeHint ?? null
  if (qFinal) {
    sp.set('q', qFinal)
    catalogParams.q = qFinal
  }

  const v = intent.vehicle
  if (v.maker) {
    sp.set('maker', v.maker)
    catalogParams.maker = v.maker
  }
  if (v.model) {
    sp.set('model', v.model)
    catalogParams.model = v.model
  }
  if (v.year) {
    sp.set('year', v.year)
    catalogParams.year = v.year
  }
  if (v.engine) {
    sp.set('engine', v.engine)
    catalogParams.engine = v.engine
  }
  if (v.version) {
    sp.set('version', v.version)
    catalogParams.version = v.version
  }
  if (v.maker || v.model || v.year || v.engine || v.version) {
    sp.set('vehicle', '1')
  }

  return { searchParams: sp, catalogParams }
}

export function intentHasVehicleParams(p: ProductSearchParams): boolean {
  return Boolean(
    p.maker?.trim() ||
      p.model?.trim() ||
      p.year?.trim() ||
      p.engine?.trim() ||
      p.version?.trim(),
  )
}

/**
 * Merge params de listagem com intent derivado de `q`.
 * Regra A: se o intent carrega veículo, ele vence YMM stale.
 * Regras B/C: só-texto / código preserva filtros YMM existentes.
 * Ambíguo: não altera YMM; só aplica q.
 */
export function applyIntentToSearchParams(
  params: ProductSearchParams,
  catalogParams: ProductSearchParams,
  intentType?: SearchIntent['intentType'],
): ProductSearchParams {
  if (intentType === 'ambiguous') {
    return {
      ...params,
      q: catalogParams.q !== undefined ? catalogParams.q : params.q,
    }
  }

  if (intentHasVehicleParams(catalogParams)) {
    return {
      ...params,
      maker: catalogParams.maker ?? null,
      model: catalogParams.model ?? null,
      year: catalogParams.year ?? null,
      engine: catalogParams.engine ?? null,
      version: catalogParams.version ?? null,
      q: catalogParams.q ?? null,
    }
  }

  return {
    ...params,
    q: catalogParams.q !== undefined ? catalogParams.q : params.q,
  }
}
