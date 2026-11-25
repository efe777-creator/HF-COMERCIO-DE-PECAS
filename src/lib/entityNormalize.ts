/**
 * Normalização de nomes de entidades (cadastro / import).
 *
 * Políticas:
 * - Chave de matching: sem acento, maiúsculas, espaços colapsados
 *   (CHEVROLET ≈ Chevrolet ≈ chevrolet ≈ Chévrolet).
 * - Categoria (exibição): MAIÚSCULAS pt-BR.
 * - Montadora (exibição): title case comercial (Ford; siglas BMW/BYD/SEAT…).
 * - Modelo (exibição): title case comercial (Ecosport); códigos QQ/A1/HB20/CR-V em UPPER.
 * - Fabricante de peça: trim + espaços (preserva casing) via formatCatalogDisplayName.
 */

/** Remove U+FFFD (encoding quebrado) — nunca é caractere comercial válido. */
export function stripReplacementChars(input: string): string {
  return input.replace(/\uFFFD/g, '')
}

export function collapseSpaces(input: string): string {
  return stripReplacementChars(input).replace(/\u00A0/g, ' ').replace(/[ \t]+/g, ' ').trim()
}

/** Remove diacríticos (NFD) mantendo a letra base. */
export function stripDiacritics(input: string): string {
  return input.normalize('NFD').replace(/\p{M}/gu, '')
}

/**
 * Chave canônica para igualdade / busca / anti-duplicidade.
 * Não usar como texto de exibição.
 * U+FFFD é removido (DOBL� → DOBL) para não criar “modelo fantasma” na vitrine.
 */
export function normalizeEntityMatchKey(input: string | null | undefined): string {
  if (input == null) return ''
  return stripDiacritics(collapseSpaces(String(input))).toLocaleUpperCase('pt-BR')
}

export function entityNamesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const ka = normalizeEntityMatchKey(a)
  const kb = normalizeEntityMatchKey(b)
  return Boolean(ka) && ka === kb
}

/** Categorias comerciais: sempre maiúsculas. */
export function formatCategoryName(input: string): string {
  return collapseSpaces(input).toLocaleUpperCase('pt-BR')
}

/** Montadoras, fabricantes de peça, modelos: limpa espaços; preserva casing. */
export function formatCatalogDisplayName(input: string): string {
  return collapseSpaces(input)
}

/** Partículas pt-BR em minúsculas no meio do nome (D4 title case). */
const TITLE_PARTICLES = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'a', 'o'])

/** Marcas/siglas comerciais que permanecem ALL CAPS na vitrine. */
const TITLE_PRESERVE_UPPER = new Set([
  'ABS',
  'BMW',
  'BYD',
  'CAOA',
  'GM',
  'GWM',
  'KYB',
  'NAP',
  'NGK',
  'OEM',
  'RAM',
  'SEAT',
  'SKF',
  'TRW',
  'VW',
])

/**
 * Tokens de modelo que ficam UPPER (códigos curtos / alfanuméricos).
 * Ex.: QQ, A1, HB20, CR-V — mas KA/UP seguem title case comercial (Ka, Up).
 */
function preserveModelTokenUpper(token: string): boolean {
  const core = token.replace(/[^A-Za-zÀ-ÿ0-9]/g, '')
  if (!core) return false
  const upper = core.toLocaleUpperCase('pt-BR')
  if (TITLE_PRESERVE_UPPER.has(upper)) return true
  if (/\d/.test(core)) return true
  if (core.length <= 2 && upper !== 'KA' && upper !== 'UP') return true
  return false
}

function titleCaseToken(word: string, wordIndex: number, opts?: { model?: boolean }): string {
  if (!word) return word
  if (word.includes('-')) {
    return word
      .split('-')
      .map((part, i) => titleCaseToken(part, wordIndex + i, opts))
      .join('-')
  }
  const upper = word.toLocaleUpperCase('pt-BR')
  if (TITLE_PRESERVE_UPPER.has(upper)) return upper
  if (opts?.model && preserveModelTokenUpper(word)) {
    // Preserva letras/dígitos em UPPER; mantém pontuação (ex.: UP!)
    return word.replace(/[A-Za-zÀ-ÿ]/g, (ch) => ch.toLocaleUpperCase('pt-BR'))
  }
  const lower = word.toLocaleLowerCase('pt-BR')
  if (wordIndex > 0 && TITLE_PARTICLES.has(lower)) return lower
  return lower.charAt(0).toLocaleUpperCase('pt-BR') + lower.slice(1)
}

/**
 * Title case comercial para vitrine (D4).
 * Preserva whitelist de siglas (BMW, BYD, SEAT…) e partículas pt-BR.
 * Hifenizados: Mercedes-Benz → Mercedes-Benz.
 * Não usar como chave de matching — use `normalizeEntityMatchKey`.
 */
export function toCommercialTitleCase(input: string | null | undefined): string {
  const raw = collapseSpaces(input ?? '')
  if (!raw) return ''
  return raw
    .split(' ')
    .map((word, index) => titleCaseToken(word, index))
    .join(' ')
}

/**
 * Montadora na vitrine: title case comercial (Ford, não FORD),
 * com siglas preservadas (BMW, BYD, SEAT, CAOA…).
 */
export function formatManufacturerDisplayName(input: string): string {
  return toCommercialTitleCase(input)
}

/**
 * Modelo na vitrine: title case (Ecosport, Premio),
 * preservando códigos (QQ, A1, HB20, CR-V) e Ka/Up em title case.
 */
export function formatModelDisplayName(input: string): string {
  const raw = collapseSpaces(input)
  if (!raw) return ''
  return raw
    .split(' ')
    .map((word, index) => titleCaseToken(word, index, { model: true }))
    .join(' ')
}

export function findByEntityName<T extends { name: string }>(
  items: T[],
  query: string,
): T | undefined {
  const key = normalizeEntityMatchKey(query)
  if (!key) return undefined
  return items.find((item) => normalizeEntityMatchKey(item.name) === key)
}
