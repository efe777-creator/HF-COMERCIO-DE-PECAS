import { PricingRuleFields } from '@/components/admin/prices/PricingRuleFields'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { FORMATION_ACTIVE_HINT, FORMATION_INACTIVE_HINT } from '@/lib/priceLabels'
import { formatMoney, formatMoneyInput } from '@/lib/money'
import {
  computeAdjustedPrice,
  isPriceListFormationActive,
  type PriceAdjustMode,
  type PriceList,
  type PriceListItem,
} from '@/services/admin/adminPriceListService'
import type { PricingMethod } from '@/services/pricing/pricingFormulas'
import { Link } from 'react-router-dom'

type Props = {
  list: PriceList
  items: PriceListItem[]
  allowed: boolean
  busy: boolean
  ruleMethod: PricingMethod
  rulePercent: string
  ruleExtraCostPercent: string
  adjustMode: PriceAdjustMode
  adjustDirection: 'up' | 'down'
  adjustValue: string
  ruleReport?: string | null
  adjustReport?: string | null
  onRuleMethod: (v: PricingMethod) => void
  onRulePercent: (v: string) => void
  onRuleExtraCostPercent: (v: string) => void
  onAdjustMode: (v: PriceAdjustMode) => void
  onAdjustDirection: (v: 'up' | 'down') => void
  onAdjustValue: (v: string) => void
  onSaveRuleKeepPrices: () => void
  onApplyMarginToSell: () => void
  onApplyGlobalAdjust: () => void
}

export function PriceListFormacaoTab({
  list,
  items,
  allowed,
  busy,
  ruleMethod,
  rulePercent,
  ruleExtraCostPercent,
  adjustMode,
  adjustDirection,
  adjustValue,
  ruleReport,
  adjustReport,
  onRuleMethod,
  onRulePercent,
  onRuleExtraCostPercent,
  onAdjustMode,
  onAdjustDirection,
  onAdjustValue,
  onSaveRuleKeepPrices,
  onApplyMarginToSell,
  onApplyGlobalAdjust,
}: Props) {
  const formationActive = isPriceListFormationActive(ruleMethod)

  return (
    <div className="space-y-4">
      <div
        className={`rounded-[10px] border px-3 py-2 text-sm ${
          formationActive
            ? 'border-emerald-600/40 bg-emerald-950/50 text-emerald-100'
            : 'border-amber-600/40 bg-amber-950/45 text-amber-100'
        }`}
        role="status"
      >
        <strong>{formationActive ? 'Cálculo ativo' : 'Cálculo desativado'}</strong>
        {' — '}
        <span className={formationActive ? 'text-emerald-200/90' : 'text-amber-200/90'}>
          {formationActive ? FORMATION_ACTIVE_HINT : FORMATION_INACTIVE_HINT}
        </span>
        {!formationActive ? (
          <span className="mt-1 block text-xs text-amber-200/90">
            Os campos abaixo permanecem visíveis. Escolha Margem ou Markup e salve/aplique para
            reativar o cálculo.
          </span>
        ) : null}
      </div>

      <div className="rounded-[14px] border border-hf-line bg-hf-surface p-4">
        <h2 className="m-0 text-lg font-extrabold text-hf-ink">Regra de formação</h2>
        <p className="mt-1 text-sm text-hf-muted">
          Fluxo: custo → adicional de custo (%) → base → regra da lista (ou preço fixo) → preço
          final. A formação não altera itens com origem Importado ou Manual. O adicional em R$ da
          lista permanece informativo e fora do cálculo.
        </p>
        <div className="mt-3 space-y-3">
          <PricingRuleFields
            method={ruleMethod}
            percent={rulePercent}
            extraCostPercent={ruleExtraCostPercent}
            disabled={busy || !allowed}
            className="grid gap-3 md:grid-cols-2 lg:grid-cols-3"
            selectClassName="w-full rounded-[9px] border border-hf-line px-3 py-3"
            onMethod={onRuleMethod}
            onPercent={onRulePercent}
            onExtraCostPercent={onRuleExtraCostPercent}
          />
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <Input
              label="Adicional em R$ (informativo)"
              value={formatMoneyInput(list.listExtraCost)}
              disabled
              hint="Não entra no cálculo."
            />
            <div className="flex flex-wrap items-end gap-2 md:col-span-2">
              <Button
                type="button"
                variant="light"
                disabled={busy || !allowed}
                onClick={onSaveRuleKeepPrices}
              >
                Salvar margem (manter venda)
              </Button>
              <Button
                type="button"
                disabled={busy || !allowed || ruleMethod === 'fixed'}
                onClick={onApplyMarginToSell}
              >
                Aplicar margem → atualizar venda
              </Button>
              <Link className="pb-3 text-sm font-semibold text-hf-ink underline" to="/admin/precos">
                Voltar à consulta
              </Link>
            </div>
            <p className="md:col-span-2 text-xs text-hf-muted">
              Salvar margem: só persiste regra/adicional. Aplicar margem: inclui produtos com custo
              ainda fora da lista e recalcula só itens CALCULATED (imported/manual ficam iguais).
            </p>
          </div>
          {ruleReport ? <p className="text-sm text-green-700">{ruleReport}</p> : null}
        </div>
      </div>

      <div className="rounded-[14px] border border-hf-line bg-hf-surface p-4">
        <h2 className="text-lg font-extrabold text-hf-ink">Ajuste global (lista inteira)</h2>
        <p className="mt-1 text-sm text-hf-muted">
          Distinto da formação custo+margem. Aplica só à lista <strong>{list.name}</strong>. Ex.:{' '}
          {items[0] ? formatMoney(computeAdjustedPrice(items[0].price, 'percent', 10)) : '—'}
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <select
            className="rounded-[9px] border border-hf-line px-3 py-3"
            value={adjustMode}
            onChange={(e) => onAdjustMode(e.target.value as PriceAdjustMode)}
          >
            <option value="percent">Percentual</option>
            <option value="fixed">Valor fixo</option>
          </select>
          <select
            className="rounded-[9px] border border-hf-line px-3 py-3"
            value={adjustDirection}
            onChange={(e) => onAdjustDirection(e.target.value as 'up' | 'down')}
          >
            <option value="up">Aumentar</option>
            <option value="down">Diminuir</option>
          </select>
          <Input label="Valor" value={adjustValue} onChange={(e) => onAdjustValue(e.target.value)} />
          <div className="flex items-end">
            <Button type="button" disabled={busy || !allowed} onClick={onApplyGlobalAdjust}>
              Aplicar a todos
            </Button>
          </div>
        </div>
        {adjustReport ? <p className="mt-2 text-sm text-green-700">{adjustReport}</p> : null}
      </div>
    </div>
  )
}
