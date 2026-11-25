import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import {
  PRICE_LIST_ASSIGNED_HINT,
  PRICE_LIST_LAYERS_HINT,
  PRICE_LIST_PRIORITY_HINT,
  PRICE_ORIGIN_VS_METHOD_HINT,
} from '@/lib/priceLabels'
import type { PriceListScope, PriceListStatus } from '@/services/admin/adminPriceListService'
import type { FormEvent } from 'react'

type Props = {
  busy: boolean
  cfgName: string
  cfgDescription: string
  cfgStatus: PriceListStatus
  cfgScope: PriceListScope
  cfgPriority: string
  cfgDefault: boolean
  cfgValidFrom: string
  cfgValidUntil: string
  onCfgName: (v: string) => void
  onCfgDescription: (v: string) => void
  onCfgStatus: (v: PriceListStatus) => void
  onCfgScope: (v: PriceListScope) => void
  onCfgPriority: (v: string) => void
  onCfgDefault: (v: boolean) => void
  onCfgValidFrom: (v: string) => void
  onCfgValidUntil: (v: string) => void
  onSubmit: (e: FormEvent) => void
}

export function PriceListConfigTab({
  busy,
  cfgName,
  cfgDescription,
  cfgStatus,
  cfgScope,
  cfgPriority,
  cfgDefault,
  cfgValidFrom,
  cfgValidUntil,
  onCfgName,
  onCfgDescription,
  onCfgStatus,
  onCfgScope,
  onCfgPriority,
  onCfgDefault,
  onCfgValidFrom,
  onCfgValidUntil,
  onSubmit,
}: Props) {
  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-3 rounded-[14px] border border-hf-line bg-hf-surface p-4 md:grid-cols-2"
    >
      <Input label="Nome" value={cfgName} onChange={(e) => onCfgName(e.target.value)} required />
      <label className="block text-sm">
        <span className="mb-1 block font-semibold text-hf-ink">Status</span>
        <select
          className="w-full rounded-[10px] border border-hf-line px-3 py-2"
          value={cfgStatus}
          onChange={(e) => onCfgStatus(e.target.value as PriceListStatus)}
        >
          <option value="draft">Rascunho</option>
          <option value="active">Ativa</option>
          <option value="inactive">Inativa</option>
        </select>
      </label>
      <label className="block text-sm md:col-span-2">
        <span className="mb-1 block font-semibold text-hf-ink">Descrição</span>
        <textarea
          className="min-h-[72px] w-full rounded-[10px] border border-hf-line px-3 py-2 text-sm"
          value={cfgDescription}
          onChange={(e) => onCfgDescription(e.target.value)}
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-semibold text-hf-ink">Escopo</span>
        <select
          className="w-full rounded-[10px] border border-hf-line px-3 py-2"
          value={cfgScope}
          onChange={(e) => onCfgScope(e.target.value as PriceListScope)}
        >
          <option value="public">public (vitrine / geral)</option>
          <option value="assigned">assigned (B2B por cliente)</option>
        </select>
        {cfgScope === 'assigned' ? (
          <span className="mt-1 block text-xs text-hf-muted">{PRICE_LIST_ASSIGNED_HINT}</span>
        ) : null}
      </label>
      <Input
        label="Prioridade da lista"
        type="number"
        value={cfgPriority}
        onChange={(e) => onCfgPriority(e.target.value)}
        hint={PRICE_LIST_PRIORITY_HINT}
      />
      <Input
        label="Válida de"
        type="datetime-local"
        value={cfgValidFrom}
        onChange={(e) => onCfgValidFrom(e.target.value)}
      />
      <Input
        label="Válida até"
        type="datetime-local"
        value={cfgValidUntil}
        onChange={(e) => onCfgValidUntil(e.target.value)}
      />
      <label className="flex items-center gap-2 text-sm font-semibold text-hf-ink md:col-span-2">
        <input
          type="checkbox"
          checked={cfgDefault}
          onChange={(e) => onCfgDefault(e.target.checked)}
        />
        Lista padrão da loja
      </label>
      <p className="text-xs text-hf-muted md:col-span-2">
        {PRICE_LIST_LAYERS_HINT} Formação (método/%) edita-se na aba Formação —{' '}
        {PRICE_ORIGIN_VS_METHOD_HINT}
      </p>
      <div className="flex gap-2 md:col-span-2">
        <Button type="submit" disabled={busy}>
          Salvar configuração
        </Button>
      </div>
    </form>
  )
}
