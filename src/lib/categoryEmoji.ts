/**
 * Ícones de categoria na vitrine.
 * Resolve por slug/nome (Grupos L1). Emoji do banco só entra se não for placeholder
 * e se não houver mapeamento conhecido (assets/contrato visual).
 *
 * Contratos visuais (eFe):
 * - Suspensão → asset mola/amortecedor
 * - Direção → engrenagem
 * - Óleos → óleo
 * - Freio → disco/pinça (asset)
 * - Filtro → funil/filtro (asset)
 */

export type CategoryIcon =
  | { type: 'emoji'; value: string }
  | { type: 'image'; src: string; alt: string }

const PLACEHOLDER_EMOJI = new Set(['📦'])

const SUSPENSAO_IMG = '/icons/categories/suspensao.png'
const FREIOS_IMG = '/icons/categories/freios.png'
const FILTROS_IMG = '/icons/categories/filtros.png'

const BY_SLUG: Record<string, CategoryIcon> = {
  suspensao: { type: 'image', src: SUSPENSAO_IMG, alt: 'Suspensão' },
  direcao: { type: 'emoji', value: '⚙️' },
  'oleos-e-fluidos': { type: 'emoji', value: '🛢️' },
  freios: { type: 'image', src: FREIOS_IMG, alt: 'Freios' },
  filtros: { type: 'image', src: FILTROS_IMG, alt: 'Filtros' },
  'componentes-de-manutencao': { type: 'emoji', value: '🛠️' },
  outro: { type: 'emoji', value: '📦' },
  'outros-produtos': { type: 'emoji', value: '🚘' },
}

const BY_NAME_HINT: Array<{ re: RegExp; icon: CategoryIcon }> = [
  { re: /suspens/i, icon: { type: 'image', src: SUSPENSAO_IMG, alt: 'Suspensão' } },
  { re: /dire[cç][aã]o/i, icon: { type: 'emoji', value: '⚙️' } },
  { re: /[oó]leo|fluido|lubrific/i, icon: { type: 'emoji', value: '🛢️' } },
  { re: /freio/i, icon: { type: 'image', src: FREIOS_IMG, alt: 'Freios' } },
  { re: /filtro/i, icon: { type: 'image', src: FILTROS_IMG, alt: 'Filtros' } },
  { re: /manuten/i, icon: { type: 'emoji', value: '🛠️' } },
]

function resolveBySlugOrName(slug: string, name: string): CategoryIcon | null {
  if (slug && BY_SLUG[slug]) return BY_SLUG[slug]
  for (const row of BY_NAME_HINT) {
    if (row.re.test(name) || (slug && row.re.test(slug))) return row.icon
  }
  return null
}

export function resolveCategoryIcon(input: {
  slug?: string | null
  name?: string | null
  emoji?: string | null
}): CategoryIcon {
  const slug = (input.slug ?? '').trim().toLowerCase()
  const name = (input.name ?? '').trim()
  const mapped = resolveBySlugOrName(slug, name)
  if (mapped) return mapped

  const emoji = input.emoji?.trim()
  if (emoji && !PLACEHOLDER_EMOJI.has(emoji)) {
    return { type: 'emoji', value: emoji }
  }

  return { type: 'emoji', value: '📦' }
}

/** @deprecated use resolveCategoryIcon */
export function resolveCategoryEmoji(input: {
  slug?: string | null
  name?: string | null
  emoji?: string | null
}): string {
  const icon = resolveCategoryIcon(input)
  return icon.type === 'emoji' ? icon.value : '📦'
}
