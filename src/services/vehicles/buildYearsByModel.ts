import { expandYearsForSelector } from '@/lib/vehicleAppYear'

export type YearSourceRow = {
  modelName: string
  versionYear: number | null
  yearStart: number | null
  yearEnd: number | null
  /** Fabricação do modelo (opcional) — amplia seletor quando não há PVC. */
  productionYearStart?: number | null
  productionYearEnd?: number | null
}

/**
 * Monta anos por modelo: períodos PVC (expandidos) + vv.year + fab do modelo.
 * Ordenação desc.
 */
export function buildYearsByModelFromSources(rows: YearSourceRow[]): Record<string, string[]> {
  const sets: Record<string, Set<number>> = {}

  for (const row of rows) {
    const modelName = row.modelName.trim()
    if (!modelName) continue
    sets[modelName] ??= new Set()

    for (const y of expandYearsForSelector(
      row.yearStart,
      row.yearEnd,
      row.versionYear,
    )) {
      sets[modelName].add(y)
    }

    if (row.yearStart == null && row.yearEnd == null && row.versionYear == null) {
      for (const y of expandYearsForSelector(
        row.productionYearStart ?? null,
        row.productionYearEnd ?? null,
        null,
      )) {
        sets[modelName].add(y)
      }
    }
  }

  const out: Record<string, string[]> = {}
  for (const [model, set] of Object.entries(sets)) {
    out[model] = [...set].sort((a, b) => b - a).map(String)
  }
  return out
}
