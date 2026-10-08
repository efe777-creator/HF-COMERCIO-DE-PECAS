import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { CODIGO_REFERENCIA_LABEL } from '@/lib/productLabels'
import { formatMoney, formatMoneyInput, parseMoneyBr } from '@/lib/money'
import type { PriceList, PriceListItem } from '@/services/admin/adminPriceListService'
import {
  calculateSellPrice,
  effectiveMarginFraction,
  effectiveMarkupFraction,
  toPercent,
  type PricingMethod,
} from '@/services/pricing/pricingFormulas'
import { useEffect, useMemo, useState } from 'react'

export type PricingEditMode = 'apply_list_rule' | 'edit_rule_percent' | 'manual_price'

export type PricingEditResult =
  | { mode: 'apply_list_rule' }
  | { mode: 'edit_rule_percent'; percent: number; price: number }
  | { mode: 'manual_price'; price: number }

type Props = {
  open: boolean
  item: PriceListItem | null
  list: PriceList | null
  busy?: boolean
  onClose: () => void
  onSave: (result: PricingEditResult) => void | Promise<void>
}

function fmtPct(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return `${n.toFixed(2)}%`
}

export function PriceItemPricingModal({ open, item, list, busy, onClose, onSave }: Props) {
  const [editMode, setEditMode] = useState<PricingEditMode>('apply_list_rule')
  const [rulePct, setRulePct] = useState('')
  const [priceStr, setPriceStr] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !item || !list) return
    setEditMode('apply_list_rule')
    setRulePct(String(list.pricingPercent))
    setPriceStr(formatMoneyInput(item.price))
    setError(null)
  }, [open, item, list])

  const costTotal = item?.costTotal ?? item?.baseCost ?? null
  const method: PricingMethod = list?.pricingMethod ?? 'fixed'

  const preview = useMemo(() => {
    if (!item || costTotal == null) {
      return { price: null as number | null, markup: null as number | null, margin: null as number | null }
    }
    let price: number | null = item.price
    if (editMode === 'apply_list_rule' && list && method !== 'fixed') {
      price = calculateSellPrice(costTotal, method, list.pricingPercent)
    } else if (editMode === 'edit_rule_percent' && method !== 'fixed') {
      const pct = Number(String(rulePct).replace(',', '.'))
      price = Number.isFinite(pct) ? calculateSellPrice(costTotal, method, pct) : null
    } else if (editMode === 'manual_price') {
      price = parseMoneyBr(priceStr)
    }
    const markup = price != null ? toPercent(effectiveMarkupFraction(price, costTotal)) : null
    const margin = price != null ? toPercent(effectiveMarginFraction(price, costTotal)) : null
    return { price, markup, margin }
  }, [item, costTotal, editMode, list, method, rulePct, priceStr])

  if (!open || !item || !list) return null

  async function handleSave() {
    setError(null)
    if (editMode === 'apply_list_rule') {
      if (method === 'fixed') {
        setError('Lista em modo fixo — use preço manual')
        return
      }
      if (costTotal == null) {
        setError('Sem custo — não é possível aplicar a regra')
        return
      }
      await onSave({ mode: 'apply_list_rule' })
      return
    }
    if (editMode === 'edit_rule_percent') {
      const pct = Number(String(rulePct).replace(',', '.'))
      if (!Number.isFinite(pct) || pct < 0) {
        setError('Percentual inválido')
        return
      }
      if (method === 'margin_on_sell' && pct >= 100) {
        setError('Margem deve ser menor que 100%')
        return
      }
      if (costTotal == null || preview.price == null) {
        setError('Não foi possível calcular o preço')
        return
      }
      await onSave({ mode: 'edit_rule_percent', percent: pct, price: preview.price })
      return
    }
    const price = parseMoneyBr(priceStr)
    if (price == null || price < 0) {
      setError('Preço inválido')
      return
    }
    await onSave({ mode: 'manual_price', price })
  }

  const ruleFieldLabel =
    method === 'markup_on_cost' ? 'Markup (%)' : method === 'margin_on_sell' ? 'Margem (%)' : '% regra'

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-[14px] border border-hf-line bg-hf-surface p-4 shadow-lg">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="m-0 text-lg font-extrabold text-hf-ink">Editar precificação</h2>
            <p className="mt-1 text-sm text-hf-muted">
              {item.productName ?? 'Produto'} · {CODIGO_REFERENCIA_LABEL}{' '}
              <span className="font-mono">{item.sku}</span>
            </p>
          </div>
          <button type="button" className="text-sm font-semibold underline" onClick={onClose}>
            Fechar
          </button>
        </div>

        <div className="mt-4 grid gap-2 rounded-[10px] border border-hf-line bg-hf-bg p-3 text-sm">
          <p className="m-0">
            <span className="font-semibold text-hf-ink">Custo:</span>{' '}
            {costTotal != null ? formatMoney(costTotal) : '—'}
            {item.extraCost > 0 ? (
              <span className="text-hf-muted"> (extra item {formatMoney(item.extraCost)})</span>
            ) : null}
          </p>
          <p className="m-0 text-xs text-hf-muted">
            Markup é sobre o custo; margem é sobre o preço de venda — não são a mesma coisa.
          </p>
        </div>

        <fieldset className="mt-4 space-y-2 border-0 p-0">
          <legend className="mb-2 text-sm font-extrabold text-hf-ink">O que alterar?</legend>
          <label className="flex cursor-pointer gap-2 rounded-[10px] border border-hf-line p-3 text-sm">
            <input
              type="radio"
              name="pricingMode"
              checked={editMode === 'apply_list_rule'}
              onChange={() => setEditMode('apply_list_rule')}
            />
            <span>
              <strong>Atualizar preço pelo custo + regra da lista</strong>
              <span className="mt-0.5 block text-xs text-hf-muted">
                Usa {method === 'fixed' ? 'modo fixo (indisponível)' : ruleFieldLabel.toLowerCase()}{' '}
                {method !== 'fixed' ? `${list.pricingPercent}%` : ''} → origem CALCULATED
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer gap-2 rounded-[10px] border border-hf-line p-3 text-sm">
            <input
              type="radio"
              name="pricingMode"
              checked={editMode === 'edit_rule_percent'}
              onChange={() => setEditMode('edit_rule_percent')}
              disabled={method === 'fixed'}
            />
            <span>
              <strong>Alterar {method === 'margin_on_sell' ? 'margem' : 'markup'} deste item</strong>
              <span className="mt-0.5 block text-xs text-hf-muted">
                Recalcula o preço a partir do custo (origem CALCULATED)
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer gap-2 rounded-[10px] border border-hf-line p-3 text-sm">
            <input
              type="radio"
              name="pricingMode"
              checked={editMode === 'manual_price'}
              onChange={() => setEditMode('manual_price')}
            />
            <span>
              <strong>Alterar preço manualmente</strong>
              <span className="mt-0.5 block text-xs text-hf-muted">
                Origem MANUAL — markup/margem passam a ser consequência
              </span>
            </span>
          </label>
        </fieldset>

        {editMode === 'edit_rule_percent' ? (
          <div className="mt-3">
            <Input
              label={ruleFieldLabel}
              value={rulePct}
              onChange={(e) => setRulePct(e.target.value)}
              disabled={busy}
            />
          </div>
        ) : null}
        {editMode === 'manual_price' ? (
          <div className="mt-3">
            <Input
              label="Preço de venda"
              value={priceStr}
              onChange={(e) => setPriceStr(e.target.value)}
              disabled={busy}
            />
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-3 gap-2 rounded-[10px] border border-hf-line p-3 text-sm">
          <div>
            <div className="text-[11px] font-extrabold uppercase text-hf-muted">Novo preço</div>
            <div className="font-black text-hf-ink">
              {preview.price != null ? formatMoney(preview.price) : '—'}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-extrabold uppercase text-hf-muted">Markup</div>
            <div className="font-semibold">{fmtPct(preview.markup)}</div>
          </div>
          <div>
            <div className="text-[11px] font-extrabold uppercase text-hf-muted">Margem</div>
            <div className="font-semibold">{fmtPct(preview.margin)}</div>
          </div>
        </div>

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" variant="light" disabled={busy} onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" disabled={busy} onClick={() => void handleSave()}>
            Confirmar
          </Button>
        </div>
      </div>
    </div>
  )
}


