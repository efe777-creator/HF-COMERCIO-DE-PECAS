import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import {
  FORMATION_ACTIVE_HINT,
  FORMATION_ACTIVE_HINT_SHORT,
  FORMATION_INACTIVE_HINT,
  FORMATION_INACTIVE_HINT_SHORT,
} from '@/lib/priceLabels'
import {
  isPriceListFormationActive,
  pricingMethodLabel,
  pricingRuleLabel,
} from '@/services/admin/adminPriceListService'
import {
  pricingPercentInputLabel,
  type PricingMethod,
} from '@/services/pricing/pricingFormulas'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'

type Props = {
  listId: string
  listName: string
  pricingMethod: PricingMethod
  pricingPercent: number
  listExtraCostPercent?: number
  compact?: boolean
  /** Se informado, faixa vira controle global editável. */
  editable?: boolean
  allowed?: boolean
  busy?: boolean
  onSaveKeepPrices?: (input: {
    method: PricingMethod
    percent: number
    extraCostPercent: number
  }) => void | Promise<void>
  onApplyToSell?: (input: {
    method: PricingMethod
    percent: number
    extraCostPercent: number
  }) => void | Promise<void>
}

/** Faixa global: status do cálculo + (opcional) editar margem/adicional da lista. */
export function PriceListFormationControls({
  listId,
  listName,
  pricingMethod,
  pricingPercent,
  listExtraCostPercent = 0,
  compact = false,
  editable = false,
  allowed = false,
  busy = false,
  onSaveKeepPrices,
  onApplyToSell,
}: Props) {
  const [method, setMethod] = useState<PricingMethod>(pricingMethod)
  const [percent, setPercent] = useState(String(pricingPercent ?? 0))
  const [extraPct, setExtraPct] = useState(String(listExtraCostPercent ?? 0))

  useEffect(() => {
    setMethod(pricingMethod)
    setPercent(String(pricingPercent ?? 0))
    setExtraPct(String(listExtraCostPercent ?? 0))
  }, [pricingMethod, pricingPercent, listExtraCostPercent])

  const active = isPriceListFormationActive(method)
  const persistedActive = isPriceListFormationActive(pricingMethod)
  const rule = pricingRuleLabel(pricingMethod, pricingPercent)
  const methodLabel = pricingMethodLabel(pricingMethod)
  const hintTone = persistedActive ? 'text-emerald-200/90' : 'text-amber-200/90'
  const labelTone = persistedActive ? 'text-emerald-200' : 'text-amber-200'

  function parseFields(): { method: PricingMethod; percent: number; extraCostPercent: number } {
    const pct = Number(String(percent).replace(',', '.'))
    const extra = Number(String(extraPct).replace(',', '.'))
    if (!Number.isFinite(pct) || pct < 0) throw new Error('Percentual da regra inválido')
    if (method === 'margin_on_sell' && pct >= 100) {
      throw new Error('Margem deve ser menor que 100%')
    }
    if (!Number.isFinite(extra) || extra < 0) throw new Error('Adicional de custo (%) inválido')
    return { method, percent: pct, extraCostPercent: extra }
  }

  return (
    <div
      className={`rounded-[10px] border px-3 py-2 ${
        persistedActive
          ? 'border-emerald-600/40 bg-emerald-950/50 text-emerald-100'
          : 'border-amber-600/40 bg-amber-950/45 text-amber-100'
      }`}
      role="status"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="m-0 text-sm font-extrabold">
            {persistedActive ? 'Cálculo ativo' : 'Cálculo desativado'}
            <span className={`ml-2 font-semibold ${hintTone}`}>
              · {methodLabel}
              {persistedActive && rule !== '—' ? ` ${rule}` : ''}
              {!compact ? ` · ${listName}` : ''}
            </span>
          </p>
          <p className={`mb-0 mt-1 text-xs ${hintTone}`}>
            {compact
              ? persistedActive
                ? FORMATION_ACTIVE_HINT_SHORT
                : FORMATION_INACTIVE_HINT_SHORT
              : persistedActive
                ? FORMATION_ACTIVE_HINT
                : FORMATION_INACTIVE_HINT}
          </p>
          {!editable && !compact ? (
            <p className={`mb-0 mt-1 text-xs ${hintTone}`}>
              Adicional de custo da lista:{' '}
              <strong className="text-inherit">
                {Number(listExtraCostPercent).toLocaleString('pt-BR', {
                  maximumFractionDigits: 2,
                })}
                %
              </strong>{' '}
              (entra no custo total antes da margem/markup).
            </p>
          ) : null}
        </div>
        {!editable ? (
          <Link
            to={`/admin/precos/${listId}?tab=formacao`}
            className="shrink-0 text-sm font-extrabold underline"
          >
            {persistedActive ? 'Ajustar formação' : 'Ativar formação'}
          </Link>
        ) : (
          <Link
            to={`/admin/precos/${listId}?tab=formacao`}
            className={`shrink-0 text-xs font-semibold underline ${hintTone}`}
          >
            Aba Formação
          </Link>
        )}
      </div>

      {editable ? (
        <div
          className={`mt-3 grid gap-2 border-t border-white/10 pt-3 ${
            compact ? 'grid-cols-1 sm:grid-cols-2' : 'md:grid-cols-4'
          }`}
        >
          <label className="block text-sm">
            <span className={`mb-1 block text-xs font-extrabold ${labelTone}`}>Regra global</span>
            <select
              className="w-full rounded-[9px] border border-hf-line bg-hf-surface-2 px-3 py-2 text-hf-ink"
              value={method}
              disabled={busy || !allowed}
              onChange={(e) => setMethod(e.target.value as PricingMethod)}
            >
              <option value="fixed">Fixo (sem cálculo)</option>
              <option value="markup_on_cost">Markup sobre custo</option>
              <option value="margin_on_sell">Margem sobre venda</option>
            </select>
          </label>
          <Input
            label={pricingPercentInputLabel(method)}
            value={percent}
            disabled={busy || !allowed || method === 'fixed'}
            onChange={(e) => setPercent(e.target.value)}
            hint={compact ? undefined : 'Margem/markup da lista inteira.'}
          />
          <Input
            label="Adicional de custo (%)"
            value={extraPct}
            disabled={busy || !allowed}
            onChange={(e) => setExtraPct(e.target.value)}
            hint={compact ? undefined : 'Global da lista — entra no custo total.'}
          />
          <div className={`flex flex-wrap items-end gap-2 ${compact ? 'sm:col-span-2' : ''}`}>
            <Button
              type="button"
              variant="light"
              disabled={busy || !allowed || !onSaveKeepPrices}
              onClick={() => {
                try {
                  void onSaveKeepPrices?.(parseFields())
                } catch (e) {
                  window.alert(e instanceof Error ? e.message : 'Dados inválidos')
                }
              }}
            >
              Salvar (manter venda)
            </Button>
            <Button
              type="button"
              disabled={busy || !allowed || !active || !onApplyToSell}
              onClick={() => {
                try {
                  void onApplyToSell?.(parseFields())
                } catch (e) {
                  window.alert(e instanceof Error ? e.message : 'Dados inválidos')
                }
              }}
            >
              Aplicar → venda
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
