import { normalizeEntityMatchKey } from '@/lib/entityNormalize'

export type SearchIntentVehicle = {
  maker?: string
  model?: string
  year?: string
  engine?: string
  version?: string
}

export type SearchIntentType =
  | 'vehicle_only'
  | 'product_only'
  | 'product_vehicle'
  | 'code_search'
  | 'ambiguous'
  | 'unknown'

export type SearchMatchedEntity = {
  type: 'maker' | 'model' | 'version' | 'year' | 'engine' | 'product' | 'code'
  originalText: string
  matchedValue: string
  matchType: 'exact' | 'alias'
}

export type SearchIntent = {
  raw: string
  normalizedQuery: string
  intentType: SearchIntentType
  productQuery: string | null
  codeHint?: string
  vehicle: SearchIntentVehicle
  matchedEntities: SearchMatchedEntity[]
  needsClarification: boolean
  clarification?: 'engine' | 'version' | 'year' | 'model' | 'product' | 'ambiguous'
}

export type VehicleCatalogEntry = {
  maker: string
  model: string
  /** version_name ativos do modelo (se vazio, versão só por allowlist fraca). */
  versions?: string[]
}

const YEAR_RE = /^(19|20)\d{2}$/
const ENGINE_RE = /^\d\.\d$/
/** Refs/SKU com ≥3 dígitos (PVI0311); evita HB20 / Onix etc. */
const CODE_RE = /^[A-Za-z]{2,}\d{3,}[A-Za-z0-9\-]*$/

/** Vocabulário HF — suspensão, direção, freios (+ atributos que entram só no q). */
const PRODUCT_WORDS = new Set(
  [
    'terminal',
    'ponteira',
    'pivo',
    'pivô',
    'axial',
    'barra',
    'amortecedor',
    'amort',
    'shock',
    'bandeja',
    'braco',
    'braço',
    'filtro',
    'oleo',
    'óleo',
    'pastilha',
    'disco',
    'embreagem',
    'kit',
    'direcao',
    'direção',
    'suspensao',
    'suspensão',
    'coxim',
    'bucha',
    'bieleta',
    'freio',
    'freios',
    'dianteiro',
    'traseiro',
    'direito',
    'esquerdo',
    'completo',
    'parcial',
  ].map((w) => normalizeEntityMatchKey(w)),
)

const PRODUCT_ALIAS_DISPLAY: Record<string, string> = {
  [normalizeEntityMatchKey('pivo')]: 'pivô',
  [normalizeEntityMatchKey('amort')]: 'amortecedor',
  [normalizeEntityMatchKey('braco')]: 'bandeja',
  [normalizeEntityMatchKey('braço')]: 'bandeja',
}

const STOP_WORDS = new Set(
  [
    'preciso',
    'precisa',
    'quero',
    'queria',
    'busco',
    'procurando',
    'tem',
    'voce',
    'você',
    'me',
    'um',
    'uma',
    'uns',
    'umas',
    'o',
    'a',
    'os',
    'as',
    'de',
    'do',
    'da',
    'dos',
    'das',
    'para',
    'pro',
    'pra',
    'no',
    'na',
    'nos',
    'nas',
    'em',
    'com',
    'por',
    'meu',
    'minha',
    'seu',
    'sua',
    'esse',
    'essa',
    'este',
    'esta',
    'algo',
    'algum',
    'alguma',
    'peça',
    'peca',
    'peças',
    'pecas',
  ].map((w) => normalizeEntityMatchKey(w)),
)

/** Allowlist fraca de acabamento — match canônico = versions do cadastro. */
const VERSION_WORDS = new Set(
  [
    'one',
    'unique',
    'comfort',
    'premium',
    'sense',
    'vision',
    'style',
    'sport',
    'plus',
    'max',
    'diamond',
    'evolution',
    'high',
    'se',
    'lt',
    'ltz',
    'joy',
    'attraction',
    'ambition',
    'trendline',
    'highline',
    'comfortline',
  ].map((w) => normalizeEntityMatchKey(w)),
)

const BRAND_WORDS = new Set(
  ['nakata', 'cofap', 'monroe', 'trw', 'skf', 'ina', 'luk', 'bosch', 'ngk', 'mahle', 'hf'].map((w) =>
    normalizeEntityMatchKey(w),
  ),
)

const PROTECTED_CHILD_SUFFIX = new Set(
  [
    'cross',
    'fox',
    'plus',
    'up',
    'beetle',
    'ecosport',
    'fiesta',
    'ka',
    'fit',
    'pallas',
    'sedan',
    'variant',
  ].map((w) => normalizeEntityMatchKey(w)),
)

