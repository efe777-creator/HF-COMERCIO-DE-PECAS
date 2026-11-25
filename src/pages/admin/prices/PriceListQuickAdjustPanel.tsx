import { PriceListFormationControls } from '@/components/admin/prices/PriceListFormationControls'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { formatMoney, parseMoneyBr } from '@/lib/money'
import {
  PriceItemPricingModal,
  type PricingEditResult,
} from '@/pages/admin/prices/PriceItemPricingModal'
import {
  adminFindProductIdBySku,
  adminListPriceListOperationalItems,
  adminMaterializePublishedOntoPriceList,
  adminRecalculatePriceListItems,
  adminSaveListExtraCostPercent,
  adminSetCalculatedListPrice,
  adminSetPriceListItemPricing,
  adminSetPriceListPricingRule,
  adminSyncProductsOntoPriceList,
  adminUpsertPriceListItem,
  filterPriceListItems,
  isPriceListFormationActive,
  isVirtualPriceListItemId,
  priceListStatusLabel,
  pricingMethodLabel,
  type PriceListItem,
  type PriceListOverviewRow,
  type PriceOrigin,
} from '@/services/admin/adminPriceListService'
import type { PricingMethod } from '@/services/pricing/pricingFormulas'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

const QUICK_RESULT_LIMIT = 50
const STORAGE_KEY = 'hf.priceListQuickAdjust.listId'

function originLabelPt(o: PriceOrigin): string {
  if (o === 'calculated') return 'Calculado'
  if (o === 'imported') return 'Importado'
  return 'Manual'
}

function fmtPct(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return `${n.toFixed(1)}%`
}

type Props = {
  lists: PriceListOverviewRow[]
  allowed: boolean
  changedBy?: string | null
  onItemsChanged?: () => void
  onListIdChange?: (listId: string) => void
  forceWithoutPrice?: boolean
  onRequestImport?: () => void
  forcedListId?: string
  embedded?: boolean
}

