/** Macrorregião IBGE a partir da UF (SIGLA). */

export type BrMacroRegion = 'Norte' | 'Nordeste' | 'Sudeste' | 'Sul' | 'Centro-Oeste'

const UF_MACRO: Record<string, BrMacroRegion> = {
  AC: 'Norte',
  AP: 'Norte',
  AM: 'Norte',
  PA: 'Norte',
  RO: 'Norte',
  RR: 'Norte',
  TO: 'Norte',
  AL: 'Nordeste',
  BA: 'Nordeste',
  CE: 'Nordeste',
  MA: 'Nordeste',
  PB: 'Nordeste',
  PE: 'Nordeste',
  PI: 'Nordeste',
  RN: 'Nordeste',
  SE: 'Nordeste',
  ES: 'Sudeste',
  MG: 'Sudeste',
  RJ: 'Sudeste',
  SP: 'Sudeste',
  PR: 'Sul',
  RS: 'Sul',
  SC: 'Sul',
  DF: 'Centro-Oeste',
  GO: 'Centro-Oeste',
  MT: 'Centro-Oeste',
  MS: 'Centro-Oeste',
}

export const BR_UF_OPTIONS = Object.keys(UF_MACRO).sort()

export function macroRegionFromUf(uf: string | null | undefined): BrMacroRegion | null {
  if (!uf) return null
  return UF_MACRO[uf.trim().toUpperCase()] ?? null
}

/** Normaliza rótulo ViaCEP (`Sudeste`) ou similar. */
export function normalizeMacroRegionLabel(raw: string | null | undefined): BrMacroRegion | null {
  if (!raw) return null
  const t = raw.trim()
  const known: BrMacroRegion[] = ['Norte', 'Nordeste', 'Sudeste', 'Sul', 'Centro-Oeste']
  if (known.includes(t as BrMacroRegion)) return t as BrMacroRegion
  const lower = t.toLowerCase()
  if (lower.includes('centro')) return 'Centro-Oeste'
  if (lower.includes('nordeste')) return 'Nordeste'
  if (lower.includes('sudeste')) return 'Sudeste'
  if (lower === 'sul' || lower.includes('sul ')) return 'Sul'
  if (lower.includes('norte')) return 'Norte'
  return null
}