const PROTECTED_PARENT_PREFIX = new Set(
  ['new', 'cross', 't'].map((w) => normalizeEntityMatchKey(w)),
)

function tokenize(raw: string): string[] {
  return raw
    .trim()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean)
}

function isLikelyProductWord(token: string): boolean {
  return PRODUCT_WORDS.has(normalizeEntityMatchKey(token))
}

function displayProductToken(token: string): string {
  const key = normalizeEntityMatchKey(token)
  return PRODUCT_ALIAS_DISPLAY[key] ?? token
}

function emptyIntent(raw: string, normalizedQuery = ''): SearchIntent {
  return {
    raw,
    normalizedQuery,
    intentType: 'unknown',
    productQuery: null,
    vehicle: {},
    matchedEntities: [],
    needsClarification: false,
  }
}

function resolveIntentType(args: {
  ambiguous: boolean
  codeHint?: string
  hasVehicle: boolean
  hasProductEntity: boolean
  productQuery: string | null
}): SearchIntentType {
  if (args.ambiguous) return 'ambiguous'
  if (args.codeHint && !args.hasVehicle) return 'code_search'
  if (args.hasVehicle && (args.hasProductEntity || Boolean(args.productQuery))) {
    return 'product_vehicle'
  }
  if (args.hasVehicle) return 'vehicle_only'
  if (args.codeHint) return 'code_search'
  if (args.hasProductEntity) return 'product_only'
  return 'unknown'
}

type Hit = {
  kind: 'hit'
  maker: string
  model: string
  start: number
  len: number
}

type Ambiguous = {
  kind: 'ambiguous'
  modelLabel: string
  start: number
  len: number
  candidates: Array<{ maker: string; model: string }>
}

function isProtectedCompoundBlocked(
  tokens: string[],
  modelStart: number,
  modelEnd: number,
  modelKey: string,
  catalogModelKeys: string[],
): boolean {
  const keySet = new Set(catalogModelKeys)
  const next = tokens[modelEnd + 1]
  if (next) {
    const nextKey = normalizeEntityMatchKey(next)
    const compound = `${modelKey} ${nextKey}`
    if (!keySet.has(compound)) {
      if (PROTECTED_CHILD_SUFFIX.has(nextKey)) return true
      if (
        nextKey === 'SPORT' &&
        catalogModelKeys.some((k) => k.startsWith(`${compound} `))
      ) {
        return true
      }
    }
  }
  const prev = tokens[modelStart - 1]
  if (prev) {
    const prevKey = normalizeEntityMatchKey(prev)
    if (PROTECTED_PARENT_PREFIX.has(prevKey)) {
      const compound = `${prevKey} ${modelKey}`
      const compoundTight = `${prevKey}-${modelKey}`
      if (!keySet.has(compound) && !keySet.has(compoundTight)) return true
    }
  }
  return false
}

function findModelHit(
  tokens: string[],
  catalog: VehicleCatalogEntry[],
  skip: Set<number>,
): Hit | Ambiguous | null {
  const catalogNorm = catalog.map((c) => ({
    maker: c.maker,
    model: c.model,
    modelKey: normalizeEntityMatchKey(c.model),
    makerKey: normalizeEntityMatchKey(c.maker),
  }))
  const catalogModelKeys = catalogNorm.map((c) => c.modelKey)

  for (let len = Math.min(3, tokens.length); len >= 1; len -= 1) {
    for (let start = 0; start <= tokens.length - len; start += 1) {
      let blocked = false
      for (let k = 0; k < len; k += 1) {
        if (skip.has(start + k)) blocked = true
      }
      if (blocked) continue

      const slice = tokens.slice(start, start + len)
      if (slice.some((t) => YEAR_RE.test(t) || ENGINE_RE.test(t) || CODE_RE.test(t))) continue

      if (len >= 2) {
        const makerTok = normalizeEntityMatchKey(slice[0]!)
        const modelTok = normalizeEntityMatchKey(slice.slice(1).join(' '))
        const makerHit = catalogNorm.find(
          (c) => c.makerKey === makerTok && c.modelKey === modelTok,
        )
        if (
          makerHit &&
          !(
            !modelTok.includes(' ') &&
            isProtectedCompoundBlocked(
              tokens,
              start + 1,
              start + len - 1,
              modelTok,
              catalogModelKeys,
            )
          )
        ) {
          return {
            kind: 'hit',
            maker: makerHit.maker,
            model: makerHit.model,
            start,
            len,
          }
        }
      }

      // "cel ta" → CELTA (compact); "HB 20" → HB20; "Corolla Cross" com espaço.
      const keySpaced = normalizeEntityMatchKey(slice.join(' '))
      const keyCompact = normalizeEntityMatchKey(slice.join(''))
      const modelHits = catalogNorm.filter(
        (c) => c.modelKey === keySpaced || c.modelKey === keyCompact,
      )
      const key = modelHits[0]?.modelKey ?? keySpaced
      if (
        modelHits.length >= 1 &&
        !(
          len === 1 &&
          isProtectedCompoundBlocked(tokens, start, start, key, catalogModelKeys)
        )
      ) {
        const makers = [...new Set(modelHits.map((h) => h.makerKey))]
        if (makers.length > 1) {
          // Regra F — não escolher montadora arbitrariamente
          return {
            kind: 'ambiguous',
            modelLabel: modelHits[0]!.model,
            start,
            len,
            candidates: modelHits.map((h) => ({ maker: h.maker, model: h.model })),
          }
        }
        return {
          kind: 'hit',
          maker: modelHits[0]!.maker,
          model: modelHits[0]!.model,
          start,
          len,
        }
      }
    }
  }
  return null
}

