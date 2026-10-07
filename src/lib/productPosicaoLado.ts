/** Atoms e normalização de posição/lado do produto. */

export const POSICAO_ATOMS = ['DIANTEIRA', 'TRASEIRA', 'SUPERIOR', 'INFERIOR'] as const
export type PosicaoAtom = (typeof POSICAO_ATOMS)[number]

/** Canônico = um ou mais átomos unidos por `_`, na ordem diant→tras→sup→inf. */
export type CanonicalPosicao = string
export type CanonicalLado = 'ESQUERDO' | 'DIREITO' | 'AMBOS'

const ATOM_ALIASES: Record<string, PosicaoAtom> = {
  DIANT: 'DIANTEIRA',
  DIANTEIRA: 'DIANTEIRA',
  DIANTEIRO: 'DIANTEIRA',
  TRAS: 'TRASEIRA',
  TRASEIRA: 'TRASEIRA',
  TRASEIRO: 'TRASEIRA',
  SUP: 'SUPERIOR',
  SUPERIOR: 'SUPERIOR',
  INF: 'INFERIOR',
  INFERIOR: 'INFERIOR',
}

const LADO_ALIASES: Record<string, CanonicalLado> = {
  LE: 'ESQUERDO',
  ESQUERDO: 'ESQUERDO',
  ESQ: 'ESQUERDO',
  LD: 'DIREITO',
  DIREITO: 'DIREITO',
  DIR: 'DIREITO',
  AMBOS: 'AMBOS',
  LDLE: 'AMBOS',
  LELD: 'AMBOS',
  'LD/LE': 'AMBOS',
  'LE/LD': 'AMBOS',
}

function foldToken(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\./g, '')
    .replace(/\s+/g, '')
}

/** Ordem estável dos átomos no valor canônico. */
export function composePosicao(atoms: Iterable<PosicaoAtom>): string | null {
  const set = new Set(atoms)
  const ordered = POSICAO_ATOMS.filter((a) => set.has(a))
  return ordered.length ? ordered.join('_') : null
}

export function parsePosicaoAtoms(canonical: string | null | undefined): PosicaoAtom[] {
  if (canonical == null) return []
  const raw = typeof canonical === 'string' ? canonical : String(canonical)
  if (!raw.trim()) return []
  return raw
    .split('_')
    .map((p) => p.trim().toUpperCase())
    .filter((p): p is PosicaoAtom => (POSICAO_ATOMS as readonly string[]).includes(p))
}

export function formatPosicaoLabel(canonical: string | null | undefined): string {
  const labels: Record<PosicaoAtom, string> = {
    DIANTEIRA: 'Dianteira',
    TRASEIRA: 'Traseira',
    SUPERIOR: 'Superior',
    INFERIOR: 'Inferior',
  }
  const atoms = parsePosicaoAtoms(canonical)
  if (!atoms.length) return '—'
  return atoms.map((a) => labels[a]).join(' · ')
}

export function formatLadoLabel(lado: string | null | undefined): string {
  if (lado === 'ESQUERDO') return 'Esquerdo'
  if (lado === 'DIREITO') return 'Direito'
  if (lado === 'AMBOS') return 'Ambos'
  return lado || '—'
}

/**
 * Aceita átomos e combinações: "DIANT", "DIANT INFERIOR", "DIANT/SUP", "TRAS;INFERIOR".
 */
export function normalizePosicao(
  raw: string | null | undefined,
): { ok: true; value: string | null } | { ok: false; raw: string } {
  const t = (raw ?? '').trim()
  if (!t) return { ok: true, value: null }

  // Já canônico com underscore
  if (/^[A-Z_]+$/.test(t) && t.includes('_')) {
    const atoms = parsePosicaoAtoms(t)
    if (atoms.length && atoms.join('_') === t) return { ok: true, value: t }
  }

  const parts = t
    .split(/[\s,/|;+]+/)
    .map((p) => p.trim())
    .filter(Boolean)

  if (!parts.length) return { ok: true, value: null }

  const atoms: PosicaoAtom[] = []
  for (const part of parts) {
    const k = foldToken(part)
    // LD/LE style already split; also try whole-part aliases
    const atom = ATOM_ALIASES[k]
    if (!atom) return { ok: false, raw: t }
    atoms.push(atom)
  }

  return { ok: true, value: composePosicao(atoms) }
}

export function normalizeLado(
  raw: string | null | undefined,
): { ok: true; value: CanonicalLado | null } | { ok: false; raw: string } {
  const t = (raw ?? '').trim()
  if (!t) return { ok: true, value: null }
  const k = foldToken(t)
  // LD/LE before stripping slash from fold — fold removes spaces but keeps /
  const withSlash = t
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, '')
  const lado = LADO_ALIASES[withSlash] ?? LADO_ALIASES[k]
  if (!lado) return { ok: false, raw: t }
  return { ok: true, value: lado }
}

/** Regex SQL-friendly: átomos válidos unidos por _ */
export const POSICAO_CANONICAL_PATTERN =
  '^(DIANTEIRA|TRASEIRA|SUPERIOR|INFERIOR)(_(DIANTEIRA|TRASEIRA|SUPERIOR|INFERIOR)){0,3}$'
