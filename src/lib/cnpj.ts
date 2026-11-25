/** CNPJ clássico (14 dígitos). Alfanumérico fica para próximo ciclo. */

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

export function formatCnpj(value: string): string {
  const d = onlyDigits(value).slice(0, 14)
  if (d.length <= 2) return d
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`
  if (d.length <= 12) {
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`
  }
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}

function calcDigit(base: string, weights: number[]): number {
  let sum = 0
  for (let i = 0; i < weights.length; i++) {
    sum += Number(base[i]) * weights[i]!
  }
  const mod = sum % 11
  return mod < 2 ? 0 : 11 - mod
}

/** Valida dígitos verificadores do CNPJ numérico. */
export function isValidCnpj(value: string): boolean {
  const d = onlyDigits(value)
  if (d.length !== 14) return false
  if (/^(\d)\1{13}$/.test(d)) return false

  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const d1 = calcDigit(d.slice(0, 12), w1)
  const d2 = calcDigit(d.slice(0, 12) + String(d1), w2)
  return d.endsWith(`${d1}${d2}`)
}
