/** Telefone BR: máscara dinâmica; persistência só dígitos. */

export function normalizePhone(value: string): string {
  return value.replace(/\D/g, '').slice(0, 11)
}

/** (11) 99999-9999 ou (11) 9999-9999 */
export function formatPhoneMask(value: string): string {
  const d = normalizePhone(value)
  if (d.length === 0) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  }
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

export function isValidPhone(value: string): boolean {
  const d = normalizePhone(value)
  return d.length === 10 || d.length === 11
}
