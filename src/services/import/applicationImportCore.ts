/**
 * Motor puro — Importação Inteligente de aplicações.
 * Sem I/O; testável. Split de versão só com regra segura.
 * Decisões de prévia são congeladas no payload (apply não recalcula).
 */

import { normalizeImportText } from '@/services/import/normalizeText'

export type MatchConfidence = 'exact' | 'probable' | 'unidentified'

export type PeriodAction =
  | 'noop_covered'
  | 'expand'
  | 'close_open_end'
  | 'review_gap'
  | 'create'

export type ApplicationActionHint =
  | 'found'
  | 'new'
  | 'update'
  | 'already_covered'
  | 'review'
  | 'error'

export type YearPeriod = {
  start: number | null
  /** null = vigente (sem fim informado) */
  end: number | null
}

/** Parse anos do arquivo. Fim vazio = vigente (não erro). */
export function parseYearPeriod(
  startRaw: string | null | undefined,
  endRaw: string | null | undefined,
): { ok: true; period: YearPeriod } | { ok: false; reason: string } {
  const s = normalizeImportText(startRaw)
  const e = normalizeImportText(endRaw)

  let start: number | null = null
  let end: number | null = null

  if (s) {
    const n = Number(s)
    if (!Number.isInteger(n) || n < 1950 || n > 2100) {
      return { ok: false, reason: 'ano_inicio_invalido' }
    }
    start = n
  }

  if (e) {
    const n = Number(e)
    if (!Number.isInteger(n) || n < 1950 || n > 2100) {
      return { ok: false, reason: 'ano_fim_invalido' }
    }
    end = n
  }

  if (start != null && end != null && end < start) {
    return { ok: false, reason: 'periodo_invertido' }
  }

  return { ok: true, period: { start, end } }
}

/**
 * Split seguro de versão: só "1.0/1.6" ou "1.0 / 1.4 / 1.6" (números com ponto).
 * Não divide "1.0 Turbo", "1.0 8V", "1.6 AT".
 */
export function splitVersionSafe(raw: string | null | undefined): {
  original: string
  parts: string[]
  split: boolean
} {
  const original = normalizeImportText(raw)
  if (!original) return { original: '', parts: [], split: false }

  const tokens = original.split(/\s*\/\s*/).map((t) => t.trim()).filter(Boolean)
  if (tokens.length <= 1) {
    return { original, parts: original ? [original] : [], split: false }
  }

  const engineLike = /^(\d+(\.\d+)?)$/
  if (tokens.every((t) => engineLike.test(t))) {
    return { original, parts: tokens, split: true }
  }

  return { original, parts: [original], split: false }
}

/** Compara intervalos inclusivos; end null = +∞. */
export function comparePeriods(
  existing: YearPeriod,
  incoming: YearPeriod,
): PeriodAction {
  const eStart = existing.start ?? Number.NEGATIVE_INFINITY
  const eEnd = existing.end ?? Number.POSITIVE_INFINITY
  const iStart = incoming.start ?? Number.NEGATIVE_INFINITY
  const iEnd = incoming.end ?? Number.POSITIVE_INFINITY

  if (iStart >= eStart && iEnd <= eEnd) return 'noop_covered'

  if (existing.end == null && incoming.end != null && iStart <= eStart && iEnd >= eStart) {
    return 'close_open_end'
  }

  const overlapsOrTouches = iStart <= eEnd + 1 && iEnd >= eStart - 1

  if (overlapsOrTouches) {
    if (iStart < eStart || iEnd > eEnd) return 'expand'
  }

  if (iStart > eEnd + 1 || iEnd < eStart - 1) return 'review_gap'

  return 'review_gap'
}

export function mergePeriods(a: YearPeriod, b: YearPeriod): YearPeriod {
  const starts = [a.start, b.start].filter((x): x is number => x != null)
  const endsOpen = a.end == null || b.end == null
  const ends = [a.end, b.end].filter((x): x is number => x != null)
  return {
    start: starts.length ? Math.min(...starts) : null,
    end: endsOpen ? null : Math.max(...ends),
  }
}

