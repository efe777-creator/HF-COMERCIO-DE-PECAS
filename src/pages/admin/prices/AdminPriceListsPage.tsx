import { PricingRuleFields } from '@/components/admin/prices/PricingRuleFields'
import { PriceListWorkSurface } from '@/components/admin/prices/PriceListWorkSurface'
import { AdaptiveWorkspace } from '@/components/admin/workspace/AdaptiveWorkspace'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { useAuth } from '@/contexts/AuthContext'
import { useIdSplitTabs } from '@/hooks/useIdSplitTabs'
import { formatDateTime } from '@/lib/datetime'
import { PriceImportWizard } from '@/pages/admin/prices/PriceImportWizard'
import {
  adminDeletePriceList,
  adminDuplicatePriceList,
  adminGetPriceListsOverview,
  adminSaveListExtraCostPercent,
  adminUpsertPriceList,
  priceListStatusLabel,
  pricingMethodLabel,
  pricingRuleLabel,
  type PriceListOverviewRow,
  type PriceListStatus,
  type PriceListsOverview,
} from '@/services/admin/adminPriceListService'
import type { PricingMethod } from '@/services/pricing/pricingFormulas'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

type FormMode = 'closed' | 'create' | 'edit'

function emptyOverview(): PriceListsOverview {
  return { lists: [], activeLists: 0, totalItems: 0, withPrice: 0, withoutPrice: 0 }
}

function canManagePricing(role: string | undefined): boolean {
  return role === 'administrador' || role === 'gerente'
}

