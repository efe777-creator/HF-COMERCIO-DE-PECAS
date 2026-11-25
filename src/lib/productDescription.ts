/** Limiar para “Ver descrição completa” na PDP. */
export const DESC_COLLAPSE_CHARS = 320

export function needsDescriptionCollapse(
  text: string,
  limit: number = DESC_COLLAPSE_CHARS,
): boolean {
  return text.trim().length > limit
}

/** Recorte em limite de caracteres, preferindo fronteira de palavra. */
export function truncateDescription(text: string, limit: number = DESC_COLLAPSE_CHARS): string {
  const t = text.trim()
  if (t.length <= limit) return t
  const slice = t.slice(0, limit)
  const lastSpace = slice.lastIndexOf(' ')
  const cut = lastSpace > limit * 0.6 ? slice.slice(0, lastSpace) : slice
  return `${cut.trimEnd()}…`
}

/** Junta short + long sem duplicar o mesmo texto. */
export function joinProductDescription(shortDesc: string, longDesc: string): string {
  const short = shortDesc.trim()
  const long = longDesc.trim()
  if (!short) return long
  if (!long || long === short) return short
  return `${short}\n\n${long}`
}

export function buildCatalogMakerFilterHref(maker?: string | null): string {
  const m = maker?.trim()
  if (!m) return '/catalogo'
  return `/catalogo?maker=${encodeURIComponent(m)}`
}

export function buildPdpCatalogFilterLink(makers: Array<string | null | undefined>): {
  href: string
  hint: string
} {
  const unique: string[] = []
  const seen = new Set<string>()
  for (const raw of makers) {
    const m = raw?.trim()
    if (!m) continue
    const key = m.toLocaleLowerCase('pt-BR')
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(m)
  }
  if (unique.length === 1) {
    const maker = unique[0]!
    return {
      href: buildCatalogMakerFilterHref(maker),
      hint: ` — outras peças da montadora ${maker}`,
    }
  }
  return {
    href: '/catalogo',
    hint: unique.length > 1 ? ' — várias montadoras nesta peça' : '',
  }
}