export function classifyMatch(
  candidates: string[],
  query: string,
): { confidence: MatchConfidence; best: string | null } {
  const q = normalizeImportText(query).toLowerCase()
  if (!q) return { confidence: 'unidentified', best: null }

  const norm = candidates.map((c) => ({ raw: c, n: normalizeImportText(c).toLowerCase() }))
  const exact = norm.find((c) => c.n === q)
  if (exact) return { confidence: 'exact', best: exact.raw }

  const starts = norm.filter((c) => c.n.startsWith(q) || q.startsWith(c.n))
  if (starts.length === 1) return { confidence: 'probable', best: starts[0].raw }
  if (starts.length > 1) return { confidence: 'probable', best: null }

  const includes = norm.filter((c) => c.n.includes(q) || q.includes(c.n))
  if (includes.length === 1) return { confidence: 'probable', best: includes[0].raw }
  if (includes.length > 1) return { confidence: 'probable', best: null }

  return { confidence: 'unidentified', best: null }
}

export function applicationActionFromParts(input: {
  productResolved: boolean
  vehicleConfidence: MatchConfidence
  periodAction: PeriodAction | null
  hasError?: boolean
  versionAmbiguous?: boolean
}): ApplicationActionHint {
  if (input.hasError || !input.productResolved) return 'error'
  if (input.versionAmbiguous) return 'review'
  if (input.vehicleConfidence === 'probable') return 'review'
  if (input.vehicleConfidence === 'unidentified') return 'new'
  if (input.periodAction === 'noop_covered') return 'already_covered'
  if (input.periodAction === 'expand' || input.periodAction === 'close_open_end') return 'update'
  if (input.periodAction === 'review_gap') return 'review'
  if (input.periodAction === 'create') return 'new'
  return 'found'
}

/** Chave lógica de aplicação (dedupe no arquivo). */
export function applicationLogicKey(input: {
  sku: string
  montadora: string
  modelo: string
  versao: string
  yearStart: number | null
  yearEnd: number | null
}): string {
  return [
    normalizeImportText(input.sku).toLowerCase(),
    normalizeImportText(input.montadora).toLowerCase(),
    normalizeImportText(input.modelo).toLowerCase(),
    normalizeImportText(input.versao).toLowerCase(),
    input.yearStart ?? '',
    input.yearEnd ?? '',
  ].join('|')
}

export function normKey(s: string): string {
  return normalizeImportText(s).toLowerCase()
}

export type CatalogMaker = { id: string; name: string }
export type CatalogModel = { id: string; manufacturerId: string; name: string }
export type CatalogVersion = {
  id: string
  manufacturerId: string
  modelId: string
  versionName: string | null
}
export type CatalogPvc = {
  productId: string
  vehicleVersionId: string
  yearStart: number | null
  yearEnd: number | null
}

export type ApplicationCatalogs = {
  productsBySku: Map<string, { id: string; name: string }>
  makers: CatalogMaker[]
  models: CatalogModel[]
  versions: CatalogVersion[]
  pvc: CatalogPvc[]
}

/**
 * Resolve versão sem escolha arbitrária.
 * 1) correspondências exatas no contexto
 * 2) se 1 → usar
 * 3) se PVC do produto aponta para uma das correspondências → usar
 * 4) se múltiplas → ambíguo (revisão)
 * 5) se zero → criar (quando aprovado)
 */
export function resolveVehicleVersionMatch(input: {
  manufacturerId: string | null
  modelId: string | null
  versionName: string
  productId: string | null
  versions: CatalogVersion[]
  pvc: CatalogPvc[]
}): {
  status: 'one' | 'none' | 'ambiguous' | 'linked'
  versionId: string | null
} {
  if (!input.manufacturerId || !input.modelId) {
    return { status: 'none', versionId: null }
  }
  const want = normKey(input.versionName || '')
  const matches = input.versions.filter(
    (v) =>
      v.manufacturerId === input.manufacturerId &&
      v.modelId === input.modelId &&
      normKey(v.versionName ?? '') === want,
  )

  if (matches.length === 0) return { status: 'none', versionId: null }
  if (matches.length === 1) return { status: 'one', versionId: matches[0].id }

  if (input.productId) {
    const linked = input.pvc.filter((p) => p.productId === input.productId)
    const hit = matches.find((m) => linked.some((p) => p.vehicleVersionId === m.id))
    if (hit) return { status: 'linked', versionId: hit.id }
  }

  return { status: 'ambiguous', versionId: null }
}