export function AdminPriceListsPage() {
  const { user } = useAuth()
  const splitTabs = useIdSplitTabs()
  const allowed = canManagePricing(user?.role)
  const [overview, setOverview] = useState<PriceListsOverview>(emptyOverview())
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formMode, setFormMode] = useState<FormMode>('closed')
  const [editing, setEditing] = useState<PriceListOverviewRow | null>(null)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [wizardListId, setWizardListId] = useState<string | undefined>(undefined)
  const [forceWithoutPrice, setForceWithoutPrice] = useState(false)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<PriceListStatus>('draft')
  const [pricingMethod, setPricingMethod] = useState<PricingMethod>('fixed')
  const [pricingPercent, setPricingPercent] = useState('0')
  const [listExtraCostPercent, setListExtraCostPercent] = useState('0')
  const [formNotice, setFormNotice] = useState<string | null>(null)

  const nameInputRef = useRef<HTMLInputElement>(null)

  const focusedList = useMemo(() => {
    if (!splitTabs.activeId) return null
    return overview.lists.find((l) => l.id === splitTabs.activeId) ?? null
  }, [overview.lists, splitTabs.activeId])

  const contextualOpen = splitTabs.hasOpen || formMode !== 'closed'
  const activeGuideListId = splitTabs.activeId ?? ''

  async function reload(opts?: { showPageLoading?: boolean }) {
    const showPageLoading = opts?.showPageLoading ?? false
    if (showPageLoading) setLoading(true)
    setError(null)
    try {
      setOverview(await adminGetPriceListsOverview())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar listas')
    } finally {
      setLoading(false)
    }
  }

  async function reloadOverviewQuiet() {
    setError(null)
    try {
      setOverview(await adminGetPriceListsOverview())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar listas')
    }
  }

  useEffect(() => {
    void reload({ showPageLoading: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (formMode === 'closed') return
    window.requestAnimationFrame(() => {
      nameInputRef.current?.focus()
      nameInputRef.current?.select()
    })
  }, [formMode])

  function openCreate() {
    splitTabs.closeAll()
    setFormMode('create')
    setEditing(null)
    setName('')
    setDescription('')
    setStatus('draft')
    setPricingMethod('fixed')
    setPricingPercent('0')
    setListExtraCostPercent('0')
    setFormNotice(null)
    setAdvancedOpen(false)
  }

  function openConfigure(list: PriceListOverviewRow) {
    splitTabs.closeAll()
    setFormMode('edit')
    setEditing(list)
    setName(list.name)
    setDescription(list.description ?? '')
    setStatus(list.status)
    setPricingMethod(list.pricingMethod)
    setPricingPercent(String(list.pricingPercent ?? 0))
    setListExtraCostPercent(String(list.listExtraCostPercent ?? 0))
    setFormNotice(null)
    setAdvancedOpen(false)
    setMenuOpenId(null)
  }

  function openListGuide(list: PriceListOverviewRow) {
    setFormMode('closed')
    setFormNotice(null)
    splitTabs.openTab(list.id)
    setMenuOpenId(null)
  }

  function closeForm() {
    setFormMode('closed')
    setEditing(null)
    setAdvancedOpen(false)
    setFormNotice(null)
  }

  function closeContextual() {
    closeForm()
    splitTabs.closeAll()
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setFormNotice(null)
    try {
      const saved = await adminUpsertPriceList({
        id: editing?.id,
        name,
        description,
        status,
        scope: editing?.scope ?? 'public',
        priority: editing?.priority ?? 0,
        isDefault: editing?.isDefault ?? false,
        validFrom: editing?.validFrom,
        validUntil: editing?.validUntil,
        slug: editing?.slug,
        pricingMethod,
        pricingPercent: Number(pricingPercent) || 0,
      })
      const pctExtra = Number(String(listExtraCostPercent).replace(',', '.'))
      let pendingExtra = false
      if (Number.isFinite(pctExtra) && pctExtra >= 0) {
        const extra = await adminSaveListExtraCostPercent(saved.id, pctExtra)
        pendingExtra = Boolean(extra.pendingMigration)
      }
      closeForm()
      await reloadOverviewQuiet()
      if (pendingExtra) {
        setFormNotice(
          'Lista salva. Adicional de custo (%) aguarda migration prepared (não aplicada). list_extra_cost (R$) permanece inalterado.',
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar lista')
    } finally {
      setBusy(false)
    }
  }

  async function onToggleStatus(list: PriceListOverviewRow) {
    const next: PriceListStatus = list.status === 'active' ? 'inactive' : 'active'
    if (!window.confirm(`Deseja ${next === 'active' ? 'ativar' : 'inativar'} a lista "${list.name}"?`)) {
      return
    }
    setBusy(true)
    setError(null)
    setMenuOpenId(null)
    try {
      await adminUpsertPriceList({
        id: list.id,
        name: list.name,
        description: list.description,
        status: next,
        scope: list.scope,
        priority: list.priority,
        isDefault: list.isDefault,
        validFrom: list.validFrom,
        validUntil: list.validUntil,
        slug: list.slug,
        pricingMethod: list.pricingMethod,
        pricingPercent: list.pricingPercent,
      })
      await reloadOverviewQuiet()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao alterar status')
    } finally {
      setBusy(false)
    }
  }

  async function onDuplicate(list: PriceListOverviewRow) {
    if (
      !window.confirm(
        `Duplicar a lista "${list.name}"?\n\nItens e origem de preço serão copiados. Nenhum recálculo será executado.`,
      )
    ) {
      return
    }
    setBusy(true)
    setError(null)
    setMenuOpenId(null)
    try {
      await adminDuplicatePriceList(list.id)
      await reloadOverviewQuiet()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao duplicar lista')
    } finally {
      setBusy(false)
    }
  }

  async function onDelete(list: PriceListOverviewRow) {
    const ok = window.confirm(
      `Excluir a lista "${list.name}"?\n\nEsta ação não pode ser desfeita.\n` +
        `Todos os ${list.itemCount ?? 0} item(ns) desta lista também serão excluídos (cascade).`,
    )
    if (!ok) return
    setBusy(true)
    setError(null)
    setMenuOpenId(null)
    try {
      await adminDeletePriceList(list.id)
      if (editing?.id === list.id) closeForm()
      if (splitTabs.activeId === list.id) splitTabs.closeTab(list.id)
      await reloadOverviewQuiet()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao excluir lista')
    } finally {
      setBusy(false)
    }
  }

  function openWizard(listId?: string) {
    setWizardListId(listId)
    setWizardOpen(true)
    setMenuOpenId(null)
  }

  const formGuide = (
    <form onSubmit={onSubmit} className="grid gap-3 p-1 md:grid-cols-2">
      <Input
        ref={nameInputRef}
        label={formMode === 'edit' ? 'Configurar lista' : 'Nome da lista'}
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <label className="block text-sm">
        <span className="mb-1 block font-semibold text-hf-ink">Status</span>
        <select
          className="w-full rounded-[10px] border border-hf-line bg-hf-surface px-3 py-2"
          value={status}
          onChange={(e) => setStatus(e.target.value as PriceListStatus)}
        >
          <option value="draft">Rascunho</option>
          <option value="active">Ativa</option>
          <option value="inactive">Inativa</option>
        </select>
      </label>
      <label className="block text-sm md:col-span-2">
        <span className="mb-1 block font-semibold text-hf-ink">Descrição</span>
        <textarea
          className="min-h-[72px] w-full rounded-[10px] border border-hf-line bg-hf-surface px-3 py-2 text-sm"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>

      <div className="md:col-span-2">
        <button
          type="button"
          className="text-sm font-semibold text-hf-ink underline"
          onClick={() => setAdvancedOpen((v) => !v)}
        >
          {advancedOpen ? '▾' : '▸'} Avançado — regra de formação
        </button>
        {advancedOpen ? (
          <div className="mt-3 space-y-3">
            <PricingRuleFields
              method={pricingMethod}
              percent={pricingPercent}
              extraCostPercent={listExtraCostPercent}
              hidePercentWhenFixed
              onMethod={setPricingMethod}
              onPercent={setPricingPercent}
              onExtraCostPercent={setListExtraCostPercent}
            />
            {editing ? (
              <p className="text-sm text-hf-muted">
                Preferir a tela completa?{' '}
                <Link
                  className="font-semibold text-hf-ink underline"
                  to={`/admin/precos/${editing.id}?tab=formacao`}
                >
                  Abrir formação na lista
                </Link>
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex gap-2 md:col-span-2">
        <Button type="submit" disabled={busy}>
          {formMode === 'edit' ? 'Salvar' : 'Criar lista'}
        </Button>
        <Button type="button" variant="light" onClick={closeForm} disabled={busy}>
          Cancelar
        </Button>
      </div>
      {formNotice ? <p className="text-sm text-amber-300 md:col-span-2">{formNotice}</p> : null}
    </form>
  )

  const primary = (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-hf-ink">Listas de preço</h1>
          <p className="mt-1 max-w-2xl text-sm text-hf-muted">
            <strong>Gestão das listas</strong> (criar, status, duplicar, importar). Clique numa
            linha para abrir a guia de consulta. Abra a lista completa para formação e itens.
            Formação: custo → adicional % → markup/margem → venda. Não confundir com{' '}
            <Link className="font-semibold text-hf-ink underline" to="/admin/clientes/listas">
              Listas B2B
            </Link>{' '}
            (visibilidade — dentro de Clientes).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/moldes-importacao/06_lista_precos.csv" download>
            <Button type="button" variant="light">
              Baixar molde
            </Button>
          </a>
          <Button type="button" variant="light" onClick={() => openWizard()} disabled={busy}>
            Importar planilha
          </Button>
          <Button type="button" variant="light" onClick={openCreate} disabled={busy}>
            + Nova lista
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 rounded-[10px] border border-hf-line bg-hf-surface px-3 py-2 text-sm">
        <span>
          <span className="text-hf-muted">Ativas </span>
          <strong className="tabular-nums text-hf-ink">{overview.activeLists}</strong>
        </span>
        <span className="text-hf-line">·</span>
        <span>
          <span className="text-hf-muted">Itens </span>
          <strong className="tabular-nums text-hf-ink">{overview.totalItems}</strong>
        </span>
        <span className="text-hf-line">·</span>
        <span>
          <span className="text-hf-muted">Com preço </span>
          <strong className="tabular-nums text-hf-ink">{overview.withPrice}</strong>
        </span>
        <span className="text-hf-line">·</span>
        <button
          type="button"
          className={`font-semibold underline ${
            overview.withoutPrice > 0 ? 'text-amber-300' : 'text-hf-ink'
          }`}
          onClick={() => {
            setForceWithoutPrice((v) => !v)
            if (overview.lists[0]) openListGuide(overview.lists[0])
          }}
          title="Abrir guia filtrando itens sem preço"
        >
          Sem preço {overview.withoutPrice}
          {forceWithoutPrice ? ' (filtro on)' : ''}
        </button>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {formNotice && formMode === 'closed' ? (
        <p className="text-sm text-amber-300">{formNotice}</p>
      ) : null}
      {loading ? <Loading label="Carregando listas…" /> : null}

      <div>
        <h2 className="mb-2 text-lg font-extrabold text-hf-ink">Gerenciar listas</h2>
        <div className="overflow-x-auto rounded-[14px] border border-hf-line bg-hf-surface">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-hf-line bg-hf-bg text-hf-muted">
              <tr>
                <th className="px-3 py-2">Lista</th>
                <th className="px-3 py-2">Status</th>
                <th className="hidden px-3 py-2 md:table-cell">Método</th>
                <th className="hidden px-3 py-2 md:table-cell">Regra</th>
                <th className="px-3 py-2 text-right">Itens</th>
                <th className="hidden px-3 py-2 text-right lg:table-cell">Com preço</th>
                <th className="hidden px-3 py-2 lg:table-cell">Atualizada</th>
                <th className="px-3 py-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {!loading && overview.lists.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-hf-muted">
                    <p>Nenhuma lista cadastrada.</p>
                    <Button type="button" className="mt-3" onClick={openCreate}>
                      Criar primeira lista
                    </Button>
                  </td>
                </tr>
              ) : null}
              {overview.lists.map((list) => (
                <tr
                  key={list.id}
                  className={`border-b border-hf-line/70 ${
                    activeGuideListId === list.id ? 'border-l-4 border-l-hf-red bg-hf-surface-2' : ''
                  }`}
                >
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className="text-left"
                      onClick={() => openListGuide(list)}
                    >
                      <div className="font-semibold text-hf-ink underline-offset-2 hover:underline">
                        {list.name}
                      </div>
                      <div className="text-xs text-hf-muted">
                        {list.slug}
                        {list.isDefault ? ' · padrão' : ''}
                        {list.scope === 'assigned' ? ' · B2B' : ''}
                      </div>
                    </button>
                  </td>
                  <td className="px-3 py-2">{priceListStatusLabel(list.status)}</td>
                  <td className="hidden px-3 py-2 md:table-cell">
                    {pricingMethodLabel(list.pricingMethod)}
                  </td>
                  <td className="hidden px-3 py-2 md:table-cell">
                    {pricingRuleLabel(list.pricingMethod, list.pricingPercent)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{list.itemCount ?? 0}</td>
                  <td className="hidden px-3 py-2 text-right tabular-nums lg:table-cell">
                    {list.withPriceCount}
                  </td>
                  <td className="hidden px-3 py-2 text-xs text-hf-muted lg:table-cell">
                    {list.updatedAt ? formatDateTime(list.updatedAt) : '—'}
                  </td>
                  <td className="px-3 py-2">
                    <div className="relative flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className="text-sm font-extrabold text-hf-ink underline"
                        onClick={() => openListGuide(list)}
                      >
                        Guia
                      </button>
                      <Link
                        className="text-sm font-semibold text-hf-ink underline"
                        to={`/admin/precos/${list.id}?tab=produtos`}
                      >
                        Abrir
                      </Link>
                      <button
                        type="button"
                        className="text-sm font-semibold text-hf-ink underline"
                        disabled={busy}
                        onClick={() => openConfigure(list)}
                      >
                        Configurar
                      </button>
                      <button
                        type="button"
                        className="rounded border border-hf-line px-2 py-0.5 text-sm font-bold text-hf-ink"
                        disabled={busy}
                        aria-label="Mais ações"
                        onClick={() =>
                          setMenuOpenId((id) => (id === list.id ? null : list.id))
                        }
                      >
                        ⋯
                      </button>
                      {menuOpenId === list.id ? (
                        <div className="absolute right-0 top-8 z-10 min-w-[140px] rounded-[10px] border border-hf-line bg-hf-surface p-2 shadow-md">
                          <button
                            type="button"
                            className="block w-full px-2 py-1.5 text-left text-sm font-semibold text-hf-ink hover:bg-hf-bg"
                            onClick={() => openWizard(list.id)}
                          >
                            Importar
                          </button>
                          <button
                            type="button"
                            className="block w-full px-2 py-1.5 text-left text-sm font-semibold text-hf-ink hover:bg-hf-bg"
                            onClick={() => void onDuplicate(list)}
                          >
                            Duplicar
                          </button>
                          <button
                            type="button"
                            className="block w-full px-2 py-1.5 text-left text-sm font-semibold text-hf-ink hover:bg-hf-bg"
                            onClick={() => void onToggleStatus(list)}
                          >
                            {list.status === 'active' ? 'Inativar' : 'Ativar'}
                          </button>
                          <button
                            type="button"
                            className="block w-full px-2 py-1.5 text-left text-sm font-semibold text-hf-danger hover:bg-hf-bg"
                            onClick={() => void onDelete(list)}
                          >
                            Excluir
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <PriceImportWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        initialPriceListId={wizardListId}
        createdBy={user?.id ?? null}
        allowed={allowed}
        onApplied={() => void reloadOverviewQuiet()}
      />
    </div>
  )

  return (
    <AdaptiveWorkspace
      moduleKey="prices"
      primary={primary}
      contextualOpen={contextualOpen}
      onContextualOpenChange={(open) => {
        if (!open) closeContextual()
      }}
      contextualTitle={
        formMode !== 'closed'
          ? formMode === 'create'
            ? 'Nova lista'
            : (editing?.name ?? 'Configurar lista')
          : (focusedList?.name ?? 'Lista de preços')
      }
      contextual={
        contextualOpen ? (
          formMode !== 'closed' ? (
            formGuide
          ) : splitTabs.activeId ? (
            <PriceListWorkSurface
              lists={overview.lists}
              listId={activeGuideListId}
              allowed={allowed}
              changedBy={user?.id ?? null}
              onItemsChanged={() => void reloadOverviewQuiet()}
              onListIdChange={(id) => splitTabs.selectTab(id)}
              forceWithoutPrice={forceWithoutPrice}
              onRequestImport={() => openWizard(activeGuideListId || undefined)}
              onClose={closeContextual}
            />
          ) : null
        ) : null
      }
    />
  )
}
