import { PaymentConditionWorkSurface } from '@/components/admin/financeiro/PaymentConditionWorkSurface'
import { GuideStackPanels } from '@/components/admin/workspace/GuideStackPanels'
import { AdaptiveWorkspace } from '@/components/admin/workspace/AdaptiveWorkspace'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { useIdSplitTabs } from '@/hooks/useIdSplitTabs'
import { describePaymentSchedule } from '@/lib/paymentSchedule'
import {
  adminListPaymentConditions,
  adminReleasePaymentCondition,
  type AdminPaymentCondition,
} from '@/services/admin/adminPaymentConditionService'
import { useCallback, useEffect, useMemo, useState } from 'react'

export function AdminPaymentConditionsPage() {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [items, setItems] = useState<AdminPaymentCondition[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [releasingId, setReleasingId] = useState<string | null>(null)
  const [quickCreateOpen, setQuickCreateOpen] = useState(false)
  const splitTabs = useIdSplitTabs()

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setItems(
        await adminListPaymentConditions({
          q: q.trim() || undefined,
          status: status || undefined,
        }),
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao listar condições')
    } finally {
      setLoading(false)
    }
  }, [q, status])

  useEffect(() => {
    void reload()
  }, [reload])

  function patch(c: AdminPaymentCondition) {
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

  async function liberar(id: string) {
    if (!window.confirm('Liberar condição para clientes B2B?\n\nStatus → published.')) return
    setReleasingId(id)
    setError(null)
    try {
      const pub = await adminReleasePaymentCondition(id)
      patch(pub)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao liberar')
    } finally {
      setReleasingId(null)
    }
  }

  const contextualOpen = quickCreateOpen || splitTabs.hasOpen

  const contextualTitle = useMemo(() => {
    if (quickCreateOpen) return 'Nova condição'
    const id = splitTabs.activeId
    if (!id) return 'Condição'
    return items.find((x) => x.id === id)?.name ?? 'Condição'
  }, [items, splitTabs.activeId, quickCreateOpen])

  const primary = (
    <div className="space-y-3 sm:space-y-4" data-admin-financeiro-condicoes>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="m-0 text-xl font-extrabold text-hf-ink sm:text-2xl">
            Condições de pagamento
          </h1>
          <p className="mt-1 mb-0 max-w-2xl text-xs text-hf-muted sm:text-sm">
            Lista + guia (duplo clique). Agenda, meios e liberação para clientes B2B.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
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
        <div className="min-w-0 flex-1 sm:min-w-[180px]">
          <Input
            label="Buscar"
            placeholder="Código ou nome"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <label className="block min-w-0 text-sm sm:min-w-[140px]">
          <span className="mb-1 block text-xs font-extrabold text-hf-muted">Status</span>
          <select
            className="w-full rounded-[9px] border border-hf-line bg-hf-surface px-3 py-3 text-hf-ink"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Todos</option>
            <option value="draft">Rascunho</option>
            <option value="published">Publicado</option>
          </select>
        </label>
        <Button type="submit" variant="light" size="sm">
          Filtrar
        </Button>
      </form>

      {error ? <p className="text-sm text-hf-danger">{error}</p> : null}
      {loading ? <Loading label="Carregando condições…" /> : null}

      {!loading ? (
        <div className="overflow-x-auto rounded-[14px] border border-hf-line bg-hf-surface">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-hf-bg text-hf-muted">
              <tr>
                <th className="px-2 py-2 sm:px-3">Código</th>
                <th className="px-2 py-2 sm:px-3">Nome</th>
                <th className="hidden px-3 py-2 md:table-cell">Agenda</th>
                <th className="hidden px-3 py-2 md:table-cell">Status</th>
                <th className="px-2 py-2 sm:px-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-hf-muted">
                    Nenhuma condição.{' '}
                    <button
                      type="button"
                      className="font-semibold text-hf-auth-link underline"
                      onClick={openQuickCreate}
                    >
                      Novo na guia
                    </button>
                  </td>
                </tr>
              ) : (
                items.map((c) => (
                  <tr
                    key={c.id}
                    className="border-t border-hf-line hover:bg-hf-bg/40"
                    onDoubleClick={() => openGuide(c.id)}
                  >
                    <td className="px-2 py-2 font-mono text-xs sm:px-3">{c.code}</td>
                    <td className="px-2 py-2 font-semibold sm:px-3">
                      {c.name}
                      <span className="mt-0.5 block text-[11px] font-normal text-hf-muted md:hidden">
                        {c.status === 'published' ? 'Publicada' : 'Rascunho'}
                      </span>
                    </td>
                    <td className="hidden px-3 py-2 text-hf-muted md:table-cell">
                      {describePaymentSchedule({
                        scheduleMode: c.scheduleMode,
                        installmentCount: c.installmentCount,
                        equalIntervalDays: c.equalIntervalDays,
                        firstDueDays: c.firstDueDays,
                        weekday: c.weekday,
                        weekdayIntervalWeeks: c.weekdayIntervalWeeks,
                        businessDayRule: c.businessDayRule,
                        amountSplit: c.amountSplit,
                        installments: c.installments.map((i) => ({
                          seq: i.seq,
                          offsetDays: i.offsetDays,
                          percent: i.percent,
                          label: i.label,
                        })),
                      })}
                    </td>
                    <td className="hidden px-3 py-2 md:table-cell">
                      {c.status === 'published' ? 'Publicada' : 'Rascunho'}
                    </td>
                    <td className="px-2 py-2 sm:px-3">
                      <div className="flex flex-col gap-1 text-xs sm:flex-row sm:flex-wrap sm:gap-2">
                        <button
                          type="button"
                          className="text-left font-semibold text-hf-ink underline"
                          onClick={() => openGuide(c.id)}
                        >
                          {guideLabel(c.id)}
                        </button>
                        {c.status !== 'published' ? (
                          <button
                            type="button"
                            className="text-left font-semibold text-hf-ink disabled:opacity-50"
                            disabled={releasingId === c.id}
                            onClick={() => void liberar(c.id)}
                          >
                            Liberar
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )

  const contextual = contextualOpen ? (
    quickCreateOpen ? (
      <PaymentConditionWorkSurface
        quickCreate
        onClose={() => setQuickCreateOpen(false)}
        onCreated={(c) => {
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
            label: c?.name ?? id.slice(0, 8),
            statusLabel: c?.status === 'published' ? 'Publicada' : 'Rascunho',
          }
        })}
        onCloseTab={splitTabs.closeTab}
        render={(id) => {
          const fromList = items.find((p) => p.id === id)
          const focused =
            fromList ??
            ({
              id,
              code: '',
              name: '',
              description: null,
              footnote: null,
              scheduleMode: 'single',
              anchorKind: 'document_date',
              installmentCount: 1,
              equalIntervalDays: null,
              firstDueDays: 0,
              weekday: null,
              weekdayIntervalWeeks: null,
              amountSplit: 'equal',
              businessDayRule: 'none',
              status: 'draft',
              minSubtotal: null,
              showToGuests: false,
              showToCustomers: true,
              sortOrder: 0,
              createdAt: '',
              updatedAt: '',
              installments: [],
              methods: [],
            } satisfies AdminPaymentCondition)
          return (
            <PaymentConditionWorkSurface
              focused={focused}
              busy={releasingId === id}
              onClose={() => splitTabs.closeTab(id)}
              onUpdated={patch}
              onCreated={patch}
            />
          )
        }}
      />
    )
  ) : null

  return (
    <AdaptiveWorkspace
      moduleKey="financeiro"
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