/**
 * Interpreta texto livre em intenção estruturada (sem IA).
 * Ano só é aceito se um modelo do catálogo já casou.
 */
export function interpretSearchQuery(
  raw: string,
  catalog: VehicleCatalogEntry[] = [],
): SearchIntent {
  const trimmed = raw.trim()
  const normalizedQuery = normalizeEntityMatchKey(trimmed)
  if (!trimmed) return emptyIntent(raw, normalizedQuery)

  const tokens = tokenize(trimmed)
  const used = new Set<number>()
  const vehicle: SearchIntentVehicle = {}
  const matchedEntities: SearchMatchedEntity[] = []
  let ambiguous = false

  let codeHint: string | undefined
  for (let i = 0; i < tokens.length; i += 1) {
    const t = tokens[i]!
    if (CODE_RE.test(t) && !YEAR_RE.test(t)) {
      codeHint = t.toUpperCase()
      used.add(i)
      matchedEntities.push({
        type: 'code',
        originalText: t,
        matchedValue: codeHint,
        matchType: 'exact',
      })
      if (tokens.length === 1) {
        return {
          raw,
          normalizedQuery,
          intentType: 'code_search',
          productQuery: codeHint,
          vehicle: {},
          codeHint,
          matchedEntities,
          needsClarification: false,
        }
      }
      break
    }
  }

  const hit = findModelHit(tokens, catalog, used)
  if (hit?.kind === 'ambiguous') {
    ambiguous = true
    for (let k = 0; k < hit.len; k += 1) used.add(hit.start + k)
    matchedEntities.push({
      type: 'model',
      originalText: tokens.slice(hit.start, hit.start + hit.len).join(' '),
      matchedValue: hit.modelLabel,
      matchType: 'exact',
    })
  } else if (hit?.kind === 'hit') {
    vehicle.maker = hit.maker
    vehicle.model = hit.model
    for (let k = 0; k < hit.len; k += 1) used.add(hit.start + k)
    const original = tokens.slice(hit.start, hit.start + hit.len).join(' ')
    matchedEntities.push({
      type: 'maker',
      originalText: original,
      matchedValue: hit.maker,
      matchType: 'exact',
    })
    matchedEntities.push({
      type: 'model',
      originalText: original,
      matchedValue: hit.model,
      matchType: 'exact',
    })
  }

  if (vehicle.model) {
    for (let i = 0; i < tokens.length; i += 1) {
      if (used.has(i)) continue
      if (YEAR_RE.test(tokens[i]!)) {
        vehicle.year = tokens[i]!
        used.add(i)
        matchedEntities.push({
          type: 'year',
          originalText: tokens[i]!,
          matchedValue: tokens[i]!,
          matchType: 'exact',
        })
        break
      }
    }
  }

  for (let i = 0; i < tokens.length; i += 1) {
    if (used.has(i)) continue
    if (ENGINE_RE.test(tokens[i]!)) {
      vehicle.engine = tokens[i]!
      used.add(i)
      matchedEntities.push({
        type: 'engine',
        originalText: tokens[i]!,
        matchedValue: tokens[i]!,
        matchType: 'exact',
      })
      break
    }
  }

  let needsClarification = false
  let clarification: SearchIntent['clarification']

  if (ambiguous) {
    needsClarification = true
    clarification = 'ambiguous'
  }

  if (vehicle.model) {
    const modelEntry = catalog.find(
      (c) =>
        normalizeEntityMatchKey(c.model) === normalizeEntityMatchKey(vehicle.model!) &&
        (!vehicle.maker ||
          normalizeEntityMatchKey(c.maker) === normalizeEntityMatchKey(vehicle.maker)),
    )
    const knownVersions = (modelEntry?.versions ?? []).map((v) => normalizeEntityMatchKey(v))

    for (let i = 0; i < tokens.length; i += 1) {
      if (used.has(i)) continue
      const t = tokens[i]!
      if (YEAR_RE.test(t) || ENGINE_RE.test(t) || CODE_RE.test(t)) continue
      if (isLikelyProductWord(t)) continue
      const key = normalizeEntityMatchKey(t)
      const inAllowlist = VERSION_WORDS.has(key)
      const inCatalog = knownVersions.includes(key)

      if (knownVersions.length > 0) {
        if (inCatalog) {
          const canon = modelEntry!.versions!.find((v) => normalizeEntityMatchKey(v) === key)
          vehicle.version = canon ?? t
          used.add(i)
          matchedEntities.push({
            type: 'version',
            originalText: t,
            matchedValue: vehicle.version,
            matchType: 'exact',
          })
          break
        }
        if (inAllowlist) {
          used.add(i)
          needsClarification = true
          clarification = 'version'
          break
        }
        continue
      }

      if (inAllowlist) {
        vehicle.version = t
        used.add(i)
        matchedEntities.push({
          type: 'version',
          originalText: t,
          matchedValue: t,
          matchType: 'alias',
        })
        break
      }
    }
  }

  const leftover = tokens.filter((_, i) => !used.has(i))
  const leftoverClean = leftover.filter((t) => {
    const k = normalizeEntityMatchKey(t)
    if (STOP_WORDS.has(k)) return false
    if (BRAND_WORDS.has(k) && !codeHint) return true
    if (BRAND_WORDS.has(k) && codeHint) return false
    return true
  })
  const leftoverProducts = leftoverClean.filter((t) => isLikelyProductWord(t))

  let productQuery: string | null
  if (ambiguous) {
    // Regra F — preservar consulta original para o motor textual
    productQuery = trimmed
  } else if (codeHint) {
    const extra = leftoverProducts
      .filter((t) => !BRAND_WORDS.has(normalizeEntityMatchKey(t)))
      .map(displayProductToken)
    productQuery = extra.length ? `${codeHint} ${extra.join(' ')}` : codeHint
  } else if (leftoverProducts.length) {
    productQuery = leftoverProducts.map(displayProductToken).join(' ')
  } else if (leftoverClean.length) {
    productQuery = leftoverClean.join(' ')
  } else {
    productQuery = null
  }

  for (const t of leftoverProducts) {
    matchedEntities.push({
      type: 'product',
      originalText: t,
      matchedValue: displayProductToken(t),
      matchType: PRODUCT_ALIAS_DISPLAY[normalizeEntityMatchKey(t)] ? 'alias' : 'exact',
    })
  }

  const hasVehicle = Boolean(
    !ambiguous && (vehicle.maker || vehicle.model || vehicle.year || vehicle.engine || vehicle.version),
  )
  const hasProductEntity = matchedEntities.some((e) => e.type === 'product')

  if (!needsClarification && hasVehicle && !productQuery && !codeHint) {
    needsClarification = true
    clarification = 'product'
  }

  const intentType = resolveIntentType({
    ambiguous,
    codeHint,
    hasVehicle,
    hasProductEntity,
    productQuery,
  })

  return {
    raw,
    normalizedQuery,
    intentType,
    productQuery,
    vehicle: ambiguous ? {} : vehicle,
    codeHint,
    matchedEntities,
    needsClarification,
    clarification,
  }
}

export function hintFromSearchIntent(intent: SearchIntent): string | null {
  if (intent.clarification === 'ambiguous') {
    return 'Encontramos mais de um veículo com esse nome. Informe a montadora para continuar.'
  }
  if (intent.clarification === 'version') {
    return 'Não encontramos essa versão no cadastro deste modelo. Refine pelo filtro Versão se precisar.'
  }
  if (intent.clarification === 'product' || intent.intentType === 'vehicle_only') {
    return 'Veículo identificado. Qual peça você procura?'
  }
  if (intent.clarification === 'year') {
    return 'Informe o ano do veículo para refinar a busca.'
  }
  if (intent.clarification === 'engine') {
    return 'Informe o motor (ex.: 1.0) para refinar a busca.'
  }
  return null
}
