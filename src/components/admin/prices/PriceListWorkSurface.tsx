import { Button } from '@/components/common/Button'
import {
  priceListStatusLabel,
  type PriceListOverviewRow,
} from '@/services/admin/adminPriceListService'
import { PriceListQuickAdjustPanel } from '@/pages/admin/prices/PriceListQuickAdjustPanel'
import { Link } from 'react-router-dom'

type Props = {
  lists: PriceListOverviewRow[]
  listId: string
  allowed: boolean
  changedBy?: string | null
  forceWithoutPrice?: boolean
  onItemsChanged?: () => void
  onListIdChange?: (listId: string) => void
  onRequestImport?: () => void
  onClose: () => void
}

/** Guia lateral de consulta/ajuste rápido (padrão FAL WorkSurface). */
export function PriceListWorkSurface({
  lists,
  listId,
  allowed,
  changedBy,
  forceWithoutPrice,
  onItemsChanged,
  onListIdChange,
  onRequestImport,
  onClose,
}: Props) {
  const focused = lists.find((l) => l.id === listId) ?? null

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 p-1" data-price-ops-density="compact">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hf-line pb-2">
        <div className="min-w-0">
          <p className="m-0 text-xs font-semibold text-hf-muted">Aberto na guia · consulta e ajuste</p>
          {focused ? (
            <p className="mb-0 mt-1 truncate text-sm font-extrabold text-hf-ink">
              {focused.name}
              <span className="ml-2 text-xs font-semibold text-hf-muted">
                {priceListStatusLabel(focused.status)}
              </span>
            </p>
          ) : null}
        </div>
        <button
          type="button"
          className="inline-flex min-h-10 shrink-0 items-center text-sm font-semibold text-hf-ink underline"
          onClick={onClose}
        >
          Fechar guia
        </button>
      </div>

      {focused ? (
        <div className="flex flex-wrap gap-2">
          <Link
            to={`/admin/precos/${focused.id}?tab=produtos`}
            className="inline-flex items-center justify-center rounded-[10px] border border-transparent bg-hf-red px-3 py-2 text-sm font-extrabold text-white"
          >
            Abrir lista completa
          </Link>
          {onRequestImport ? (
            <Button type="button" variant="light" className="!px-3 !py-2 text-sm" onClick={onRequestImport}>
              Importar planilha
            </Button>
          ) : null}
          <Link
            to={`/admin/precos/${focused.id}?tab=formacao`}
            className="inline-flex items-center justify-center rounded-[10px] border border-hf-line bg-hf-surface-2 px-3 py-2 text-sm font-extrabold text-hf-ink"
          >
            Formação
          </Link>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto">
        <PriceListQuickAdjustPanel
          lists={lists}
          allowed={allowed}
          changedBy={changedBy}
          onItemsChanged={onItemsChanged}
          onListIdChange={onListIdChange}
          forceWithoutPrice={forceWithoutPrice}
          onRequestImport={onRequestImport}
          forcedListId={listId || undefined}
          embedded
        />
      </div>
    </div>
  )
}
