/**
 * Período de aplicação (PVC): year_start / year_end é a fonte de verdade.
 * vehicle_versions.year é legado / opcional.
 * Formatação visual (card/apps): YY/YY · YY/... · .../YY — sem alterar PVC.
 *
 * Regra única (filtro, match e SQL):
 *   AnoFinalEfetivo = yearEnd ?? anoCivilAtual
 *   compatível ⇔ yearStart <= ano <= AnoFinalEfetivo (quando há período PVC)
 * Match/SQL tratam year_end nulo como aberto (sem teto no “hoje”);
 * o seletor limita a expansão ao ano civil atual (sem anos futuros).
 */

/** @deprecated Preferir formato `.../YY` via formatVehicleAppYear. */
export const YEAR_NO_START_LABEL = 'Sem ano inicial'

function isValidYear(n: number): boolean {
  return Number.isInteger(n) && n >= 1950 && n <= 2100
}

/** Abrevia ano para dois dígitos (1997→97, 2005→05). */
export function toYy(year: number): string | null {
  if (!isValidYear(year)) return null
  return String(year % 100).padStart(2, '0')
}

/**
 * Anos civis do intervalo de fabricação do modelo (início → fim).
 * Sem início: []. Sem fim: até o ano civil atual. Cap em nowYear.
 */
export function productionYearOptions(
  yearStart: number | null | undefined,
  yearEnd: number | null | undefined,
  nowYear: number = new Date().getFullYear(),
): number[] {
  if (yearStart == null || !isValidYear(yearStart)) return []
  const end = effectiveYearEnd(yearEnd, nowYear)
  if (end < yearStart) return []
  const out: number[] = []
  for (let y = yearStart; y <= end; y += 1) out.push(y)
  return out
}

/**
 * Anos para seletor de fabricação do modelo (cadastro): 1950 → ano civil atual.
 * Ordem decrescente (mais recente primeiro).
 */
export function catalogFabricationYearOptions(
  nowYear: number = new Date().getFullYear(),
): number[] {
  const out: number[] = []
  for (let y = nowYear; y >= 1950; y -= 1) out.push(y)
  return out
}

/**
 * Fim efetivo do período para UI/expansão de filtros.
 * year_end preenchido = encerra naquele ano; vazio = vigente até o ano civil atual.
 */
export function effectiveYearEnd(
  yearEnd: number | null | undefined,
  nowYear: number = new Date().getFullYear(),
): number {
  return yearEnd != null ? yearEnd : nowYear
}

/**
 * Label de apresentação do período no card (ex.: 12/...).
 * Não modifica dados de origem; filtros usam yearMatchesVehicleApp (ints).
 */
export function formatVehicleAppYear(input: {
  yearStart?: number | null
  yearEnd?: number | null
  versionYear?: number | null
}): string | null {
  const start = input.yearStart ?? null
  const end = input.yearEnd ?? null

  if (start != null && end != null) {
    if (!isValidYear(start) || !isValidYear(end)) return null
    const a = toYy(start)
    const b = toYy(end)
    if (a == null || b == null) return null
    if (start === end) return a
    return `${a}/${b}`
  }
  if (start != null && end == null) {
    if (!isValidYear(start)) return null
    const a = toYy(start)
    return a == null ? null : `${a}/...`
  }
  if (start == null && end != null) {
    if (!isValidYear(end)) return null
    const b = toYy(end)
    return b == null ? null : `.../${b}`
  }
  if (input.versionYear != null) {
    return toYy(input.versionYear)
  }
  return null
}

/**
 * Expande YY → YYYY (convenção autopeças: ≥50 → 19xx, senão 20xx).
 * Aceita também YYYY já completo.
 */
export function expandTwoDigitYear(n: number): number | null {
  if (!Number.isInteger(n)) return null
  if (n >= 1950 && n <= 2100) return n
  if (n < 0 || n > 99) return null
  const full = n >= 50 ? 1900 + n : 2000 + n
  return isValidYear(full) ? full : null
}

/**
 * Parse de um ano isolado: `1999`, `99`.
 * Retorna null se vazio; erro se inválido.
 */
export function parseYearToken(
  raw: string,
): { ok: true; year: number | null } | { ok: false; message: string } {
  const t = raw.trim()
  if (!t) return { ok: true, year: null }
  if (!/^\d{1,4}$/.test(t)) {
    return { ok: false, message: 'Ano inválido' }
  }
  const n = Number(t)
  if (t.length <= 2) {
    const full = expandTwoDigitYear(n)
    if (full == null) return { ok: false, message: 'Ano inválido' }
    return { ok: true, year: full }
  }
  if (!isValidYear(n)) return { ok: false, message: 'Ano inválido' }
  return { ok: true, year: n }
}

/**
 * Detecta faixa em um único campo: `99/10`, `1999/2010`, `1999-2010`.
 */
