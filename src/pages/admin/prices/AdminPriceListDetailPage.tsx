import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { useAuth } from '@/contexts/AuthContext'
import { datetimeLocalToIso, formatDateTime, isoToDatetimeLocal } from '@/lib/datetime'
import { CODIGO_REFERENCIA_LABEL } from '@/lib/productLabels'
import { formatMoney, formatMoneyInput, parseMoneyBr } from '@/lib/money'
import { PriceImportWizard } from '@/pages/admin/prices/PriceImportWizard'
import {
  PriceItemPricingModal,
  type PricingEditResult,
} from '@/pages/admin/prices/PriceItemPricingModal'
import { adminListActiveOverrideProductIds } from '@/services/admin/adminPriceOverrideService'
import {
  adminAdjustAllPriceListItems,
  adminDeletePriceListItem,
  adminFindProductIdBySku,
  adminGetImportDetail,
  adminGetPriceList,
  adminGetPriceListStats,
  adminListPriceListImports,
  adminListPriceListOperationalItems,
  adminListPriceLists,
  adminMaterializePublishedOntoPriceList,
  adminRecalculatePriceListItems,
  adminSetCalculatedListPrice,
  adminSetPriceListItemPricing,
  adminSetPriceListPricingRule,
  adminSaveListExtraCostPercent,
  adminSyncProductsOntoPriceList,
  adminUpsertPriceList,
  adminUpsertPriceListItem,
  buildPriceListItemsCsv,
  computeAdjustedPrice,
  filterPriceListItems,
  isVirtualPriceListItemId,
  priceListStatusLabel,
  pricingMethodLabel,
  pricingRuleLabel,
  sortPriceListItems,
  type PriceAdjustMode,
  type PriceList,
  type PriceListImportDetail,
  type PriceListImportSummary,
  type PriceListItem,
  type PriceListItemSortKey,
  type PriceListScope,
  type PriceListStats,
  type PriceListStatus,
  type PriceOrigin,
} from '@/services/admin/adminPriceListService'
import { adminListSuppliers } from '@/services/admin/adminSupplierService'
import type { PricingMethod } from '@/services/pricing/pricingFormulas'
import type { Supplier } from '@/types'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'

type Tab = 'produtos' | 'formacao' | 'importacoes' | 'config'

const TAB_VALUES: Tab[] = ['produtos', 'formacao', 'importacoes', 'config']

function parseTab(raw: string | null): Tab {
  if (raw && (TAB_VALUES as string[]).includes(raw)) return raw as Tab
  return 'produtos'
}
type SortState = { key: PriceListItemSortKey; asc: boolean }

function canManagePricing(role: string | undefined): boolean {
  return role === 'administrador' || role === 'gerente'
}

function originCode(o: PriceOrigin): string {
  if (o === 'calculated') return 'CALCULATED'
  if (o === 'imported') return 'IMPORTED'
  return 'MANUAL'
}

function originClass(o: PriceOrigin): string {
  if (o === 'calculated') return 'bg-emerald-100 text-emerald-900'
  if (o === 'imported') return 'bg-sky-100 text-sky-900'
  return 'bg-amber-100 text-amber-900'
}

function pendingLabels(item: PriceListItem): string[] {
  const labels: string[] = []
  if (item.baseCost == null) labels.push('Sem custo')
  if (!(item.price > 0)) labels.push('Sem preço')
  if (item.hasOverride) labels.push('Override avulso')
  if (item.priceOrigin === 'calculated' && item.baseCost == null) labels.push('Pendente recálculo')
  return labels
}

