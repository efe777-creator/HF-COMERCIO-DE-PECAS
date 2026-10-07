/** Normaliza CEP para exatamente os dígitos (0–8). */
export function normalizeCep(value: string): string {
  return value.replace(/\D/g, '').slice(0, 8)
}

/** Máscara de exibição 00000-000. */
export function formatCepMask(value: string): string {
  const d = normalizeCep(value)
  if (d.length <= 5) return d
  return `${d.slice(0, 5)}-${d.slice(5)}`
}

export function isCompleteCep(value: string): boolean {
  return normalizeCep(value).length === 8
}
