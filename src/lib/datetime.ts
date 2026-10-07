/** Datas: exibição DD/MM/AAAA; datetime-local ↔ ISO com fuso local explícito. */

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** Exibição data: 04/10/2026 */
export function formatDate(value: string | Date | null | undefined): string {
  if (value == null || value === '') return ''
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('pt-BR')
}

/** Exibição data+hora: 04/10/2026 14:35 */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (value == null || value === '') return ''
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * ISO/timestamptz → valor de input datetime-local no fuso local.
 * Evita o bug de .slice(0,16) em strings UTC.
 */
export function isoToDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

/**
 * Valor de datetime-local (parede local) → ISO UTC para persistência.
 */
export function datetimeLocalToIso(value: string | null | undefined): string | null {
  if (!value?.trim()) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}