function OriginBadge({ origin }: { origin: PriceOrigin }) {
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide ${originClass(origin)}`}
    >
      {originCode(origin)}
    </span>
  )
}

export function AdminPriceListDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()
  const allowed = canManagePricing(user?.role)

  const [tab, setTab] = useState<Tab>(() => parseTab(searchParams.get('tab')))
  const [wizardOpen, setWizardOpen] = useState(false)
  const [list, setList] = useState<PriceList | null>(null)
  const [allLists, setAllLists] = useState<PriceList[]>([])
  const [items, setItems] = useState<PriceListItem[]>([])
  const [stats, setStats] = useState<PriceListStats | null>(null)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [imports, setImports] = useState<PriceListImportSummary[]>([])
  const [importDetail, setImportDetail] = useState<PriceListImportDetail | null>(null)
  const [sku, setSku] = useState('')
  const [price, setPrice] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [pricingItem, setPricingItem] = useState<PriceListItem | null>(null)
  const [rowBusy, setRowBusy] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkPrice, setBulkPrice] = useState('')

  const [adjustMode, setAdjustMode] = useState<PriceAdjustMode>('percent')
  const [adjustDirection, setAdjustDirection] = useState<'up' | 'down'>('up')
  const [adjustValue, setAdjustValue] = useState('')
  const [adjustReport, setAdjustReport] = useState<string | null>(null)
  const [ruleMethod, setRuleMethod] = useState<PricingMethod>('fixed')
  const [rulePercent, setRulePercent] = useState('0')
  const [ruleExtraCostPercent, setRuleExtraCostPercent] = useState('0')
  const [ruleReport, setRuleReport] = useState<string | null>(null)

  const [cfgName, setCfgName] = useState('')
  const [cfgDescription, setCfgDescription] = useState('')
  const [cfgStatus, setCfgStatus] = useState<PriceListStatus>('draft')
  const [cfgScope, setCfgScope] = useState<PriceListScope>('public')
  const [cfgPriority, setCfgPriority] = useState('0')
  const [cfgDefault, setCfgDefault] = useState(false)
  const [cfgValidFrom, setCfgValidFrom] = useState('')
  const [cfgValidUntil, setCfgValidUntil] = useState('')
  const [cfgReport, setCfgReport] = useState<string | null>(null)

  const [filterQ, setFilterQ] = useState('')
  const [filterQDebounced, setFilterQDebounced] = useState('')
  const [filterOrigin, setFilterOrigin] = useState<PriceOrigin | ''>('')
  const [filterWithoutCost, setFilterWithoutCost] = useState(false)
  const [filterWithoutPrice, setFilterWithoutPrice] = useState(false)
  const [filterOnlyCalculated, setFilterOnlyCalculated] = useState(false)
  const [filterWithOverride, setFilterWithOverride] = useState(false)
  const [filterSupplierId, setFilterSupplierId] = useState('')
  const [sort, setSort] = useState<SortState>({ key: 'updatedAt', asc: false })

  function selectTab(next: Tab) {
    setTab(next)
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        if (next === 'produtos') p.delete('tab')
        else p.set('tab', next)
        return p
      },
      { replace: true },
    )
  }

  function onChangePriceList(nextId: string) {
    if (!nextId || nextId === id) return
    const tabQs = tab === 'produtos' ? '' : `?tab=${tab}`
    navigate(`/admin/precos/${nextId}${tabQs}`)
  }

  function resetUiForListChange() {
    setList(null)
    setItems([])
    setStats(null)
    setFilterQ('')
    setFilterQDebounced('')
    setFilterOrigin('')
    setFilterWithoutCost(false)
    setFilterWithoutPrice(false)
    setFilterOnlyCalculated(false)
    setFilterWithOverride(false)
    setFilterSupplierId('')
    setSelectedIds(new Set())
    setPricingItem(null)
    setBulkPrice('')
    setSku('')
    setPrice('')
    setAdjustValue('')
    setAdjustReport(null)
    setRuleReport(null)
    setRuleExtraCostPercent('0')
    setCfgReport(null)
    setImportDetail(null)
    setSort({ key: 'updatedAt', asc: false })
  }

  async function reload() {
    setLoading(true)
    setError(null)
    try {
      const [l, its, st, sups, imps, lists] = await Promise.all([
        adminGetPriceList(id),
        adminListPriceListOperationalItems(id),
        adminGetPriceListStats(id),
        adminListSuppliers(),
        adminListPriceListImports(id),
        adminListPriceLists(),
      ])
      const overrideIds = await adminListActiveOverrideProductIds(its.map((i) => i.productId))
      setList(l)
      setAllLists(lists)
      setItems(its.map((i) => ({ ...i, hasOverride: overrideIds.has(i.productId) })))
      setStats(st)
      setSuppliers(sups.filter((s) => s.status === 'active'))
      setImports(imps)
      setSelectedIds(new Set())
      if (l) {
        setRuleMethod(l.pricingMethod)
        setRulePercent(String(l.pricingPercent))
        setRuleExtraCostPercent(String(l.listExtraCostPercent ?? 0))
        setCfgName(l.name)
        setCfgDescription(l.description ?? '')
        setCfgStatus(l.status)
        setCfgScope(l.scope)
        setCfgPriority(String(l.priority))
        setCfgDefault(l.isDefault)
        setCfgValidFrom(isoToDatetimeLocal(l.validFrom))
        setCfgValidUntil(isoToDatetimeLocal(l.validUntil))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!id) return
    setLoading(true)
    resetUiForListChange()
    void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    setTab(parseTab(searchParams.get('tab')))
  }, [searchParams])

  useEffect(() => {
    const t = window.setTimeout(() => setFilterQDebounced(filterQ), 200)
    return () => window.clearTimeout(t)
  }, [filterQ])

  const visibleItems = useMemo(() => {
    const filtered = filterPriceListItems(items, {
      q: filterQDebounced,
      origin: filterOrigin,
      withoutCost: filterWithoutCost,
      withoutPrice: filterWithoutPrice,
      onlyCalculated: filterOnlyCalculated,
      withOverride: filterWithOverride,
      supplierId: filterSupplierId,
    })
    return sortPriceListItems(filtered, sort.key, sort.asc)
  }, [
    items,
    filterQDebounced,
    filterOrigin,
    filterWithoutCost,
    filterWithoutPrice,
    filterOnlyCalculated,
    filterWithOverride,
    filterSupplierId,
    sort,
  ])

  const singleMatch =
    filterQDebounced.trim() && visibleItems.length === 1 ? visibleItems[0] : null

  const suppliersInList = useMemo(() => {
    const ids = new Set(items.map((i) => i.supplierId).filter(Boolean) as string[])
    return suppliers.filter((s) => ids.has(s.id))
  }, [items, suppliers])

  const selectedItems = useMemo(
    () => visibleItems.filter((i) => selectedIds.has(i.id)),
    [visibleItems, selectedIds],
  )

  const allVisibleSelected =
    visibleItems.length > 0 && visibleItems.every((i) => selectedIds.has(i.id))

  function toggleSort(key: PriceListItemSortKey) {
    setSort((prev) =>
      prev.key === key ? { key, asc: !prev.asc } : { key, asc: key === 'sku' || key === 'description' },
    )
  }

  function sortMark(key: PriceListItemSortKey): string {
    if (sort.key !== key) return ''
    return sort.asc ? ' ↑' : ' ↓'
  }

  function toggleSelectAllVisible() {
    if (allVisibleSelected) {
      setSelectedIds(new Set())
      return
    }
    setSelectedIds(new Set(visibleItems.map((i) => i.id)))
  }

  function toggleSelectOne(itemId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }

  async function onAddItem(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const productId = await adminFindProductIdBySku(sku)
      if (!productId) throw new Error(`SKU não encontrado: ${sku}`)
      const priceNum = parseMoneyBr(price)
      if (priceNum == null || priceNum < 0) throw new Error('Preço inválido')
      await adminUpsertPriceListItem({
        priceListId: id,
        productId,
        price: priceNum,
        source: 'manual',
        changedBy: user?.id ?? null,
      })
      setSku('')
      setPrice('')
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar item')
    }
  }

  async function ensureItemOnList(item: PriceListItem): Promise<string> {
    if (!isVirtualPriceListItemId(item.id)) return item.id
    await adminSyncProductsOntoPriceList({
      priceListId: id,
      productIds: [item.productId],
    })
    const fresh = await adminListPriceListOperationalItems(id)
    const row = fresh.find((i) => i.productId === item.productId && !isVirtualPriceListItemId(i.id))
    if (!row) throw new Error('Falha ao incluir item na lista')
    return row.id
  }

  async function onSavePricingEdit(result: PricingEditResult) {
    if (!pricingItem) return
    setRowBusy(pricingItem.id)
    setError(null)
    try {
      const itemId = await ensureItemOnList(pricingItem)
      if (result.mode === 'apply_list_rule') {
        await adminSetPriceListItemPricing({
          itemId,
          mode: 'apply_rule',
          extraCost: pricingItem.extraCost,
        })
      } else if (result.mode === 'edit_rule_percent') {
        void itemId
        await adminSetCalculatedListPrice({
          priceListId: id,
          productId: pricingItem.productId,
          price: result.price,
        })
      } else {
        await adminSetPriceListItemPricing({
          itemId,
          mode: 'manual',
          price: result.price,
        })
      }
      setPricingItem(null)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar precificação')
    } finally {
      setRowBusy(null)
    }
  }

  async function removeItem(itemId: string) {
    if (isVirtualPriceListItemId(itemId)) {
      setError('Item ainda não está na lista — nada a remover')
      return
    }
    if (!window.confirm('Remover este item da lista?')) return
    setRowBusy(itemId)
    try {
      await adminDeletePriceListItem(itemId)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao remover')
    } finally {
      setRowBusy(null)
    }
  }

  async function onBulkRemove() {
    const real = selectedItems.filter((i) => !isVirtualPriceListItemId(i.id))
    if (!real.length) {
      setError('Seleção só tem itens ainda fora da lista — nada a remover')
      return
    }
    if (!window.confirm(`Remover ${real.length} item(ns) da lista?`)) return
    setBusy(true)
    try {
      for (const item of real) {
        await adminDeletePriceListItem(item.id)
      }
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha na remoção em massa')
    } finally {
      setBusy(false)
    }
  }

  async function onBulkApplyRule() {
    if (!selectedItems.length) return
    const ok = window.confirm(
      `Incluir (se necessário) e calcular venda pela regra em ${selectedItems.length} item(ns)?\n` +
        `Origem CALCULATED. Importado/manual na seleção serão convertidos para calculado.`,
    )
    if (!ok) return
    setBusy(true)
    try {
      const virtualIds = selectedItems
        .filter((i) => isVirtualPriceListItemId(i.id))
        .map((i) => i.productId)
      if (virtualIds.length) {
        await adminSyncProductsOntoPriceList({ priceListId: id, productIds: virtualIds })
      }
      // Recarrega IDs reais após sync
      const fresh = await adminListPriceListOperationalItems(id)
      const byProduct = new Map(fresh.map((i) => [i.productId, i]))
      for (const sel of selectedItems) {
        const item = byProduct.get(sel.productId)
        if (!item || isVirtualPriceListItemId(item.id)) continue
        await adminSetPriceListItemPricing({
          itemId: item.id,
          mode: 'apply_rule',
          extraCost: item.extraCost,
        })
      }
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no recálculo da seleção')
    } finally {
      setBusy(false)
    }
  }

  async function onBulkSetPrice() {
    const priceNum = parseMoneyBr(bulkPrice)
    if (priceNum == null || priceNum < 0) {
      setError('Preço em massa inválido')
      return
    }
    if (!selectedItems.length) return
    if (!window.confirm(`Definir preço MANUAL ${formatMoney(priceNum)} em ${selectedItems.length} item(ns)?`)) {
      return
    }
    setBusy(true)
    try {
      const virtualIds = selectedItems
        .filter((i) => isVirtualPriceListItemId(i.id))
        .map((i) => i.productId)
      if (virtualIds.length) {
        await adminSyncProductsOntoPriceList({ priceListId: id, productIds: virtualIds })
      }
      const fresh = await adminListPriceListOperationalItems(id)
      const byProduct = new Map(fresh.map((i) => [i.productId, i]))
      for (const sel of selectedItems) {
        const item = byProduct.get(sel.productId)
        if (!item || isVirtualPriceListItemId(item.id)) {
          await adminUpsertPriceListItem({
            priceListId: id,
            productId: sel.productId,
            price: priceNum,
            source: 'manual',
            changedBy: user?.id ?? null,
          })
          continue
        }
        await adminSetPriceListItemPricing({ itemId: item.id, mode: 'manual', price: priceNum })
      }
      setBulkPrice('')
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao alterar preços')
    } finally {
      setBusy(false)
    }
  }

  function onExportSelected() {
    const csv = buildPriceListItemsCsv(selectedItems.length ? selectedItems : visibleItems)
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lista-preco-${list?.slug ?? id}-export.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function persistRuleOnly(): Promise<string> {
    const pct = Number(String(rulePercent).replace(',', '.'))
    if (!Number.isFinite(pct) || pct < 0) throw new Error('Percentual inválido')
    if (ruleMethod === 'margin_on_sell' && pct >= 100) {
      throw new Error('Margem sobre venda deve ser menor que 100%')
    }
    const extraPct = Number(String(ruleExtraCostPercent).replace(',', '.'))
    let extraMsg = ''
    if (Number.isFinite(extraPct) && extraPct >= 0) {
      const extra = await adminSaveListExtraCostPercent(id, extraPct)
      if (extra.pendingMigration) {
        extraMsg =
          ' Adicional de custo (%) aguarda migration prepared (list_extra_cost R$ inalterado).'
      } else if (extra.saved) {
        extraMsg = ` Adicional de custo: ${extraPct}%.`
      }
    }
    await adminSetPriceListPricingRule({
      priceListId: id,
      pricingMethod: ruleMethod,
      pricingPercent: pct,
      recalculate: false,
    })
    return extraMsg
  }

  /** Salva margem/adicional sem alterar preços de venda. */
  async function onSaveRuleKeepPrices() {
    if (!allowed) return
    setBusy(true)
    setError(null)
    try {
      const extraMsg = await persistRuleOnly()
      setRuleReport(
        `Regra salva (${pricingMethodLabel(ruleMethod)} ${rulePercent}%). Preços de venda NÃO foram alterados.${extraMsg}`,
      )
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar regra')
    } finally {
      setBusy(false)
    }
  }

  /**
   * Salva regra, materializa published com custo na lista (calculated/0),
   * e recalcula venda dos CALCULATED.
   */
  async function onApplyMarginToSell() {
    if (!allowed) return
    if (ruleMethod === 'fixed') {
      setError('Lista em modo fixo — não há formação por margem/markup')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const extraMsg = await persistRuleOnly()
      const sync = await adminMaterializePublishedOntoPriceList({
        priceListId: id,
        onlyWithPrincipalCost: true,
      })
      const dry = await adminRecalculatePriceListItems({ priceListId: id, dryRun: true })
      if (dry.message) {
        setRuleReport(dry.message + extraMsg)
        await reload()
        return
      }
      const ok = window.confirm(
        `Aplicar margem → atualizar preço de venda?\n` +
          `Novos na lista (com custo): ${sync.created}\n` +
          `Atualizar CALCULATED: ${dry.wouldUpdate}\n` +
          `Manual: ${dry.skippedManual} · Importado: ${dry.skippedImported} · Sem custo: ${dry.skippedNoCost}\n` +
          `Imported/manual NÃO mudam.`,
      )
      if (!ok) {
        setRuleReport(
          `Regra salva; aplicação de venda cancelada. Incluídos na lista: ${sync.created}.${extraMsg}`,
        )
        await reload()
        return
      }
      const applied = await adminRecalculatePriceListItems({ priceListId: id, dryRun: false })
      setRuleReport(
        `Margem aplicada. Venda atualizada: ${applied.updated}. ` +
          `Incluídos na lista: ${sync.created}. Manual: ${applied.skippedManual}; importado: ${applied.skippedImported}.${extraMsg}`,
      )
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao aplicar margem')
    } finally {
      setBusy(false)
    }
  }

  async function onApplyGlobalAdjust() {
    const raw =
      adjustMode === 'percent'
        ? Number(String(adjustValue).replace(',', '.'))
        : parseMoneyBr(adjustValue)
    if (raw == null || Number.isNaN(raw) || raw === 0) {
      setError('Informe um valor de ajuste diferente de zero')
      return
    }
    const signed = adjustDirection === 'down' ? -Math.abs(raw) : Math.abs(raw)
    const ok = window.confirm(
      `Ajuste global (lista inteira, ${items.length} itens) — não é formação custo+margem. Continuar?`,
    )
    if (!ok) return
    setBusy(true)
    try {
      const result = await adminAdjustAllPriceListItems({
        priceListId: id,
        mode: adjustMode,
        value: signed,
        changedBy: user?.id ?? null,
      })
      setAdjustReport(`Atualizados: ${result.updated}. Sem mudança: ${result.skipped}.`)
      setAdjustValue('')
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no ajuste global')
    } finally {
      setBusy(false)
    }
  }

  async function onSaveConfig(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setCfgReport(null)
    try {
      await adminUpsertPriceList({
        id,
        name: cfgName,
        description: cfgDescription,
        status: cfgStatus,
        scope: cfgScope,
        priority: Number(cfgPriority) || 0,
        isDefault: cfgDefault,
        validFrom: datetimeLocalToIso(cfgValidFrom),
        validUntil: datetimeLocalToIso(cfgValidUntil),
        slug: list?.slug,
        pricingMethod: list?.pricingMethod,
        pricingPercent: list?.pricingPercent,
      })
      setCfgReport('Configuração salva.')
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar configuração')
    } finally {
      setBusy(false)
    }
  }

  async function openImportDetail(importId: string) {
    try {
      setImportDetail(await adminGetImportDetail(importId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao abrir importação')
    }
  }

  if (loading && !list) return <Loading label="Carregando lista…" />
  if (!list)
    return (
      <div className="space-y-3">
        <p className="text-red-600">Lista não encontrada.</p>
        <Link className="font-semibold text-hf-ink underline" to="/admin/precos">
          ← Voltar às listas de preços
        </Link>
      </div>
    )

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'produtos', label: 'Produtos' },
    { id: 'formacao', label: 'Formação de preço' },
    { id: 'importacoes', label: 'Importações' },
    { id: 'config', label: 'Configuração' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Link to="/admin/precos" className="text-sm font-semibold text-hf-ink underline">
            ← Listas de preços
          </Link>
          <div className="mt-2 flex flex-wrap items-end gap-3">
            <label className="block min-w-[240px] flex-1 text-sm">
              <span className="mb-1 block text-xs font-extrabold text-hf-muted">Lista de preços</span>
              <select
                className="w-full rounded-[9px] border border-hf-line bg-hf-surface px-3 py-3 font-semibold text-hf-ink"
                value={id}
                onChange={(e) => onChangePriceList(e.target.value)}
              >
                {allLists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({priceListStatusLabel(l.status)})
                  </option>
                ))}
              </select>
            </label>
            <div>
              <h1 className="text-2xl font-extrabold text-hf-ink">{list.name}</h1>
              <p className="text-sm text-hf-muted">
                {priceListStatusLabel(list.status)} · {pricingMethodLabel(list.pricingMethod)}{' '}
                {pricingRuleLabel(list.pricingMethod, list.pricingPercent)} · {list.slug}
              </p>
            </div>
          </div>
          <p className="mt-1 text-xs text-hf-muted">
            Método de formação ≠ origem do preço do item (calculated / imported / manual).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={!allowed} onClick={() => setWizardOpen(true)}>
            Importar custos / preços
          </Button>
          <Button type="button" variant="light" onClick={() => selectTab('formacao')}>
            Ações da lista
          </Button>
          <Button type="button" variant="light" onClick={onExportSelected}>
            Exportar
          </Button>
          <Button type="button" variant="light" onClick={() => selectTab('config')}>
            Configurar
          </Button>
        </div>
      </div>

      {stats ? (
        <div className="grid gap-2 rounded-[14px] border border-hf-line bg-hf-surface p-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Total" value={stats.total} />
          <StatCard label="CALCULATED" value={stats.calculated} />
          <StatCard label="IMPORTED" value={stats.imported} />
          <StatCard label="MANUAL" value={stats.manual} />
          <StatCard label="Sem custo" value={stats.withoutCost} warn={stats.withoutCost > 0} />
          <StatCard label="Sem preço" value={stats.withoutPrice} warn={stats.withoutPrice > 0} />
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 border-b border-hf-line pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
              tab === t.id ? 'bg-hf-navy text-white' : 'bg-hf-bg text-hf-ink'
            }`}
            onClick={() => selectTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {tab === 'produtos' ? (
        <div className="space-y-4">
          <form
            onSubmit={(e) => void onAddItem(e)}
            className="grid gap-3 rounded-[14px] border border-hf-line bg-hf-surface p-4 md:grid-cols-4"
          >
            <div className="md:col-span-4 text-sm text-hf-muted">
              Adicionar item com origem <strong>MANUAL</strong>.
            </div>
            <Input label="Código (SKU)" value={sku} onChange={(e) => setSku(e.target.value)} required />
            <Input
              label="Preço"
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
            <div className="flex items-end">
              <Button type="submit" disabled={!allowed}>
                Adicionar
              </Button>
            </div>
          </form>

          <div className="rounded-[14px] border border-hf-line bg-hf-surface p-4">
            <p className="mb-3 text-sm text-hf-muted">
              Contexto: <strong>{list.name}</strong> · {pricingMethodLabel(list.pricingMethod)}{' '}
              {pricingRuleLabel(list.pricingMethod, list.pricingPercent)}. Preços exibidos são só desta
              lista.
            </p>
            <form
              className="space-y-3"
              onSubmit={(e: FormEvent) => {
                e.preventDefault()
                setFilterQDebounced(filterQ.trim())
              }}
            >
              <div className="flex flex-wrap items-start gap-2">
                <div className="min-w-[200px] flex-1">
                  <Input
                    label="Código, descrição ou referência"
                    hint="Busca em código, descrição e código do fabricante. Referência de fornecedor não incluída nesta tela."
                    value={filterQ}
                    onChange={(e) => setFilterQ(e.target.value)}
                    placeholder="Ex.: filtro, ABC-1…"
                  />
                </div>
                <Button type="submit" className="mt-[22px] shrink-0">
                  Buscar
                </Button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1 block text-xs font-extrabold text-hf-muted">Origem do preço</span>
                  <select
                    className="w-full rounded-[9px] border border-hf-line px-3 py-3"
                    value={filterOrigin}
                    onChange={(e) => setFilterOrigin(e.target.value as PriceOrigin | '')}
                  >
                    <option value="">Todas</option>
                    <option value="calculated">Calculado</option>
                    <option value="imported">Importado</option>
                    <option value="manual">Manual</option>
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-xs font-extrabold text-hf-muted">Fornecedor</span>
                  <select
                    className="w-full rounded-[9px] border border-hf-line px-3 py-3"
                    value={filterSupplierId}
                    onChange={(e) => setFilterSupplierId(e.target.value)}
                  >
                    <option value="">Todos</option>
                    {suppliersInList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </form>
            <div className="mt-3 flex flex-wrap gap-4 text-sm">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filterWithoutCost}
                  onChange={(e) => setFilterWithoutCost(e.target.checked)}
                />
                Sem custo
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filterWithoutPrice}
                  onChange={(e) => setFilterWithoutPrice(e.target.checked)}
                />
                Sem preço
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filterOnlyCalculated}
                  onChange={(e) => setFilterOnlyCalculated(e.target.checked)}
                />
                Só CALCULATED
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filterWithOverride}
                  onChange={(e) => setFilterWithOverride(e.target.checked)}
                />
                Com override
              </label>
            </div>
            <p className="mt-2 text-xs text-hf-muted">
              Itens na visão (lista + cadastro sem preço): {items.length} · filtrados:{' '}
              {visibleItems.length}
            </p>
            {singleMatch ? (
              <div className="mt-3 rounded-[10px] border border-hf-yellow-dark/40 bg-hf-yellow/20 px-3 py-2 text-sm">
                Match único · Preço na lista <strong>{list.name}</strong>:{' '}
                <strong>{formatMoney(singleMatch.price)}</strong>
                {singleMatch.sku ? (
                  <span className="text-hf-muted"> · {singleMatch.sku}</span>
                ) : null}
              </div>
            ) : null}
          </div>

          {selectedItems.length > 0 ? (
            <div className="flex flex-wrap items-end gap-2 rounded-[14px] border border-hf-line bg-hf-surface p-3">
              <span className="text-sm font-semibold text-hf-ink">
                {selectedItems.length} selecionado(s)
              </span>
              <Button type="button" variant="light" disabled={busy || !allowed} onClick={() => void onBulkApplyRule()}>
                Incluir e calcular seleção
              </Button>
              <Button type="button" variant="light" disabled={busy} onClick={onExportSelected}>
                Exportar seleção
              </Button>
              <Input
                label="Novo preço MANUAL"
                inputMode="decimal"
                value={bulkPrice}
                onChange={(e) => setBulkPrice(e.target.value)}
              />
              <Button type="button" disabled={busy || !allowed} onClick={() => void onBulkSetPrice()}>
                Definir preço manual
              </Button>
              <Button type="button" variant="light" disabled={busy} onClick={() => void onBulkRemove()}>
                Remover da lista
              </Button>
            </div>
          ) : null}

          <div className="overflow-x-auto rounded-[14px] border border-hf-line bg-hf-surface">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-hf-line bg-hf-bg text-hf-muted">
                <tr>
                  <th className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAllVisible}
                      title="Selecionar todos os resultados filtrados (carregados)"
                    />
                  </th>
                  <th className="px-3 py-2">
                    <button type="button" onClick={() => toggleSort('description')}>
                      Produto{sortMark('description')}
                    </button>
                  </th>
                  <th className="px-3 py-2">
                    <button type="button" onClick={() => toggleSort('sku')}>
                      {CODIGO_REFERENCIA_LABEL}{sortMark('sku')}
                    </button>
                  </th>
                  <th className="px-3 py-2">
                    <button type="button" onClick={() => toggleSort('cost')}>
                      Custo{sortMark('cost')}
                    </button>
                  </th>
                  <th className="px-3 py-2">
                    <button type="button" onClick={() => toggleSort('markup')}>
                      Markup{sortMark('markup')}
                    </button>
                  </th>
                  <th className="px-3 py-2">
                    <button type="button" onClick={() => toggleSort('margin')}>
                      Margem{sortMark('margin')}
                    </button>
                  </th>
                  <th className="px-3 py-2">
                    <button type="button" onClick={() => toggleSort('price')}>
                      Preço{sortMark('price')}
                    </button>
                  </th>
                  <th className="px-3 py-2">
                    <button type="button" onClick={() => toggleSort('origin')}>
                      Origem{sortMark('origin')}
                    </button>
                  </th>
                  <th className="px-3 py-2">Ação</th>
                </tr>
              </thead>
              <tbody>
                {visibleItems.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-6 text-center text-hf-muted">
                      Nenhum item com os filtros atuais.
                    </td>
                  </tr>
                ) : (
                  visibleItems.map((item) => {
                    const busyRow = rowBusy === item.id
                    const isSingleHit = singleMatch?.id === item.id
                    return (
                      <tr
                        key={item.id}
                        className={`border-b border-hf-line/70 align-top ${
                          isSingleHit ? 'bg-hf-yellow/25' : ''
                        }`}
                      >
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(item.id)}
                            onChange={() => toggleSelectOne(item.id)}
                          />
                        </td>
                        <td className="px-3 py-2">
                          {item.productName}
                          {pendingLabels(item).length ? (
                            <div className="text-xs text-amber-800">
                              {pendingLabels(item).join(' · ')}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">{item.sku}</td>
                        <td className="px-3 py-2">
                          {item.costTotal != null
                            ? formatMoney(item.costTotal)
                            : item.baseCost != null
                              ? formatMoney(item.baseCost)
                              : '—'}
                        </td>
                        <td className="px-3 py-2">
                          {item.effectiveMarkupPct != null
                            ? `${item.effectiveMarkupPct.toFixed(1)}%`
                            : '—'}
                        </td>
                        <td className="px-3 py-2">
                          {item.effectiveMarginPct != null
                            ? `${item.effectiveMarginPct.toFixed(1)}%`
                            : '—'}
                        </td>
                        <td className="px-3 py-2 font-semibold">{formatMoney(item.price)}</td>
                        <td className="px-3 py-2">
                          <OriginBadge origin={item.priceOrigin} />
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="text-sm font-semibold text-hf-ink underline"
                              disabled={!allowed || busyRow}
                              onClick={() => setPricingItem(item)}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className="text-sm font-semibold text-red-700 underline"
                              disabled={busyRow}
                              onClick={() => void removeItem(item.id)}
                            >
                              Remover
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {tab === 'formacao' ? (
        <div className="space-y-4">
          <div className="rounded-[14px] border border-hf-line bg-hf-surface p-4">
            <h2 className="m-0 text-lg font-extrabold text-hf-ink">Regra de formação</h2>
            <p className="mt-1 text-sm text-hf-muted">
              Fluxo: CUSTO → adicional de custo (%) → base → markup/margem ou preço fixo → preço
              final. Formação não altera `price_origin` de itens importados/manuais.{' '}
              <code className="rounded bg-hf-bg px-1">list_extra_cost</code> (R$) permanece
              informativo e fora do cálculo.
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-extrabold text-hf-muted">
                  Regra de formação
                </span>
                <select
                  className="w-full rounded-[9px] border border-hf-line px-3 py-3"
                  value={ruleMethod}
                  disabled={busy || !allowed}
                  onChange={(e) => setRuleMethod(e.target.value as PricingMethod)}
                >
                  <option value="fixed">Preço fixo (sem fórmula automática)</option>
                  <option value="markup_on_cost">Markup sobre custo</option>
                  <option value="margin_on_sell">Margem sobre venda</option>
                </select>
              </label>
              <Input
                label={ruleMethod === 'markup_on_cost' ? 'Markup (%)' : ruleMethod === 'margin_on_sell' ? 'Margem (%)' : '% (formação)'}
                value={rulePercent}
                disabled={busy || !allowed || ruleMethod === 'fixed'}
                onChange={(e) => setRulePercent(e.target.value)}
                hint="Percentual da regra de venda — não é adicional de custo."
              />
              <Input
                label="Adicional de custo (%)"
                value={ruleExtraCostPercent}
                disabled={busy || !allowed}
                onChange={(e) => setRuleExtraCostPercent(e.target.value)}
                hint="Campo paralelo a list_extra_cost (R$). Persistência no banco após migration prepared."
              />
              <Input
                label="list_extra_cost R$ (informativo)"
                value={formatMoneyInput(list.listExtraCost)}
                disabled
                hint="Não entra no cálculo. Não remover / não reinterpretar como %."
              />
              <div className="flex flex-wrap items-end gap-2 md:col-span-2">
                <Button
                  type="button"
                  variant="light"
                  disabled={busy || !allowed}
                  onClick={() => void onSaveRuleKeepPrices()}
                >
                  Salvar margem (manter venda)
                </Button>
                <Button
                  type="button"
                  disabled={busy || !allowed || ruleMethod === 'fixed'}
                  onClick={() => void onApplyMarginToSell()}
                >
                  Aplicar margem → atualizar venda
                </Button>
                <Link
                  className="pb-3 text-sm font-semibold text-hf-ink underline"
                  to="/admin/precos"
                >
                  Voltar à consulta
                </Link>
              </div>
              <p className="md:col-span-2 text-xs text-hf-muted">
                Salvar margem: só persiste regra/adicional. Aplicar margem: inclui produtos com custo
                ainda fora da lista e recalcula só itens CALCULATED (imported/manual ficam iguais).
              </p>
            </div>
            {ruleReport ? <p className="mt-2 text-sm text-green-700">{ruleReport}</p> : null}
          </div>

          <div className="rounded-[14px] border border-hf-line bg-hf-surface p-4">
            <h2 className="text-lg font-extrabold text-hf-ink">Ajuste global (lista inteira)</h2>
            <p className="mt-1 text-sm text-hf-muted">
              RPC adjust_price_list_items — distinto da seleção em massa da aba Produtos. Aplica só à
              lista <strong>{list.name}</strong>. Ex.:{' '}
              {items[0] ? formatMoney(computeAdjustedPrice(items[0].price, 'percent', 10)) : '—'}
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-4">
              <select
                className="rounded-[9px] border border-hf-line px-3 py-3"
                value={adjustMode}
                onChange={(e) => setAdjustMode(e.target.value as PriceAdjustMode)}
              >
                <option value="percent">Percentual</option>
                <option value="fixed">Valor fixo</option>
              </select>
              <select
                className="rounded-[9px] border border-hf-line px-3 py-3"
                value={adjustDirection}
                onChange={(e) => setAdjustDirection(e.target.value as 'up' | 'down')}
              >
                <option value="up">Aumentar</option>
                <option value="down">Diminuir</option>
              </select>
              <Input label="Valor" value={adjustValue} onChange={(e) => setAdjustValue(e.target.value)} />
              <div className="flex items-end">
                <Button
                  type="button"
                  disabled={busy || !allowed}
                  onClick={() => void onApplyGlobalAdjust()}
                >
                  Aplicar a todos
                </Button>
              </div>
            </div>
            {adjustReport ? <p className="mt-2 text-sm text-green-700">{adjustReport}</p> : null}
          </div>
        </div>
      ) : null}

      {tab === 'importacoes' ? (
        <div className="space-y-4">
          <div className="rounded-[14px] border border-hf-line bg-hf-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="m-0 text-lg font-extrabold text-hf-ink">Histórico de importações</h2>
                <p className="mt-1 text-sm text-hf-muted">Fonte: imports / import_items (kind=price_list).</p>
              </div>
              <Button type="button" disabled={!allowed} onClick={() => setWizardOpen(true)}>
                Nova importação
              </Button>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-hf-bg text-hf-muted">
                  <tr>
                    <th className="px-3 py-2">Data</th>
                    <th className="px-3 py-2">Arquivo</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 text-right">Linhas</th>
                    <th className="px-3 py-2 text-right">Erros</th>
                    <th className="px-3 py-2">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {imports.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-hf-muted">
                        Nenhuma importação registrada para esta lista.
                      </td>
                    </tr>
                  ) : (
                    imports.map((imp) => (
                      <tr key={imp.id} className="border-b border-hf-line/70">
                        <td className="px-3 py-2 text-xs">{formatDateTime(imp.createdAt)}</td>
                        <td className="px-3 py-2">{imp.filename}</td>
                        <td className="px-3 py-2">{imp.status}</td>
                        <td className="px-3 py-2 text-right">{imp.totalItems}</td>
                        <td className="px-3 py-2 text-right">{imp.errorItems}</td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            className="font-semibold text-hf-ink underline"
                            onClick={() => void openImportDetail(imp.id)}
                          >
                            Detalhes
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          {importDetail ? (
            <div className="rounded-[14px] border border-hf-line bg-hf-surface p-4">
              <h3 className="m-0 font-extrabold text-hf-ink">{importDetail.filename}</h3>
              <p className="text-sm text-hf-muted">
                {importDetail.status} · {formatDateTime(importDetail.createdAt)} ·{' '}
                {importDetail.totalItems} itens
              </p>
              <div className="mt-2 max-h-64 overflow-auto text-xs">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-hf-bg text-left">
                      <th className="px-2 py-1">Linha</th>
                      <th className="px-2 py-1">Resultado</th>
                      <th className="px-2 py-1">Payload</th>
                      <th className="px-2 py-1">Erros</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importDetail.items.slice(0, 100).map((it) => (
                      <tr key={it.id}>
                        <td className="px-2 py-1">{it.lineNumber ?? '—'}</td>
                        <td className="px-2 py-1">{it.result ?? '—'}</td>
                        <td className="px-2 py-1 font-mono">
                          {String(it.payload.sku ?? '')} {String(it.payload.price ?? '')}
                        </td>
                        <td className="px-2 py-1 text-red-600">{it.errors.join('; ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button type="button" variant="light" className="mt-2" onClick={() => setImportDetail(null)}>
                Fechar detalhes
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === 'config' ? (
        <form
          onSubmit={(e) => void onSaveConfig(e)}
          className="grid gap-3 rounded-[14px] border border-hf-line bg-hf-surface p-4 md:grid-cols-2"
        >
          <Input label="Nome" value={cfgName} onChange={(e) => setCfgName(e.target.value)} required />
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-hf-ink">Status</span>
            <select
              className="w-full rounded-[10px] border border-hf-line px-3 py-2"
              value={cfgStatus}
              onChange={(e) => setCfgStatus(e.target.value as PriceListStatus)}
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
              onChange={(e) => setCfgDescription(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-hf-ink">Escopo</span>
            <select
              className="w-full rounded-[10px] border border-hf-line px-3 py-2"
              value={cfgScope}
              onChange={(e) => setCfgScope(e.target.value as PriceListScope)}
            >
              <option value="public">public</option>
              <option value="assigned">assigned</option>
            </select>
          </label>
          <Input
            label="Prioridade"
            type="number"
            value={cfgPriority}
            onChange={(e) => setCfgPriority(e.target.value)}
          />
          <Input
            label="Válida de"
            type="datetime-local"
            value={cfgValidFrom}
            onChange={(e) => setCfgValidFrom(e.target.value)}
          />
          <Input
            label="Válida até"
            type="datetime-local"
            value={cfgValidUntil}
            onChange={(e) => setCfgValidUntil(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm font-semibold text-hf-ink md:col-span-2">
            <input
              type="checkbox"
              checked={cfgDefault}
              onChange={(e) => setCfgDefault(e.target.checked)}
            />
            Lista padrão (fallback)
          </label>
          <p className="text-xs text-hf-muted md:col-span-2">
            Formação de preço (método/%) edita-se na aba Formação — não confundir com origem do
            item.
          </p>
          <div className="flex gap-2 md:col-span-2">
            <Button type="submit" disabled={busy}>
              Salvar configuração
            </Button>
          </div>
          {cfgReport ? <p className="text-sm text-green-700 md:col-span-2">{cfgReport}</p> : null}
        </form>
      ) : null}

      <PriceItemPricingModal
        open={pricingItem != null}
        item={pricingItem}
        list={list}
        busy={rowBusy != null}
        onClose={() => setPricingItem(null)}
        onSave={onSavePricingEdit}
      />

      <PriceImportWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        initialPriceListId={id}
        createdBy={user?.id ?? null}
        allowed={allowed}
        onApplied={() => {
          setFilterQ('')
          setFilterQDebounced('')
          setFilterOrigin('')
          setFilterWithoutCost(false)
          setFilterWithoutPrice(false)
          setFilterOnlyCalculated(false)
          setFilterWithOverride(false)
          setFilterSupplierId('')
          selectTab('produtos')
          void reload()
        }}
      />
    </div>
  )
}

function StatCard({
  label,
  value,
  warn,
}: {
  label: string
  value: number
  warn?: boolean
}) {
  return (
    <div className="rounded-[10px] border border-hf-line bg-hf-bg px-3 py-2">
      <div className="text-[11px] font-extrabold uppercase tracking-wide text-hf-muted">{label}</div>
      <div className={`text-xl font-extrabold ${warn ? 'text-amber-800' : 'text-hf-ink'}`}>
        {value}
      </div>
    </div>
  )
}