export function parseYearRangeToken(
  raw: string,
):
  | { ok: true; yearStart: number; yearEnd: number }
  | { ok: false; message: string }
  | null {
  const t = raw.trim()
  if (!t) return null
  const m = t.match(/^(\d{2}|\d{4})\s*[/\-–]\s*(\d{2}|\d{4})$/)
  if (!m) return null
  const a = parseYearToken(m[1])
  const b = parseYearToken(m[2])
  if (!a.ok) return { ok: false, message: a.message }
  if (!b.ok) return { ok: false, message: b.message }
  if (a.year == null || b.year == null) {
    return { ok: false, message: 'Período inválido' }
  }
  if (b.year < a.year) {
    return { ok: false, message: 'Ano fim menor que ano início' }
  }
  return { ok: true, yearStart: a.year, yearEnd: b.year }
}

/**
 * Valida inputs de período PVC no admin.
 * Aceita YYYY, YY e faixa no início (`99/10`) se o fim estiver vazio.
 * Ano final opcional (vazio = vigente).
 */
export function validatePvcYearInputs(
  startRaw: string,
  endRaw: string,
):
  | { ok: true; yearStart: number; yearEnd: number | null }
  | { ok: false; message: string } {
  const s = startRaw.trim()
  const e = endRaw.trim()
  if (!s) {
    return { ok: false, message: 'Ano inicial é obrigatório' }
  }

  if (!e) {
    const range = parseYearRangeToken(s)
    if (range) {
      if (!range.ok) return range
      return { ok: true, yearStart: range.yearStart, yearEnd: range.yearEnd }
    }
  }

  const start = parseYearToken(s)
  if (!start.ok) return { ok: false, message: 'Ano início inválido' }
  if (start.year == null) {
    return { ok: false, message: 'Ano inicial é obrigatório' }
  }

  if (!e) {
    return { ok: true, yearStart: start.year, yearEnd: null }
  }

  const end = parseYearToken(e)
  if (!end.ok || end.year == null) {
    return { ok: false, message: 'Ano fim inválido' }
  }
  if (end.year < start.year) {
    return { ok: false, message: 'Ano fim menor que ano início' }
  }
  return { ok: true, yearStart: start.year, yearEnd: end.year }
}

/**
 * Aviso suave: período PVC fora da janela de fabricação do modelo.
 * Sem fab no modelo → sem aviso. Não bloqueia gravação.
 */
export function pvcPeriodOutsideModelFabWarning(input: {
  yearStart: number
  yearEnd: number | null
  productionYearStart?: number | null
  productionYearEnd?: number | null
}): string | null {
  const fabStart = input.productionYearStart ?? null
  const fabEnd = input.productionYearEnd ?? null
  if (fabStart == null && fabEnd == null) return null

  const appStart = input.yearStart
  const appEnd = input.yearEnd
  let outside = false
  if (fabStart != null && appStart < fabStart) outside = true
  if (fabEnd != null && appStart > fabEnd) outside = true
  if (appEnd != null) {
    if (fabStart != null && appEnd < fabStart) outside = true
    if (fabEnd != null && appEnd > fabEnd) outside = true
  }

  if (!outside) return null
  const fabLabel =
    formatVehicleAppYear({ yearStart: fabStart, yearEnd: fabEnd }) ?? '—'
  const appLabel =
    formatVehicleAppYear({ yearStart: appStart, yearEnd: appEnd }) ?? '—'
  return `Atenção: período da aplicação (${appLabel}) está fora da fabricação do modelo (${fabLabel}). Salvando mesmo assim.`
}

/** Ano escolhido no filtro cabe no período da aplicação? */
export function yearMatchesVehicleApp(
  year: number,
  yearStart: number | null | undefined,
  yearEnd: number | null | undefined,
  versionYear: number | null | undefined = null,
): boolean {
  if (!Number.isFinite(year)) return false
  const hasRange = yearStart != null || yearEnd != null
  if (hasRange) {
    if (yearStart != null && year < yearStart) return false
    if (yearEnd != null && year > yearEnd) return false
    return true
  }
  return versionYear != null && versionYear === year
}

function pushYearSpan(out: Set<number>, lo: number, hi: number, maxSpan: number) {
  if (hi < lo) return
  if (hi - lo <= maxSpan) {
    for (let y = lo; y <= hi; y += 1) out.add(y)
  } else {
    out.add(lo)
    out.add(hi)
  }
}

/**
 * Anos discretos para popular o seletor a partir de um período PVC.
 * Aberto (yearEnd null): yearStart … anoCivilAtual (sem inventar futuros).
 */
export function expandYearsForSelector(
  yearStart: number | null | undefined,
  yearEnd: number | null | undefined,
  versionYear: number | null | undefined = null,
  maxSpan = 40,
  nowYear: number = new Date().getFullYear(),
): number[] {
  const out = new Set<number>()
  if (versionYear != null) out.add(versionYear)

  if (yearStart != null && yearEnd != null) {
    const lo = Math.min(yearStart, yearEnd)
    const hi = Math.max(yearStart, yearEnd)
    pushYearSpan(out, lo, hi, maxSpan)
  } else if (yearStart != null) {
    const hi = effectiveYearEnd(null, nowYear)
    pushYearSpan(out, yearStart, hi, maxSpan)
  } else if (yearEnd != null) {
    out.add(yearEnd)
  }

  return [...out].sort((a, b) => b - a)
}
