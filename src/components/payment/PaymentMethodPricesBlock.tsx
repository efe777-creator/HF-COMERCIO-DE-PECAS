import { formatMoney } from '@/lib/money'
import {
  applyMethodAdjustment,
  formatMethodAdjustLabel,
  PAYMENT_METHOD_LABELS,
} from '@/lib/paymentMethodAdjust'
import {
  listPublicPaymentConditions,
  resolveCustomerListPrice,
  type PublicPaymentCondition,
} from '@/services/paymentConditionService'
import { useEffect, useMemo, useState } from 'react'

/**
 * B2B: preço da lista + preços por meio da condição liberada.
 * Se não houver base de lista, mostra só texto da condição.
 */
export function PaymentMethodPricesBlock({
  productId,
  fallbackBasePrice = null,
  groupId = null,
  defaultConditionId = null,
  customerId = null,
}: {
  productId: string
  fallbackBasePrice?: number | null
  groupId?: string | null
  defaultConditionId?: string | null
  /** Filtra condições vinculadas ao cliente (vazio → só À vista). */
  customerId?: string | null
}) {
  const [conditions, setConditions] = useState<PublicPaymentCondition[]>([])
  const [listPrice, setListPrice] = useState<number | null>(null)
  const [conditionId, setConditionId] = useState<string>('')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const [conds, price] = await Promise.all([
          listPublicPaymentConditions({
            audience: 'customer',
            groupId,
            defaultConditionId,
            customerId,
            subtotal: fallbackBasePrice,
          }),
          resolveCustomerListPrice(productId),
        ])
        if (cancelled) return
        setConditions(conds)
        setListPrice(price)
        const prefer =
          (defaultConditionId && conds.find((c) => c.id === defaultConditionId)?.id) ||
          conds[0]?.id ||
          ''
        setConditionId(prefer)
      } catch {
        if (!cancelled) {
          setConditions([])
          setListPrice(null)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [productId, groupId, defaultConditionId, fallbackBasePrice, customerId])

  const active = useMemo(
    () => conditions.find((c) => c.id === conditionId) ?? conditions[0] ?? null,
    [conditions, conditionId],
  )

  const base = listPrice ?? (fallbackBasePrice != null && fallbackBasePrice > 0 ? fallbackBasePrice : null)

  if (!conditions.length) return null

  const methods = (active?.methods ?? []).filter((m) => m.enabled)

  return (
    <div className="rounded-[14px] border border-hf-line bg-hf-bg/50 p-3" data-payment-prices>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="m-0 text-xs font-extrabold uppercase tracking-wide text-hf-muted">
            Preço × condição
          </p>
          {base != null ? (
            <p className="m-0 text-sm text-hf-ink">
              Lista: <strong>{formatMoney(base)}</strong>
            </p>
          ) : (
            <p className="m-0 text-sm text-hf-muted">Lista sem preço para este item — só condições.</p>
          )}
        </div>
        {conditions.length > 1 ? (
          <select
            className="rounded-[9px] border border-hf-line bg-hf-surface px-2 py-1.5 text-sm text-hf-ink outline-none focus:border-hf-red focus:shadow-[0_0_0_3px_rgba(197,23,31,0.25)]"
            value={active?.id ?? ''}
            onChange={(e) => setConditionId(e.target.value)}
            aria-label="Condição de pagamento"
          >
            {conditions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        ) : (
          <p className="m-0 text-sm font-semibold text-hf-ink">{active?.name}</p>
        )}
      </div>
      {active ? (
        <p className="mt-1 text-xs text-hf-muted">{active.scheduleLabel}</p>
      ) : null}
      {methods.length && base != null ? (
        <ul className="mt-2 list-none space-y-1 p-0">
          {methods.map((m) => {
            const price = applyMethodAdjustment(base, m)
            return (
              <li
                key={m.method}
                className="flex flex-wrap items-baseline justify-between gap-2 text-sm"
              >
                <span>
                  {PAYMENT_METHOD_LABELS[m.method]}{' '}
                  <span className="text-xs text-hf-muted">({formatMethodAdjustLabel(m)})</span>
                </span>
                <strong>{formatMoney(price)}</strong>
              </li>
            )
          })}
        </ul>
      ) : methods.length ? (
        <p className="mt-2 text-xs text-hf-muted">
          Meios:{' '}
          {methods
            .map((m) => `${PAYMENT_METHOD_LABELS[m.method]} (${formatMethodAdjustLabel(m)})`)
            .join(' · ')}
        </p>
      ) : null}
    </div>
  )
}
