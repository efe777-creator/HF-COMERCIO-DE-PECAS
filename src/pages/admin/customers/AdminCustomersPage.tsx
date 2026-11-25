import { CustomerWorkSurface } from '@/components/admin/customers/CustomerWorkSurface'
import { GuideStackPanels } from '@/components/admin/workspace/GuideStackPanels'
import { AdaptiveWorkspace } from '@/components/admin/workspace/AdaptiveWorkspace'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { useIdSplitTabs } from '@/hooks/useIdSplitTabs'
import { BR_UF_OPTIONS } from '@/lib/brMacroRegion'
import { formatCnpj } from '@/lib/cnpj'
import {
  adminListB2bCustomers,
  adminListCustomerGroups,
  adminSetCustomerStatus,
  type AdminB2bCustomer,
  type AdminCustomerGroup,
} from '@/services/admin/adminB2bCustomerService'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

export function AdminCustomersPage() {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [uf, setUf] = useState('')
  const [items, setItems] = useState<AdminB2bCustomer[]>([])
  const [groups, setGroups] = useState<AdminCustomerGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusBusyId, setStatusBusyId] = useState<string | null>(null)
  const [quickCreateOpen, setQuickCreateOpen] = useState(false)
  const splitTabs = useIdSplitTabs()

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [customers, g] = await Promise.all([
        adminListB2bCustomers({
          q: q.trim() || undefined,
          status: status || undefined,
          state: uf || undefined,
        }),
        adminListCustomerGroups(),
      ])
      setItems(customers)
      setGroups(g)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao listar clientes')
    } finally {
      setLoading(false)
    }
  }, [q, status, uf])

  useEffect(() => {
    void reload()
  }, [reload])

  function patch(c: AdminB2bCustomer) {
    setItems((prev) => {
      const i = prev.findIndex((p) => p.id === c.id)
      if (i < 0) return [c, ...prev]
      const next = prev.slice()
      next[i] = c
      return next
    })
  }

  function openGuide(id: string) {
    setQuickCreateOpen(false)
    splitTabs.openTab(id)
  }

  function openQuickCreate() {
    splitTabs.closeAll()
    setQuickCreateOpen(true)
  }

  function closeContextual() {
    setQuickCreateOpen(false)
    splitTabs.closeAll()
  }

  function guideLabel(id: string) {
    if (splitTabs.openIds.includes(id)) {
      if (splitTabs.openIds.length > 1 && splitTabs.activeId !== id) return '+ Guia'
      return 'Na guia'
    }
    return 'Abrir guia'
  }

  async function setStatusAction(id: string, next: 'active' | 'suspended') {
    setStatusBusyId(id)
    setError(null)
    try {
      await adminSetCustomerStatus(id, next)
      setItems((prev) => prev.map((c) => (c.id === id ? { ...c, status: next } : c)))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao alterar status')
    } finally {
      setStatusBusyId(null)
    }
  }

  const contextualOpen = quickCreateOpen || splitTabs.hasOpen

  const contextualTitle = useMemo(() => {
    if (quickCreateOpen) return 'Novo cliente'
    const id = splitTabs.activeId
    if (!id) return 'Cliente'
    const c = items.find((x) => x.id === id)
    return c?.tradeName || c?.legalName || 'Cliente'
  }, [items, splitTabs.activeId, quickCreateOpen])

  const primary = (
    <div className="space-y-3 sm:space-y-4" data-admin-clientes-hub>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="m-0 text-xl font-extrabold text-hf-ink sm:text-2xl">Clientes B2B</h1>
          <p className="mt-1 mb-0 max-w-2xl text-xs text-hf-muted sm:text-sm">
            Lista + guia (duplo clique). CNPJ BrasilAPI · endereço ViaCEP · UF/região.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/clientes/listas">
            <Button type="button" variant="light" size="sm">
              Listas B2B
            </Button>
          </Link>
          <Button type="button" size="sm" onClick={openQuickCreate}>
            Novo na guia
          </Button>
        </div>
      </div>

      <form
        className="flex flex-col gap-2 rounded-[14px] border border-hf-line bg-hf-surface p-2.5 sm:flex-row sm:flex-wrap sm:items-end sm:p-3"
        onSubmit={(e) => {
          e.preventDefault()
          void reload()
        }}
      >
        <div className="min-w-0 flex-1 sm:min-w-[160px]">
          <Input
            label="Buscar"
            placeholder="Razão, CNPJ, cidade…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <label className="block min-w-0 text-sm sm:min-w-[120px]">
          <span className="mb-1 block text-xs font-extrabold text-hf-muted">Status</span>
          <select
            className="w-full rounded-[9px] border border-hf-line bg-hf-surface px-3 py-3 text-hf-ink"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Todos</option>
            <option value="pending">pending</option>
            <option value="active">active</option>
            <option value="suspended">suspended</option>
            <option value="inactive">inactive</option>
          </select>
        </label>
        <label className="block min-w-0 text-sm sm:min-w-[90px]">
          <span className="mb-1 block text-xs font-extrabold text-hf-muted">UF</span>
          <select
            className="w-full rounded-[9px] border border-hf-line bg-hf-surface px-3 py-3 text-hf-ink"
            value={uf}
            onChange={(e) => setUf(e.target.value)}
          >
            <option value="">Todas</option>
            {BR_UF_OPTIONS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" variant="light" size="sm">
          Filtrar
        </Button>
      </form>

      {error ? <p className="text-sm text-hf-danger">{error}</p> : null}
      {loading ? <Loading /> : null}

      <div className="overflow-x-auto rounded-[14px] border border-hf-line bg-hf-surface">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-hf-bg text-hf-muted">
            <tr>
              <th className="px-3 py-2">Cliente</th>
              <th className="px-3 py-2">CNPJ</th>
              <th className="hidden px-3 py-2 sm:table-cell">Cidade / UF</th>
              <th className="hidden px-3 py-2 md:table-cell">Região</th>
              <th className="px-3 py-2">Grupo</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => {
              const label = c.tradeName || c.legalName
              const cityUf = [c.address?.city, c.address?.state].filter(Boolean).join(' / ')
              return (
                <tr
                  key={c.id}
                  className="border-t border-hf-line hover:bg-hf-bg/40"
                  onDoubleClick={() => openGuide(c.id)}
                >
                  <td className="px-3 py-2">
                    <div className="font-semibold text-hf-ink">{label}</div>
                    {c.tradeName && c.tradeName !== c.legalName ? (
                      <div className="text-xs text-hf-muted">{c.legalName}</div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {c.cnpj ? formatCnpj(c.cnpj) : '—'}
                  </td>
                  <td className="hidden px-3 py-2 text-xs sm:table-cell">{cityUf || '—'}</td>
                  <td className="hidden px-3 py-2 md:table-cell">
                    {c.address?.macroRegion ? (
                      <span className="rounded-full bg-hf-bg px-2 py-0.5 text-[10px] font-bold">
                        {c.address.macroRegion}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs">{c.groupName ?? '—'}</td>
                  <td className="px-3 py-2 text-xs">{c.status}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      <Button
                        type="button"
                        variant="light"
                        size="sm"
                        onClick={() => openGuide(c.id)}
                      >
                        {guideLabel(c.id)}
                      </Button>
                      {c.status !== 'active' ? (
                        <Button
                          type="button"
                          size="sm"
                          disabled={statusBusyId === c.id}
                          onClick={() => void setStatusAction(c.id, 'active')}
                        >
                          Ativar
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="light"
                          size="sm"
                          disabled={statusBusyId === c.id}
                          onClick={() => void setStatusAction(c.id, 'suspended')}
                        >
                          Suspender
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
            {!loading && items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-sm text-hf-muted">
                  Nenhum cliente encontrado.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )

  const contextual = contextualOpen ? (
    quickCreateOpen ? (
      <CustomerWorkSurface
        customerId={null}
        groups={groups}
        onClose={() => setQuickCreateOpen(false)}
        onSaved={(c) => {
          patch(c)
          setQuickCreateOpen(false)
          splitTabs.openTab(c.id)
          void reload()
        }}
      />
    ) : (
      <GuideStackPanels
        ids={splitTabs.openIds}
        meta={splitTabs.openIds.map((id) => {
          const c = items.find((x) => x.id === id)
          return {
            id,
            label: c?.tradeName || c?.legalName || id.slice(0, 8),
            statusLabel: c?.status,
          }
        })}
        onCloseTab={splitTabs.closeTab}
        render={(id) => (
          <CustomerWorkSurface
            customerId={id}
            groups={groups}
            onClose={() => splitTabs.closeTab(id)}
            onSaved={(c) => {
              patch(c)
              void reload()
            }}
          />
        )}
      />
    )
  ) : null

  return (
    <AdaptiveWorkspace
      moduleKey="customers"
      primary={primary}
      contextual={contextual}
      contextualOpen={contextualOpen}
      onContextualOpenChange={(open) => {
        if (!open) closeContextual()
      }}
      contextualTitle={contextualTitle}
    />
  )
}