export type ApplicationPreviewRow = {
  lineNumber: number
  sku: string
  name: string
  montadora: string
  modelo: string
  versao: string
  yearStart: number | null
  yearEnd: number | null
  versionParts: string[]
  versionSplit: boolean
  action: ApplicationActionHint
  periodAction: PeriodAction | null
  message: string
  duplicateOfLine?: number
  /** Pode ir para apply (new/update/found). */
  applyable: boolean
  productExists: boolean
  productId: string | null
  manufacturerId: string | null
  modelId: string | null
  vehicleVersionId: string | null
  createProduct: boolean
  createManufacturer: boolean
  createModel: boolean
  createVersion: boolean
}

function emptyRow(
  partial: Omit<
    ApplicationPreviewRow,
    | 'applyable'
    | 'productExists'
    | 'productId'
    | 'manufacturerId'
    | 'modelId'
    | 'vehicleVersionId'
    | 'createProduct'
    | 'createManufacturer'
    | 'createModel'
    | 'createVersion'
    | 'periodAction'
  > & { periodAction?: PeriodAction | null },
): ApplicationPreviewRow {
  const action = partial.action
  return {
    ...partial,
    periodAction: partial.periodAction ?? null,
    applyable: action === 'new' || action === 'update' || action === 'found',
    productExists: false,
    productId: null,
    manufacturerId: null,
    modelId: null,
    vehicleVersionId: null,
    createProduct: false,
    createManufacturer: false,
    createModel: false,
    createVersion: false,
  }
}

/** Expande linhas com split seguro em uma linha lógica por parte. */
export function expandMappedRowsForVersions(
  rows: Array<{ lineNumber: number; values: Record<string, string> }>,
): Array<{ lineNumber: number; values: Record<string, string>; versionSplit: boolean }> {
  const out: Array<{ lineNumber: number; values: Record<string, string>; versionSplit: boolean }> =
    []
  for (const row of rows) {
    const info = splitVersionSafe(row.values.versao)
    if (info.split && info.parts.length > 1) {
      for (const part of info.parts) {
        out.push({
          lineNumber: row.lineNumber,
          values: { ...row.values, versao: part },
          versionSplit: true,
        })
      }
    } else {
      out.push({
        lineNumber: row.lineNumber,
        values: { ...row.values, versao: info.original },
        versionSplit: false,
      })
    }
  }
  return out
}

/**
 * Análise pura de linhas mapeadas (prévia).
 * Com catalogs: resolve IDs e períodos PVC; VV ambígua → revisão.
 */
