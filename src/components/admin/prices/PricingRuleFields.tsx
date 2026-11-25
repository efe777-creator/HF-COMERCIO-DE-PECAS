import { Input } from '@/components/common/Input'
import {
  pricingPercentInputLabel,
  type PricingMethod,
} from '@/services/pricing/pricingFormulas'

export { pricingPercentInputLabel }

type Props = {
  method: PricingMethod
  percent: string
  extraCostPercent: string
  disabled?: boolean
  hidePercentWhenFixed?: boolean
  className?: string
  selectClassName?: string
  onMethod: (v: PricingMethod) => void
  onPercent: (v: string) => void
  onExtraCostPercent: (v: string) => void
}

/** Campos comuns da regra de formação (lista × UIs). */
export function PricingRuleFields({
  method,
  percent,
  extraCostPercent,
  disabled = false,
  hidePercentWhenFixed = false,
  className = 'grid gap-3 md:grid-cols-2',
  selectClassName = 'w-full rounded-[10px] border border-hf-line bg-hf-surface px-3 py-2',
  onMethod,
  onPercent,
  onExtraCostPercent,
}: Props) {
  const showPercent = !(hidePercentWhenFixed && method === 'fixed')
  return (
    <div className={className}>
      <label className={`block text-sm ${hidePercentWhenFixed ? 'md:col-span-2' : ''}`}>
        <span className="mb-1 block text-xs font-extrabold text-hf-muted">Regra de formação</span>
        <select
          className={selectClassName}
          value={method}
          disabled={disabled}
          onChange={(e) => onMethod(e.target.value as PricingMethod)}
        >
          <option value="fixed">Preço fixo (sem fórmula automática)</option>
          <option value="markup_on_cost">Markup sobre custo</option>
          <option value="margin_on_sell">Margem sobre venda</option>
        </select>
      </label>
      {showPercent ? (
        <Input
          label={pricingPercentInputLabel(method)}
          value={percent}
          disabled={disabled || method === 'fixed'}
          onChange={(e) => onPercent(e.target.value)}
          hint="Percentual da regra de venda — não é adicional de custo."
        />
      ) : null}
      <Input
        label="Adicional de custo (%)"
        value={extraCostPercent}
        disabled={disabled}
        onChange={(e) => onExtraCostPercent(e.target.value)}
        hint="Custo → este % → base de formação → regra da lista. Paralelo ao adicional em R$ da lista."
      />
    </div>
  )
}
