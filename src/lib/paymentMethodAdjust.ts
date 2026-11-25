/** Ajuste comercial do preço da lista por meio de pagamento (acréscimo ou desconto). */

export type PaymentMethodKind = 'pix' | 'debit' | 'credit' | 'boleto' | 'cash'
export type PaymentAdjustKind = 'none' | 'percent' | 'fixed'
export type PaymentAdjustSign = 'surcharge' | 'discount'

export type PaymentMethodAdjustInput = {
  adjustKind: PaymentAdjustKind
  adjustSign: PaymentAdjustSign
  adjustValue: number
}

/** Arredonda BRL em 2 casas (half-up). */
export function roundBrl(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round((value + Number.EPSILON) * 100) / 100
}

/**
 * Preço exibido = base da lista ± ajuste do meio.
 * Não altera price_list_items; só camada comercial.
 */
export function applyMethodAdjustment(
  baseAmount: number,
  method: PaymentMethodAdjustInput,
): number {
  const base = Number.isFinite(baseAmount) ? baseAmount : 0
  if (method.adjustKind === 'none' || !(method.adjustValue > 0)) {
    return roundBrl(base)
  }
  const mag = method.adjustValue
  const signed =
    method.adjustSign === 'discount'
      ? method.adjustKind === 'percent'
        ? base * (1 - mag / 100)
        : base - mag
      : method.adjustKind === 'percent'
        ? base * (1 + mag / 100)
        : base + mag
  return roundBrl(Math.max(0, signed))
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodKind, string> = {
  pix: 'Pix',
  debit: 'Débito',
  credit: 'Crédito',
  boleto: 'Boleto',
  cash: 'Dinheiro',
}

export function formatMethodAdjustLabel(method: PaymentMethodAdjustInput): string {
  if (method.adjustKind === 'none' || !(method.adjustValue > 0)) return 'sem ajuste'
  const verb = method.adjustSign === 'discount' ? 'desconto' : 'acréscimo'
  if (method.adjustKind === 'percent') {
    return `${verb} ${method.adjustValue.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`
  }
  return `${verb} R$ ${method.adjustValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
