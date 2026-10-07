/** Parse monetário BR seguro → número decimal. Persistência: number. */

export function parseMoneyBr(value: string | number | null | undefined): number | null {
  if (value == null || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null

  let s = String(value)
    .trim()
    .replace(/R\$\s?/gi, '')
    .replace(/\s/g, '')
  if (!s) return null

  // 1.234,56 → milhares com ponto, decimal com vírgula
  if (s.includes(',') && s.includes('.')) {
    s = s.replace(/\./g, '').replace(',', '.')
  } else if (s.includes(',')) {
    // 1234,56
    s = s.replace(',', '.')
  }
  // senão: 1234.56 ou 1234

  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

/** Exibição: R$ 1.234,56 */
export function formatMoney(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/** Valor para input text (sem R$): 1.234,56 */
export function formatMoneyInput(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return ''
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
