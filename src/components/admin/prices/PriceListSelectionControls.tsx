import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { isPriceListFormationActive } from '@/services/admin/adminPriceListService'
import { pricingPercentInputLabel, type PricingMethod } from '@/services/pricing/pricingFormulas'
import { useState } from 'react'

type Props = {
  selectedCount: number
  pricingMethod: PricingMethod
  allowed: boolean
  busy: boolean
  bulkPrice: string
  onBulkPrice: (v: string) => void
  onApplyRule: () => void
  onSetManualPrice: () => void
  onExport: () => void
  onRemove: () => void
  /** Margem/markup % só da seleção (recalcula venda a partir do custo). */
  onApplySelectionMargin: (percent: number) => void | Promise<void>
  /** Adicional R$ nos itens selecionados. */
  onApplySelectionExtraCost: (extraCost: number) => void | Promise<void>
}

/** Barra de ações da seleção: calcular, margem, adicional, manual (se fixo). */
export function PriceListSelectionControls({
  selectedCount,
  pricingMethod,
  allowed,
  busy,
  bulkPrice,
  onBulkPrice,
  onApplyRule,
  onSetManualPrice,
  onExport,
  onRemove,
  onApplySelectionMargin,
  onApplySelectionExtraCost,
}: Props) {
  const [selMargin, setSelMargin] = useState('')
  const [selExtra, setSelExtra] = useState('')
  const formationActive = isPriceListFormationActive(pricingMethod)

  if (selectedCount <= 0) return null

  return (
    <div className="space-y-3 rounded-[14px] border border-hf-line bg-hf-surface p-3">
      <div className="flex flex-wrap items-end gap-2">
        <span className="text-sm font-semibold text-hf-ink">{selectedCount} selecionado(s)</span>
        <Button
          type="button"
          variant="light"
          disabled={busy || !allowed || !formationActive}
          onClick={onApplyRule}
          title={
            formationActive
              ? undefined
              : 'Ative a formação (margem/markup) na faixa global para calcular'
          }
        >
          Incluir e calcular pela regra da lista
        </Button>
        <Button type="button" variant="light" disabled={busy} onClick={onExport}>
          Exportar seleção
        </Button>
        <Button type="button" variant="light" disabled={busy} onClick={onRemove}>
          Remover da lista
        </Button>
      </div>

      <div className="grid gap-2 border-t border-hf-line pt-3 md:grid-cols-4">
        <Input
          label={
            formationActive
              ? `${pricingPercentInputLabel(pricingMethod)} da seleção`
              : 'Margem/Markup da seleção'
          }
          value={selMargin}
          disabled={busy || !allowed || !formationActive}
          onChange={(e) => setSelMargin(e.target.value)}
          hint={
            formationActive
              ? 'Recalcula venda dos selecionados a partir do custo (origem CALCULATED).'
              : 'Ative o cálculo global para usar margem/markup na seleção.'
          }
        />
        <div className="flex items-end">
          <Button
            type="button"
            disabled={busy || !allowed || !formationActive}
            onClick={() => {
              const pct = Number(String(selMargin).replace(',', '.'))
              if (!Number.isFinite(pct) || pct < 0) {
                window.alert('Percentual inválido')
                return
              }
              if (pricingMethod === 'margin_on_sell' && pct >= 100) {
                window.alert('Margem deve ser menor que 100%')
                return
              }
              void onApplySelectionMargin(pct)
            }}
          >
            Aplicar % → venda
          </Button>
        </div>
        <Input
          label="Adicional R$ (seleção)"
          value={selExtra}
          disabled={busy || !allowed}
          onChange={(e) => setSelExtra(e.target.value)}
          hint="Custo adicional por item. Com cálculo ativo, a venda dos CALCULATED é reaplicada."
        />
        <div className="flex items-end">
          <Button
            type="button"
            variant="light"
            disabled={busy || !allowed}
            onClick={() => {
              const n = Number(String(selExtra).replace(',', '.'))
              if (!Number.isFinite(n) || n < 0) {
                window.alert('Adicional inválido')
                return
              }
              void onApplySelectionExtraCost(n)
            }}
          >
            Aplicar adicional
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2 border-t border-hf-line pt-3">
        <Input
          label="Novo preço MANUAL (seleção)"
          inputMode="decimal"
          value={bulkPrice}
          onChange={(e) => onBulkPrice(e.target.value)}
          hint={
            formationActive
              ? 'Desativa o cálculo só nos selecionados (origem Manual — fora do recálculo).'
              : undefined
          }
        />
        <Button type="button" disabled={busy || !allowed} onClick={onSetManualPrice}>
          Definir preço manual
        </Button>
      </div>
    </div>
  )
}
