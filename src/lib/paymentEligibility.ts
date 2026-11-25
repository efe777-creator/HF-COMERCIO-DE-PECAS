/** Elegibilidade de condições liberadas (cliente + grupo + limiar). Pronto para carrinho futuro. */

export type EligibleConditionInput = {
  id?: string
  code?: string
  status: 'draft' | 'published'
  showToGuests: boolean
  showToCustomers: boolean
  minSubtotal: number | null
  /** Se definido, só grupos listados (vazio = qualquer cliente quando showToCustomers). */
  groupIds?: string[] | null
  defaultForGroupId?: string | null
}

export type EligibilityContext = {
  audience: 'guest' | 'customer' | 'staff'
  groupId?: string | null
  /** Subtotal do item ou do carrinho futuro. */
  subtotal?: number | null
  /**
   * IDs vinculados ao cliente. `undefined` = sem filtro por vínculo.
   * `[]` (cliente sem vínculo) = só AVISTA / à vista.
   */
  allowedConditionIds?: string[] | null
}

export const AVISTA_CONDITION_CODE = 'AVISTA'

export function isPaymentConditionEligible(
  condition: EligibleConditionInput,
  ctx: EligibilityContext,
): boolean {
  if (condition.status !== 'published' && ctx.audience !== 'staff') return false

  if (ctx.audience === 'guest') {
    if (!condition.showToGuests) return false
  } else if (ctx.audience === 'customer') {
    if (!condition.showToCustomers) return false
    if (condition.groupIds && condition.groupIds.length > 0) {
      if (!ctx.groupId || !condition.groupIds.includes(ctx.groupId)) return false
    }
    if (ctx.allowedConditionIds !== undefined && ctx.allowedConditionIds !== null) {
      if (ctx.allowedConditionIds.length === 0) {
        const code = (condition.code ?? '').toUpperCase()
        if (code !== AVISTA_CONDITION_CODE) return false
      } else if (!condition.id || !ctx.allowedConditionIds.includes(condition.id)) {
        return false
      }
    }
  }

  if (condition.minSubtotal != null && condition.minSubtotal > 0) {
    const sub = ctx.subtotal ?? 0
    if (!(sub >= condition.minSubtotal)) return false
  }

  return true
}

export function listEligibleConditions<T extends EligibleConditionInput>(
  conditions: T[],
  ctx: EligibilityContext,
): T[] {
  return conditions.filter((c) => isPaymentConditionEligible(c, ctx))
}
