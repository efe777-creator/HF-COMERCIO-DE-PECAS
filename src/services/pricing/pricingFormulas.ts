/**
 * Formação de preço F8.1 (D6 / D15 / D16).
 * Pure — sem I/O. Usado por UI e testes; apply RPC usará a mesma matemática.
 *
 * custo_total = base * (1 + list_extra_cost_percent/100) + item.extra_cost [+ list_extra_cost R$ se passado]
 * list_extra_cost (R$) permanece campo paralelo placeholder — callers atuais passam 0.
 */

export type PricingMethod = 'markup_on_cost' | 'margin_on_sell' | 'fixed'

/** custo_total = custo_base ajustado por % da lista + custo_adicional_item (+ list_extra_cost R$ se informado). */
export function computeCostTotal(
  baseCost: number,
  itemExtraCost = 0,
  listExtraCost = 0,
  listExtraCostPercent = 0,
): number {
  const pct = Number.isFinite(listExtraCostPercent) ? listExtraCostPercent : 0
  const baseAdjusted = baseCost * (1 + pct / 100)
  return roundMoney(baseAdjusted + itemExtraCost + listExtraCost)
}

export function calculateSellPrice(
  costTotal: number,
  method: PricingMethod,
  percent: number,
): number | null {
  if (method === 'fixed') return null
  if (!(costTotal >= 0) || !Number.isFinite(costTotal)) return null
  if (!Number.isFinite(percent)) return null

  if (method === 'markup_on_cost') {
    return roundMoney(costTotal * (1 + percent / 100))
  }

  // margin_on_sell: preço = C / (1 - p/100)
  if (percent >= 100) return null
  const denom = 1 - percent / 100
  if (denom <= 0) return null
  return roundMoney(costTotal / denom)
}

/** Margem sobre venda efetiva: (P - C) / P. Retorna fração 0–1 (não %). */
export function effectiveMarginFraction(sellPrice: number, costTotal: number): number | null {
  if (!(sellPrice > 0) || !Number.isFinite(sellPrice) || !Number.isFinite(costTotal)) return null
  return (sellPrice - costTotal) / sellPrice
}

/** Markup efetivo sobre custo: (P - C) / C. Retorna fração (não %). */
export function effectiveMarkupFraction(sellPrice: number, costTotal: number): number | null {
  if (!(costTotal > 0) || !Number.isFinite(sellPrice) || !Number.isFinite(costTotal)) return null
  return (sellPrice - costTotal) / costTotal
}

export function toPercent(fraction: number | null): number | null {
  if (fraction == null || !Number.isFinite(fraction)) return null
  return roundMoney(fraction * 100)
}

/**
 * D16: só origem `calculated` deve recalcular preço a partir do custo.
 * imported/manual: preço é fonte; % efetivos são consequência.
 */
export function shouldRecalculatePriceOnCostChange(
  priceOrigin: 'calculated' | 'imported' | 'manual',
): boolean {
  return priceOrigin === 'calculated'
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100
}