export function PriceListQuickAdjustPanel({
  lists,
  allowed,
  changedBy,
  onItemsChanged,
  onListIdChange,
  forceWithoutPrice,
  onRequestImport,
  forcedListId,
  embedded = false,
}: Props) {
  const [listId, setListId] = useState('')
  const [items, setItems] = useState<PriceListItem[]>([])
  const [loadingItems, setLoadingItems] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const [filterQ, setFilterQ] = useState('')
  const [filterQDebounced, setFilterQDebounced] = useState('')
  const [filterOrigin, setFilterOrigin] = useState<PriceOrigin | ''>('')
  const [filterWithoutPrice, setFilterWithoutPrice] = useState(false)
  const [addOpen, setAddOpen] = useState(false)

  const [addSku, setAddSku] = useState('')
  const [addPrice, setAddPrice] = useState('')
  const [addBusy, setAddBusy] = useState(false)

  const [pricingItem, setPricingItem] = useState<PriceListItem | null>(null)
  const [rowBusy, setRowBusy] = useState<string | null>(null)
  const [ruleBusy, setRuleBusy] = useState(false)

  const addFormRef = useRef<HTMLFormElement>(null)
  const addSkuInputRef = useRef<HTMLInputElement>(null)
  const loadGenRef = useRef(0)

  const effectiveListId = forcedListId ?? listId
  const selectedList = lists.find((l) => l.id === effectiveListId) ?? null
  const formationActive = selectedList
    ? isPriceListFormationActive(selectedList.pricingMethod)
    : false

  useEffect(() => {
    if (forcedListId) sessionStorage.setItem(STORAGE_KEY, forcedListId)
  }, [forcedListId])

  useEffect(() => {
    setFilterWithoutPrice(Boolean(forceWithoutPrice))
  }, [forceWithoutPrice])

  useEffect(() => {
    if (!lists.length) {
      setListId('')
      return
    }
    if (forcedListId) return
    const stored = sessionStorage.getItem(STORAGE_KEY)
    const fromStored = stored && lists.some((l) => l.id === stored) ? stored : null
    const active = lists.find((l) => l.status === 'active')
    setListId((prev) => {
      if (prev && lists.some((l) => l.id === prev)) return prev
      return fromStored ?? active?.id ?? lists[0]!.id
    })
  }, [lists, forcedListId])

  useEffect(() => {
    onListIdChange?.(effectiveListId)
  }, [effectiveListId, onListIdChange])

  useEffect(() => {
    const t = window.setTimeout(() => setFilterQDebounced(filterQ), 200)
    return () => window.clearTimeout(t)
  }, [filterQ])

  useEffect(() => {
    if (!effectiveListId) {
      setItems([])
      setLoadingItems(false)
      return
    }

    const gen = ++loadGenRef.current
    setItems([])
    setPricingItem(null)
    setError(null)
    setInfo(null)
    setFilterQ('')
    setFilterQDebounced('')
    setFilterOrigin('')
    setLoadingItems(true)
    if (!forcedListId) sessionStorage.setItem(STORAGE_KEY, effectiveListId)

    let cancelled = false
    void (async () => {
      try {
        const rows = await adminListPriceListOperationalItems(effectiveListId)
        if (cancelled || gen !== loadGenRef.current) return
        setItems(rows)
        setAddOpen(rows.filter((r) => !isVirtualPriceListItemId(r.id)).length === 0)
      } catch (e) {
        if (cancelled || gen !== loadGenRef.current) return
        setItems([])
        setError(e instanceof Error ? e.message : 'Falha ao carregar itens da lista')
      } finally {
        if (!cancelled && gen === loadGenRef.current) setLoadingItems(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [effectiveListId, forcedListId])

  const filteredItems = useMemo(() => {
    if (loadingItems) return []
    return filterPriceListItems(items, {
      q: filterQDebounced,
      origin: filterOrigin,
      withoutPrice: filterWithoutPrice,
    })
  }, [items, filterQDebounced, filterOrigin, filterWithoutPrice, loadingItems])

  const visibleItems = useMemo(
    () => filteredItems.slice(0, QUICK_RESULT_LIMIT),
    [filteredItems],
  )

  const singleMatch =
    filterQDebounced.trim() && filteredItems.length === 1 ? filteredItems[0] : null

  const hasRestrictiveFilters = Boolean(
    filterQDebounced.trim() || filterOrigin || filterWithoutPrice,
  )

  function focusAddSku() {
    window.requestAnimationFrame(() => {
      addFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      const el = addSkuInputRef.current
      if (!el) return
      el.focus()
      el.select()
    })
  }

  function openAddForm() {
    if (formationActive) {
      setError(
        'Cálculo ativo: adição rápida com preço manual fica na ficha completa. Use Editar no item para fixar Manual, ou Incluir e calcular.',
      )
      return
    }
    setAddOpen(true)
    setError(null)
    setInfo(null)
    window.setTimeout(focusAddSku, addOpen ? 0 : 50)
  }

  async function reloadItems(opts?: { keepAddOpen?: boolean }) {
    if (!effectiveListId) return
    const gen = ++loadGenRef.current
    setLoadingItems(true)
    setError(null)
    setItems([])
    try {
      const rows = await adminListPriceListOperationalItems(effectiveListId)
      if (gen !== loadGenRef.current) return
      setItems(rows)
      if (opts?.keepAddOpen) {
        setAddOpen(true)
      } else if (rows.length === 0) {
        setAddOpen(true)
      }
      onItemsChanged?.()
    } catch (e) {
      if (gen !== loadGenRef.current) return
      setItems([])
      setError(e instanceof Error ? e.message : 'Falha ao recarregar itens')
    } finally {
      if (gen === loadGenRef.current) setLoadingItems(false)
    }
  }

  function clearFilters() {
    setFilterQ('')
    setFilterQDebounced('')
    setFilterOrigin('')
    setFilterWithoutPrice(false)
  }

  async function ensureItemOnList(item: PriceListItem): Promise<string> {
    if (!isVirtualPriceListItemId(item.id)) return item.id
    if (!effectiveListId) throw new Error('Lista não selecionada')
    await adminSyncProductsOntoPriceList({
      priceListId: effectiveListId,
      productIds: [item.productId],
    })
    const fresh = await adminListPriceListOperationalItems(effectiveListId)
    const row = fresh.find(
      (i) => i.productId === item.productId && !isVirtualPriceListItemId(i.id),
    )
    if (!row) throw new Error('Falha ao incluir item na lista')
    return row.id
  }

  async function onGlobalSaveKeepPrices(input: {
    method: PricingMethod
    percent: number
    extraCostPercent: number
  }) {
    if (!selectedList || !allowed) return
    setRuleBusy(true)
    setError(null)
    try {
      await adminSetPriceListPricingRule({
        priceListId: selectedList.id,
        pricingMethod: input.method,
        pricingPercent: input.percent,
        recalculate: false,
      })
      const extra = await adminSaveListExtraCostPercent(
        selectedList.id,
        input.extraCostPercent,
      )
      setInfo(
        `Regra global salva (${pricingMethodLabel(input.method)} ${input.percent}%). Venda mantida.` +
          (extra.pendingMigration ? ' Adicional % aguarda migration.' : ''),
      )
      onItemsChanged?.()
      await reloadItems({ keepAddOpen: addOpen })
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Falha ao salvar regra global'
      setError(msg || 'Falha ao salvar regra global')
    } finally {
      setRuleBusy(false)
    }
  }

  async function onGlobalApplyToSell(input: {
    method: PricingMethod
    percent: number
    extraCostPercent: number
  }) {
    if (!selectedList || !allowed) return
    if (input.method === 'fixed') {
      setError('Modo fixo — não há formação para aplicar na venda')
      return
    }
    if (
      !window.confirm(
        `Salvar regra (${pricingMethodLabel(input.method)} ${input.percent}%) e atualizar venda dos itens CALCULATED?`,
      )
    ) {
      return
    }
    setRuleBusy(true)
    setError(null)
    try {
      await adminSetPriceListPricingRule({
        priceListId: selectedList.id,
        pricingMethod: input.method,
        pricingPercent: input.percent,
        recalculate: false,
      })
      await adminSaveListExtraCostPercent(selectedList.id, input.extraCostPercent)
      await adminMaterializePublishedOntoPriceList({
        priceListId: selectedList.id,
        onlyWithPrincipalCost: true,
      })
      try {
        const applied = await adminRecalculatePriceListItems({
          priceListId: selectedList.id,
          dryRun: false,
        })
        setInfo(`Regra aplicada. Venda atualizada: ${applied.updated}.`)
      } catch {
        setInfo(
          'Regra salva. Recálculo RPC indisponível no remoto — use a ficha completa ou apply da migration.',
        )
      }
      onItemsChanged?.()
      await reloadItems({ keepAddOpen: addOpen })
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Falha ao aplicar regra global'
      setError(msg || 'Falha ao aplicar regra global')
    } finally {
      setRuleBusy(false)
    }
  }

  async function onSavePricingEdit(result: PricingEditResult) {
    if (!pricingItem || !selectedList) return
    setRowBusy(pricingItem.id)
    setError(null)
    try {
      const itemId = await ensureItemOnList(pricingItem)
      if (result.mode === 'apply_list_rule') {
        await adminSetPriceListItemPricing({
          itemId,
          mode: 'apply_rule',
          extraCost: result.extraCost,
        })
      } else if (result.mode === 'edit_rule_percent') {
        await adminSetPriceListItemPricing({
          itemId,
          mode: 'apply_rule',
          extraCost: result.extraCost,
        })
        await adminSetCalculatedListPrice({
          priceListId: selectedList.id,
          productId: pricingItem.productId,
          price: result.price,
        })
      } else {
        await adminSetPriceListItemPricing({
          itemId,
          mode: 'manual',
          price: result.price,
          extraCost: result.extraCost,
        })
      }
      setPricingItem(null)
      setInfo('Precificação atualizada.')
      await reloadItems({ keepAddOpen: addOpen })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar precificação')
    } finally {
      setRowBusy(null)
    }
  }

  async function onAddItem(e: FormEvent) {
    e.preventDefault()
    if (!effectiveListId || !allowed) return
    if (formationActive) {
      setError('Cálculo ativo: adição com preço manual bloqueada.')
      return
    }
    setError(null)
    setInfo(null)

    const sku = addSku.trim()
    if (!sku) {
      setError('Informe o código (SKU)')
      focusAddSku()
      return
    }
    const priceNum = parseMoneyBr(addPrice)
    if (priceNum == null || priceNum < 0) {
      setError('Preço inválido ou negativo')
      return
    }

    const existing = items.find((i) => (i.sku ?? '').toLowerCase() === sku.toLowerCase())
    if (existing) {
      setError('Este código já está na lista. Use Editar na linha.')
      setPricingItem(existing)
      setFilterQ(sku)
      setFilterQDebounced(sku)
      setAddOpen(false)
      return
    }

    setAddBusy(true)
    try {
      const productId = await adminFindProductIdBySku(sku)
      if (!productId) {
        setError(`Código não encontrado no cadastro: ${sku}`)
        focusAddSku()
        return
      }
      await adminUpsertPriceListItem({
        priceListId: effectiveListId,
        productId,
        price: priceNum,
        source: 'manual',
        changedBy: changedBy ?? null,
      })
      setAddSku('')
      setAddPrice('')
      setInfo(`Item ${sku} adicionado à lista ${selectedList?.name ?? ''} com origem Manual.`)
      await reloadItems({ keepAddOpen: true })
      focusAddSku()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao adicionar item')
    } finally {
      setAddBusy(false)
    }
  }

  if (!lists.length) {
    return (
      <div className="rounded-[14px] border border-hf-line bg-hf-surface p-4 text-sm text-hf-muted">
        Cadastre uma lista para consultar e ajustar preços.
      </div>
    )
  }

  const loadedCount = items.length
  const filteredCount = filteredItems.length
  const showingCount = visibleItems.length
  const fromIdx = showingCount === 0 ? 0 : 1
  const toIdx = showingCount

  return (
    <div
      className={
        embedded
          ? 'space-y-3'
          : 'space-y-3 rounded-[14px] border border-hf-line bg-hf-surface p-4'
      }
    >
      {!embedded ? (
        <div>
          <h2 className="m-0 text-lg font-extrabold text-hf-ink">Consulta e ajuste de preços</h2>
          <p className="mt-1 text-sm text-hf-muted">
            Escolha a lista, deixe a busca vazia para percorrer os itens ou pesquise um código. O
            preço exibido é só desta lista.
          </p>
        </div>
      ) : null}

      {!embedded ? (
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-extrabold text-hf-muted">Lista</span>
          <select
            className="w-full rounded-[9px] border border-hf-line px-3 py-3 font-semibold text-hf-ink"
            value={effectiveListId}
            onChange={(e) => {
              const next = e.target.value
              setListId(next)
              if (forcedListId != null) onListIdChange?.(next)
            }}
          >
            {lists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} ({priceListStatusLabel(l.status)})
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {selectedList ? (
        <PriceListFormationControls
          listId={selectedList.id}
          listName={selectedList.name}
          pricingMethod={selectedList.pricingMethod}
          pricingPercent={selectedList.pricingPercent}
          listExtraCostPercent={selectedList.listExtraCostPercent}
          compact={embedded}
          editable
          allowed={allowed}
          busy={ruleBusy || loadingItems}
          onSaveKeepPrices={(input) => void onGlobalSaveKeepPrices(input)}
          onApplyToSell={(input) => void onGlobalApplyToSell(input)}
        />
      ) : null}

      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          setFilterQDebounced(filterQ.trim())
        }}
      >
        <div className="min-w-[160px] flex-1">
          <Input
            label="Pesquisar produto"
            value={filterQ}
            onChange={(e) => setFilterQ(e.target.value)}
            placeholder="Código, descrição ou código do fabricante…"
            hint={embedded ? undefined : 'Vazio = todos os itens da lista (até o limite carregado).'}
          />
        </div>
        <label className="block min-w-[120px] text-sm">
          <span className="mb-1 block text-xs font-extrabold text-hf-muted">Origem</span>
          <select
            className="w-full rounded-[9px] border border-hf-line bg-hf-surface px-3 py-3 text-hf-ink"
            value={filterOrigin}
            onChange={(e) => setFilterOrigin(e.target.value as PriceOrigin | '')}
          >
            <option value="">Todas</option>
            <option value="calculated">Calculado</option>
            <option value="imported">Importado</option>
            <option value="manual">Manual</option>
          </select>
        </label>
        <label className="inline-flex min-h-10 items-center gap-2 text-sm text-hf-ink">
          <input
            type="checkbox"
            checked={filterWithoutPrice}
            onChange={(e) => setFilterWithoutPrice(e.target.checked)}
          />
          Sem preço
        </label>
        <Button type="submit" className="shrink-0">
          Buscar
        </Button>
        {hasRestrictiveFilters ? (
          <button
            type="button"
            className="min-h-10 text-sm font-semibold text-hf-ink underline"
            onClick={clearFilters}
          >
            Limpar
          </button>
        ) : null}
      </form>

      {error ? <p className="text-sm text-hf-danger">{error}</p> : null}
      {info ? <p className="text-sm text-emerald-300">{info}</p> : null}

      {singleMatch && selectedList ? (
        <div className="rounded-[10px] border border-hf-line border-l-4 border-l-hf-red bg-hf-surface-2 px-3 py-2 text-sm text-hf-ink">
          Match único · Preço na lista <strong>{selectedList.name}</strong>:{' '}
          <strong>{formatMoney(singleMatch.price)}</strong>
          {singleMatch.sku ? <span className="text-hf-muted"> · {singleMatch.sku}</span> : null}
          <span className="text-hf-muted"> · {originLabelPt(singleMatch.priceOrigin)}</span>
        </div>
      ) : null}

      {loadingItems ? <Loading label="Carregando itens da lista…" /> : null}

      {!loadingItems ? (
        <div className="rounded-[10px] border border-hf-line bg-hf-surface">
          <div className="max-h-[min(70dvh,640px)] overflow-y-auto">
            {visibleItems.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-hf-muted">
                {items.length === 0 ? (
                  <div className="space-y-2">
                    <p>Nenhum item nesta lista.</p>
                    <div className="flex flex-wrap justify-center gap-3">
                      {!formationActive ? (
                        <button
                          type="button"
                          className="font-semibold text-hf-ink underline"
                          onClick={openAddForm}
                        >
                          Adicionar código
                        </button>
                      ) : null}
                      {!embedded && onRequestImport ? (
                        <button
                          type="button"
                          className="font-semibold text-hf-ink underline"
                          onClick={onRequestImport}
                        >
                          Importar planilha
                        </button>
                      ) : null}
                      {!embedded && effectiveListId ? (
                        <Link
                          className="font-semibold text-hf-ink underline"
                          to={`/admin/precos/${effectiveListId}?tab=produtos`}
                        >
                          Abrir lista completa
                        </Link>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p>Nenhum resultado com os filtros atuais.</p>
                    <button
                      type="button"
                      className="font-semibold text-hf-ink underline"
                      onClick={clearFilters}
                    >
                      Limpar filtros
                    </button>
                  </div>
                )}
              </div>
            ) : embedded ? (
              <ul className="divide-y divide-hf-line">
                {visibleItems.map((item) => {
                  const busyRow = rowBusy === item.id
                  const costLabel =
                    item.costTotal != null
                      ? formatMoney(item.costTotal)
                      : item.baseCost != null
                        ? formatMoney(item.baseCost)
                        : '—'
                  const isHit = singleMatch?.id === item.id
                  return (
                    <li
                      key={item.id}
                      className={`px-3 py-2.5 ${isHit ? 'border-l-4 border-l-hf-red bg-hf-surface-2' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="m-0 truncate text-sm font-extrabold text-hf-ink">
                            {item.productName ?? '—'}
                          </p>
                          <p className="mb-0 mt-0.5 text-xs text-hf-muted">
                            <span className="font-mono">{item.sku ?? '—'}</span>
                            <span> · {originLabelPt(item.priceOrigin)}</span>
                          </p>
                        </div>
                        <button
                          type="button"
                          className="inline-flex min-h-10 shrink-0 items-center rounded-[9px] border border-hf-line bg-hf-surface-2 px-3 text-sm font-extrabold text-hf-ink"
                          disabled={!allowed || busyRow}
                          onClick={() => setPricingItem(item)}
                        >
                          Editar
                        </button>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs sm:grid-cols-4">
                        <div>
                          <span className="text-hf-muted">Custo</span>
                          <div className="tabular-nums text-hf-ink">{costLabel}</div>
                        </div>
                        <div>
                          <span className="text-hf-muted">Adic.</span>
                          <div className="tabular-nums text-hf-ink">
                            {item.extraCost > 0 ? formatMoney(item.extraCost) : '—'}
                          </div>
                        </div>
                        <div>
                          <span className="text-hf-muted">Margem</span>
                          <div className="tabular-nums text-hf-ink">
                            {fmtPct(item.effectiveMarginPct)}
                          </div>
                        </div>
                        <div>
                          <span className="text-hf-muted">Venda</span>
                          <div className="text-sm font-extrabold tabular-nums text-hf-ink">
                            {formatMoney(item.price)}
                          </div>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <table className="min-w-full text-left text-sm">
                <thead className="sticky top-0 z-[1] bg-hf-bg text-hf-muted shadow-[0_1px_0_var(--color-hf-line,rgba(0,0,0,0.08))]">
                  <tr>
                    <th className="px-3 py-2">Produto</th>
                    <th className="hidden px-3 py-2 sm:table-cell">Código</th>
                    <th className="px-3 py-2 text-right">Custo</th>
                    <th className="hidden px-3 py-2 text-right md:table-cell">Adic.</th>
                    <th className="hidden px-3 py-2 text-right lg:table-cell">Margem</th>
                    <th className="px-3 py-2 text-right">Venda</th>
                    <th className="hidden px-3 py-2 sm:table-cell">Origem</th>
                    <th className="px-3 py-2">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleItems.map((item) => {
                    const busyRow = rowBusy === item.id
                    return (
                      <tr
                        key={item.id}
                        className={`border-t border-hf-line ${
                          singleMatch?.id === item.id
                            ? 'border-l-4 border-l-hf-red bg-hf-surface-2'
                            : ''
                        }`}
                      >
                        <td className="px-3 py-2">
                          <div className="font-semibold text-hf-ink">
                            {item.productName ?? '—'}
                          </div>
                          <div className="font-mono text-xs text-hf-muted sm:hidden">
                            {item.sku ?? '—'}
                          </div>
                        </td>
                        <td className="hidden px-3 py-2 font-mono text-xs sm:table-cell">
                          {item.sku ?? '—'}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {item.costTotal != null
                            ? formatMoney(item.costTotal)
                            : item.baseCost != null
                              ? formatMoney(item.baseCost)
                              : '—'}
                        </td>
                        <td className="hidden px-3 py-2 text-right tabular-nums md:table-cell">
                          {item.extraCost > 0 ? formatMoney(item.extraCost) : '—'}
                        </td>
                        <td className="hidden px-3 py-2 text-right tabular-nums lg:table-cell">
                          {fmtPct(item.effectiveMarginPct)}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold tabular-nums">
                          {formatMoney(item.price)}
                        </td>
                        <td className="hidden px-3 py-2 text-xs sm:table-cell">
                          {originLabelPt(item.priceOrigin)}
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            className="inline-flex min-h-10 items-center font-semibold text-hf-ink underline"
                            disabled={!allowed || busyRow}
                            onClick={() => setPricingItem(item)}
                          >
                            {formationActive ? 'Calcular / editar' : 'Editar'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-hf-line px-3 py-2 text-xs text-hf-muted">
            <span>
              {filteredCount === 0
                ? `Nenhum item · ${loadedCount} carregados`
                : `Exibindo ${fromIdx}–${toIdx} de ${filteredCount} itens carregados`}
              {loadedCount >= 500 ? ' · limite de 500 no painel' : ''}
            </span>
            {!embedded && effectiveListId ? (
              <Link
                className="font-semibold text-hf-ink underline"
                to={`/admin/precos/${effectiveListId}?tab=produtos`}
              >
                Abrir lista completa
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      {!formationActive ? (
        !addOpen ? (
          <button
            type="button"
            className="text-sm font-semibold text-hf-ink underline"
            onClick={openAddForm}
          >
            + Adicionar código
          </button>
        ) : (
          <form
            ref={addFormRef}
            onSubmit={(e) => void onAddItem(e)}
            className="grid gap-3 rounded-[10px] border border-hf-line border-l-4 border-l-hf-red bg-hf-surface-2 p-3 md:grid-cols-4"
          >
            <Input
              ref={addSkuInputRef}
              label="Código (SKU)"
              value={addSku}
              onChange={(e) => setAddSku(e.target.value)}
              disabled={!allowed || addBusy || loadingItems}
              hint="Produto precisa existir no cadastro."
            />
            <Input
              label="Preço de venda"
              inputMode="decimal"
              value={addPrice}
              onChange={(e) => setAddPrice(e.target.value)}
              disabled={!allowed || addBusy || loadingItems}
            />
            <div className="flex items-end gap-2 md:col-span-2">
              <Button
                type="submit"
                disabled={!allowed || addBusy || loadingItems || !effectiveListId}
              >
                Adicionar à lista
              </Button>
              <Button
                type="button"
                variant="light"
                onClick={() => {
                  setAddOpen(false)
                  setAddSku('')
                  setAddPrice('')
                }}
              >
                Cancelar
              </Button>
            </div>
          </form>
        )
      ) : (
        <p className="text-xs text-hf-muted">
          Cálculo ativo: novos itens pela ficha (Incluir e calcular). Para desligar o cálculo em um
          pé, use Editar → Fixar preço manual.
        </p>
      )}

      <PriceItemPricingModal
        open={pricingItem != null}
        item={pricingItem}
        list={selectedList}
        busy={rowBusy != null}
        onClose={() => setPricingItem(null)}
        onSave={onSavePricingEdit}
      />
    </div>
  )
}