export function analyzeApplicationMappedRows(
  rows: Array<{ lineNumber: number; values: Record<string, string> }>,
  catalogs?: ApplicationCatalogs,
): ApplicationPreviewRow[] {
  const expanded = expandMappedRowsForVersions(rows)
  const seen = new Map<string, number>()
  const productsBySku = catalogs?.productsBySku
  const makers = catalogs?.makers ?? []
  const models = catalogs?.models ?? []
  const versions = catalogs?.versions ?? []
  const pvc = catalogs?.pvc ?? []

  const makerNames = makers.map((m) => m.name)
  const out: ApplicationPreviewRow[] = []

  for (const row of expanded) {
    const sku = normalizeImportText(row.values.sku)
    const name = normalizeImportText(row.values.name)
    const montadora = normalizeImportText(row.values.montadora)
    const modelo = normalizeImportText(row.values.modelo)
    const versao = normalizeImportText(row.values.versao)
    const periodParse = parseYearPeriod(row.values.ano_inicio, row.values.ano_fim)

    if (!sku || !montadora || !modelo) {
      out.push(
        emptyRow({
          lineNumber: row.lineNumber,
          sku,
          name,
          montadora,
          modelo,
          versao,
          yearStart: null,
          yearEnd: null,
          versionParts: versao ? [versao] : [],
          versionSplit: row.versionSplit,
          action: 'error',
          message: 'Informe código referência, montadora e modelo.',
        }),
      )
      continue
    }

    if (!periodParse.ok) {
      out.push(
        emptyRow({
          lineNumber: row.lineNumber,
          sku,
          name,
          montadora,
          modelo,
          versao,
          yearStart: null,
          yearEnd: null,
          versionParts: versao ? [versao] : [],
          versionSplit: row.versionSplit,
          action: 'error',
          message: 'Período de anos inválido.',
        }),
      )
      continue
    }

    const key = applicationLogicKey({
      sku,
      montadora,
      modelo,
      versao,
      yearStart: periodParse.period.start,
      yearEnd: periodParse.period.end,
    })
    const dupLine = seen.get(key)
    if (dupLine != null) {
      out.push(
        emptyRow({
          lineNumber: row.lineNumber,
          sku,
          name,
          montadora,
          modelo,
          versao,
          yearStart: periodParse.period.start,
          yearEnd: periodParse.period.end,
          versionParts: versao ? [versao] : [],
          versionSplit: row.versionSplit,
          action: 'already_covered',
          periodAction: 'noop_covered',
          message: `Mesma aplicação já na linha ${dupLine} (será consolidada).`,
          duplicateOfLine: dupLine,
        }),
      )
      continue
    }
    seen.set(key, row.lineNumber)

    const product = productsBySku?.get(sku.toLowerCase()) ?? null
    const productExists = Boolean(product)
    const rawProductId = product?.id ?? null
    const productId =
      rawProductId && !String(rawProductId).startsWith('pending:')
        ? rawProductId
        : null

    // Frente B: aplicação NÃO cria produto
    if (!productExists) {
      out.push(
        emptyRow({
          lineNumber: row.lineNumber,
          sku,
          name,
          montadora,
          modelo,
          versao,
          yearStart: periodParse.period.start,
          yearEnd: periodParse.period.end,
          versionParts: versao ? [versao] : [],
          versionSplit: row.versionSplit,
          action: 'error',
          message: 'Produto não cadastrado — importe o cadastro primeiro.',
        }),
      )
      continue
    }

    const makerMatch = makerNames.length
      ? classifyMatch(makerNames, montadora)
      : { confidence: 'unidentified' as MatchConfidence, best: null }

    let manufacturerId: string | null = null
    let createManufacturer = false
    if (makerMatch.confidence === 'exact' && makerMatch.best) {
      manufacturerId = makers.find((m) => m.name === makerMatch.best)?.id ?? null
    } else if (makerMatch.confidence === 'probable') {
      // revisão — não cria
    } else if (makerMatch.confidence === 'unidentified') {
      createManufacturer = true
    }

    const modelsForMaker = manufacturerId
      ? models.filter((m) => m.manufacturerId === manufacturerId)
      : []
    const modelMatch = modelsForMaker.length
      ? classifyMatch(
          modelsForMaker.map((m) => m.name),
          modelo,
        )
      : manufacturerId
        ? { confidence: 'unidentified' as MatchConfidence, best: null }
        : makerMatch.confidence === 'probable'
          ? { confidence: 'probable' as MatchConfidence, best: null }
          : { confidence: 'unidentified' as MatchConfidence, best: null }

    let modelId: string | null = null
    let createModel = false
    if (modelMatch.confidence === 'exact' && modelMatch.best && manufacturerId) {
      modelId =
        modelsForMaker.find((m) => m.name === modelMatch.best)?.id ?? null
    } else if (modelMatch.confidence === 'unidentified' && manufacturerId) {
      createModel = true
    } else if (modelMatch.confidence === 'unidentified' && createManufacturer) {
      createModel = true
    }

    const versionAmbiguousPrep =
      manufacturerId &&
      modelId &&
      resolveVehicleVersionMatch({
        manufacturerId,
        modelId,
        versionName: versao,
        productId,
        versions,
        pvc,
      })

    let vehicleVersionId: string | null = null
    let createVersion = false
    let versionAmbiguous = false

    if (versionAmbiguousPrep) {
      if (versionAmbiguousPrep.status === 'ambiguous') {
        versionAmbiguous = true
      } else if (
        versionAmbiguousPrep.status === 'one' ||
        versionAmbiguousPrep.status === 'linked'
      ) {
        vehicleVersionId = versionAmbiguousPrep.versionId
      } else {
        createVersion = Boolean(manufacturerId && modelId) || createManufacturer || createModel
        // se maker/model ainda serão criados, versão também
        if (createManufacturer || createModel) createVersion = true
        if (!manufacturerId && !createManufacturer) createVersion = false
      }
    } else if (createManufacturer || createModel) {
      createVersion = true
    }

    let periodAction: PeriodAction | null = 'create'
    if (productId && vehicleVersionId) {
      const existing = pvc.find(
        (p) => p.productId === productId && p.vehicleVersionId === vehicleVersionId,
      )
      if (existing) {
        periodAction = comparePeriods(
          { start: existing.yearStart, end: existing.yearEnd },
          periodParse.period,
        )
      }
    }

    const vehicleConfidence: MatchConfidence = versionAmbiguous
      ? 'probable'
      : makerMatch.confidence === 'probable' || modelMatch.confidence === 'probable'
        ? 'probable'
        : createManufacturer || createModel || createVersion
          ? 'unidentified'
          : manufacturerId && modelId
            ? 'exact'
            : 'unidentified'

    const action = applicationActionFromParts({
      productResolved: true,
      vehicleConfidence,
      periodAction,
      versionAmbiguous,
      hasError: false,
    })

    let message = 'Nova aplicação'
    if (action === 'new') message = 'Novo cadastro de aplicação'
    else if (action === 'update') message = 'Será atualizado o período'
    else if (action === 'already_covered') message = 'Já contemplado'
    else if (action === 'found') message = 'Já cadastrado'
    else if (action === 'review' && versionAmbiguous) {
      message = 'Precisa de revisão — versões duplicadas no cadastro'
    } else if (action === 'review' && periodAction === 'review_gap') {
      message = 'Precisa de revisão — lacuna no período'
    } else if (action === 'review') {
      message = 'Precisa de revisão — correspondência de veículo'
    }

    const applyable = action === 'new' || action === 'update' || action === 'found'

    out.push({
      lineNumber: row.lineNumber,
      sku,
      name: name || product?.name || '',
      montadora,
      modelo,
      versao,
      yearStart: periodParse.period.start,
      yearEnd: periodParse.period.end,
      versionParts: versao ? [versao] : [],
      versionSplit: row.versionSplit,
      action,
      periodAction,
      message,
      applyable,
      productExists: true,
      productId,
      manufacturerId,
      modelId,
      vehicleVersionId,
      createProduct: false,
      createManufacturer: createManufacturer && applyable,
      createModel: createModel && applyable,
      createVersion: createVersion && applyable,
    })
  }

  return out
}

/** Payload congelado persistido em import_items. */
export function previewRowToFrozenPayload(row: ApplicationPreviewRow): Record<string, unknown> {
  return {
    action: row.action,
    period_action: row.periodAction,
    applyable: row.applyable,
    sku: row.sku,
    name: row.name,
    montadora: row.montadora,
    modelo: row.modelo,
    versao: row.versao,
    year_start: row.yearStart,
    year_end: row.yearEnd,
    product_id:
      row.productId && !String(row.productId).startsWith('pending:')
        ? row.productId
        : null,
    manufacturer_id: row.manufacturerId,
    model_id: row.modelId,
    vehicle_version_id: row.vehicleVersionId,
    create_product: row.createProduct,
    create_manufacturer: row.createManufacturer,
    create_model: row.createModel,
    create_version: row.createVersion,
    product_exists: row.productExists,
  }
}
