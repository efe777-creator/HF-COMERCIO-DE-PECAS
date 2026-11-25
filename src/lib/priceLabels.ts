/**
 * Vocabulário oficial de preços / listas (espelho FAL DIV-001).
 * Item de lista NÃO tem active/inactive — só com preço / sem preço.
 */

export type PriceOriginCode = 'calculated' | 'imported' | 'manual'

/** Regra: price > 0 = com preço. */
export function isPriceListItemPriced(price: number | null | undefined): boolean {
  return Number(price) > 0
}

export function priceListItemPricingStateLabel(
  price: number | null | undefined,
): 'Com preço' | 'Sem preço' {
  return isPriceListItemPriced(price) ? 'Com preço' : 'Sem preço'
}

export function priceOriginLabel(origin: PriceOriginCode | string): string {
  if (origin === 'calculated') return 'Calculado'
  if (origin === 'imported') return 'Importado'
  return 'Manual'
}

export const PRICE_LIST_LAYERS_HINT =
  'Lista Ativa/Inativa não é o mesmo que item Com preço/Sem preço, nem que produto disponível na loja. Listas assigned (B2B) vinculam o cliente em Clientes.'

export const PRICE_LIST_ASSIGNED_HINT =
  'Lista B2B (assigned): vincule em Clientes → lista assigned. O resolve usa esta lista antes da vitrine pública.'

export const PRICE_LIST_PRIORITY_HINT =
  'Prioridade da lista: desempate do preço na loja (maior vence entre listas públicas ativas).'

export const PRICE_ORIGIN_VS_METHOD_HINT =
  'Origem do item (Calculado / Importado / Manual) não é o método de formação da lista (Margem / Markup / Fixo).'

/** Lista com markup/margem: cálculo ativo — venda CALCULATED segue a regra; Manual/Importado ficam de fora. */
export const FORMATION_ACTIVE_HINT =
  'Cálculo ativo: itens Calculados seguem a regra da lista. Por item dá para fixar preço Manual (fica fora do recálculo) ou voltar à regra.'

/** Lista em modo fixo: cálculo desligado, colunas informativas permanecem. */
export const FORMATION_INACTIVE_HINT =
  'Cálculo desativado (modo Fixo). Custo, adicional, margem e markup permanecem informativos; preço pode ser editado manualmente.'

/** Hints curtos para faixa compacta (guia). */
export const FORMATION_ACTIVE_HINT_SHORT =
  'Calculados seguem a regra · Manual por item fica fora do recálculo.'

export const FORMATION_INACTIVE_HINT_SHORT =
  'Modo Fixo · custo/margem informativos · preço manual liberado.'

export function isPriceListFormationActive(
  method: string | null | undefined,
): boolean {
  return method === 'markup_on_cost' || method === 'margin_on_sell'
}
