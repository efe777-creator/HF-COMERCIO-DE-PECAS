import {
  formatMethodAdjustLabel,
  PAYMENT_METHOD_LABELS,
} from '@/lib/paymentMethodAdjust'
import {
  listPublicPaymentConditions,
  type PublicPaymentCondition,
} from '@/services/paymentConditionService'
import { useEffect, useState } from 'react'

/** Bloco informativo de condições liberadas (guest ou B2B). Sem checkout. */
export function PaymentConditionsNotice({
  audience = 'guest',
  groupId = null,
  defaultConditionId = null,
  customerId = null,
  className = '',
}: {
  audience?: 'guest' | 'customer'
  groupId?: string | null
  defaultConditionId?: string | null
  /** Cliente B2B: filtra pelas condições vinculadas (vazio → só À vista). */
  customerId?: string | null
  className?: string
}) {
  const [items, setItems] = useState<PublicPaymentCondition[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const rows = await listPublicPaymentConditions({
          audience,
          groupId,
          defaultConditionId,
          customerId: audience === 'customer' ? customerId : null,
        })
        if (!cancelled) setItems(rows)
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Não foi possível carregar condições')
          setItems([])
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [audience, groupId, defaultConditionId, customerId])

  if (error || items.length === 0) return null

  return (
    <section
      className={['rounded-[14px] border border-hf-line bg-hf-surface p-4', className].join(' ')}
      aria-label="Condições de pagamento"
    >
      <h2 className="m-0 text-xs font-bold uppercase tracking-wide text-hf-muted">
        Condições de pagamento
      </h2>
      <p className="mt-1 text-sm text-hf-muted">
        Informativo comercial HF — fechamento via cotação ou atendimento. Sem checkout online.
      </p>
      <ul className="mt-3 list-none space-y-3 p-0">
        {items.map((c) => {
          const methods = c.methods.filter((m) => m.enabled)
          return (
            <li
              key={c.id}
              className="rounded-[10px] border border-hf-line bg-hf-bg/40 p-3 first:mt-0"
            >
              <p className="m-0 font-bold text-hf-ink">
                {c.name}{' '}
                <span className="font-mono text-xs font-normal text-hf-muted">({c.code})</span>
              </p>
              <p className="m-0 text-sm text-hf-muted">{c.scheduleLabel}</p>
              {c.minSubtotal != null && c.minSubtotal > 0 ? (
                <p className="m-0 text-xs text-hf-muted">
                  A partir de{' '}
                  {c.minSubtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              ) : null}
              {methods.length ? (
                <p className="m-0 mt-1 text-xs text-hf-muted">
                  Meios:{' '}
                  {methods
                    .map(
                      (m) =>
                        `${PAYMENT_METHOD_LABELS[m.method]} (${formatMethodAdjustLabel(m)})`,
                    )
                    .join(' · ')}
                </p>
              ) : null}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
