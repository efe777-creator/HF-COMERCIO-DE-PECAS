/** CPF/CNPJ: máscara = apresentação; onlyDigits = persistência; isValid* = domínio. */

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

/** 000.000.000-00 */
export function formatCpfMask(value: string): string {
  const d = onlyDigits(value).slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

/** 00.000.000/0000-00 */
export function formatCnpjMask(value: string): string {
  const d = onlyDigits(value).slice(0, 14)
  if (d.length <= 2) return d
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}

export function formatDocumentMask(kind: 'cpf' | 'cnpj', value: string): string {
  return kind === 'cpf' ? formatCpfMask(value) : formatCnpjMask(value)
}

export function isValidCpf(value: string): boolean {
  const cpf = onlyDigits(value)
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false
  let sum = 0
  for (let i = 0; i < 9; i++) sum += Number(cpf[i]) * (10 - i)
  let d1 = (sum * 10) % 11
  if (d1 === 10) d1 = 0
  if (d1 !== Number(cpf[9])) return false
  sum = 0
  for (let i = 0; i < 10; i++) sum += Number(cpf[i]) * (11 - i)
  let d2 = (sum * 10) % 11
  if (d2 === 10) d2 = 0
  return d2 === Number(cpf[10])
}

export function isValidCnpj(value: string): boolean {
  const cnpj = onlyDigits(value)
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false
  const calc = (base: string, factors: number[]) => {
    const sum = factors.reduce((acc, f, i) => acc + Number(base[i]) * f, 0)
    const rest = sum % 11
    return rest < 2 ? 0 : 11 - rest
  }
  const d1 = calc(cnpj, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  const d2 = calc(cnpj, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  return d1 === Number(cnpj[12]) && d2 === Number(cnpj[13])
}
