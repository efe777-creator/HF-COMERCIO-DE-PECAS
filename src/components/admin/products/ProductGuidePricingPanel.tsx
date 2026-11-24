import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { formatMoney, formatMoneyInput, parseMoneyBr } from '@/lib/money'
import {
  adminListProductListPrices,
  adminUpsertPriceListItem,
  adminUpsertProductSupplierCost,
  type ProductListPriceRow,
} from '@/services/admin/adminPriceListService'
import {
  calculateSellPrice,
  computeCostTotal,
  effectiveMarginFraction,
  toPercent,
} from '@/services/pricing/pricingFormulas'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

type RowEdit = {
  cost: string
  extra: string
  margin: string
  price: string
}

type Props = {
  productId: string
  onSaved?: () => void
}

function rowToEdit(row: ProductListPriceRow): RowEdit {
  return {
    cost: row.baseCost != null ? formatMoneyInput(row.baseCost) : '',
    extra: formatMoneyInput(row.extraCost),
    margin: row.effectiveMarginPct != null ? String(row.effectiveMarginPct.toFixed(2)) : '',
    price: row.price != null ? formatMoneyInput(row.price) : '',
  }
}

export function ProductGuidePricingPanel({ productId, onSaved }: Props) {
  const [rows, setRows] = useState<ProductListPriceRow[]>([])
  const [edits, setEdits] = useState<Record<string, RowEdit>>({})
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function reload() {
    setLoading(true)
    try {
      const list = await adminListProductListPrices(productId)
      setRows(list)
      const next: Record<string, RowEdit> = {}
      for (const r of list) next[r.priceListId] = rowToEdit(r)
      setEdits(next)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar preços')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [productId])

  function patchEdit(listId: string, patch: Partial<RowEdit>, recompute?: 'fromMargin' | 'fromPrice') {
    setEdits((prev) => {
      const cur = prev[listId] ?? { cost: '', extra: '', margin: '', price: '' }
      const next = { ...cur, ...patch }
      const cost = parseMoneyBr(next.cost)
      const extra = parseMoneyBr(next.extra) ?? 0
      const row = rows.find((r) => r.priceListId === listId)
      const listPct = row?.listExtraCostPercent ?? 0
      const costTotal =
        cost == null ? null : computeCostTotal(cost, Math.max(0, extra), 0, listPct)

      if (recompute === 'fromMargin' && costTotal != null) {
        const marginPct = Number(String(next.margin).replace(',', '.'))
        if (Number.isFinite(marginPct) && marginPct < 100) {
          const sell = calculateSellPrice(costTotal, 'margin_on_sell', marginPct)
          if (sell != null) next.price = formatMoneyInput(sell)
        }
      } else if (recompute === 'fromPrice' && costTotal != null) {
        const price = parseMoneyBr(next.price)
        if (price != null && price > 0) {
          const m = toPercent(effectiveMarginFraction(price, costTotal))
          next.margin = m != null ? String(m.toFixed(2)) : ''
        }
      } else if (costTotal != null && (patch.cost != null || patch.extra != null)) {
        const price = parseMoneyBr(next.price)
        if (price != null && price > 0) {
          const m = toPercent(effectiveMarginFraction(price, costTotal))
          next.margin = m != null ? String(m.toFixed(2)) : next.margin
        }
      }
      return { ...prev, [listId]: next }
    })
  }

  async function saveRow(row: ProductListPriceRow) {
    const edit = edits[row.priceListId]
    if (!edit) return
    setBusyId(row.priceListId)
    setError(null)
    setMessage(null)
    try {
      const cost = parseMoneyBr(edit.cost)
      const extra = parseMoneyBr(edit.extra)
      const price = parseMoneyBr(edit.price)
      if (price == null || price < 0) throw new Error('Preço de venda inválido')
      if (extra != null && extra < 0) throw new Error('Adicional inválido')
      if (cost != null && cost < 0) throw new Error('Custo inválido')

      if (cost != null) {
        await adminUpsertProductSupplierCost({
          productId,
          cost,
          supplierId: row.supplierId,
        })
      }

      await adminUpsertPriceListItem({
        priceListId: row.priceListId,
        productId,
        price,
        source: 'manual',
        extraCost: extra ?? 0,
      })

      await reload()
      setMessage(`Lista "${row.listName}" salva.`)
      onSaved?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao salvar')
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return <p className="m-0 text-xs text-hf-muted">Carregando preços…</p>

  return (
    <div className="space-y-3">
      <p className="m-0 text-xs text-hf-muted">
        Custo (fornecedor) · adicional do item · margem · preço de venda. Salve por lista.
      </p>
      {error ? <p className="m-0 text-xs text-hf-danger">{error}</p> : null}
      {message ? <p className="m-0 text-xs font-semibold text-hf-ink">{message}</p> : null}

      <ul className="m-0 space-y-3 p-0 list-none">
        {rows.map((row) => {
          const edit = edits[row.priceListId] ?? rowToEdit(row)
          const cost = parseMoneyBr(edit.cost)
          const extra = parseMoneyBr(edit.extra) ?? 0
          const costTotal =
            cost == null
              ? null
              : computeCostTotal(cost, Math.max(0, extra), 0, row.listExtraCostPercent)
          return (
            <li
              key={row.priceListId}
              className="space-y-2 rounded-[10px] border border-hf-line bg-hf-bg/40 p-2"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-1">
                <p className="m-0 text-xs font-extrabold text-hf-ink">{row.listName}</p>
                <p className="m-0 text-[10px] text-hf-muted">
                  {row.status}
                  {row.pricingMethod !== 'fixed'
                    ? ` · regra ${row.pricingMethod === 'margin_on_sell' ? 'margem' : 'markup'} ${row.pricingPercent}%`
                    : ' · fixo'}
                  {costTotal != null ? ` · custo total ${formatMoney(costTotal)}` : ''}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="Custo"
                  value={edit.cost}
                  onChange={(e) => patchEdit(row.priceListId, { cost: e.target.value })}
                />
                <Input
                  label="Adicional"
                  value={edit.extra}
                  onChange={(e) => patchEdit(row.priceListId, { extra: e.target.value })}
                />
                <Input
                  label="Margem %"
                  value={edit.margin}
                  onChange={(e) =>
                    patchEdit(row.priceListId, { margin: e.target.value }, 'fromMargin')
                  }
                />
                <Input
                  label="Preço venda"
                  value={edit.price}
                  onChange={(e) =>
                    patchEdit(row.priceListId, { price: e.target.value }, 'fromPrice')
                  }
                />
              </div>
              <Button
                type="button"
                disabled={busyId === row.priceListId}
                onClick={() => void saveRow(row)}
              >
                {busyId === row.priceListId ? 'Salvando…' : 'Salvar esta lista'}
              </Button>
            </li>
          )
        })}
      </ul>

      <Link to="/admin/precos" className="block text-xs font-semibold text-hf-auth-link">
        Hub Preços →
      </Link>
    </div>
  )
}
