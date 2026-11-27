import { GuideStackPanels } from '@/components/admin/workspace/GuideStackPanels'
import { AdaptiveWorkspace } from '@/components/admin/workspace/AdaptiveWorkspace'
import { Button } from '@/components/common/Button'
import { Loading } from '@/components/common/Loading'
import { useIdSplitTabs } from '@/hooks/useIdSplitTabs'
import {
  adminListLeadItems,
  adminListLeads,
  adminUpdateLeadStatus,
  type LeadRow,
  type LeadStatus,
} from '@/services/leads/leadService'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

const STATUS_OPTIONS: LeadStatus[] = ['new', 'in_progress', 'won', 'lost', 'spam']

function statusLabel(s: LeadStatus): string {
  const map: Record<LeadStatus, string> = {
    new: 'Novo',
    in_progress: 'Em atendimento',
    won: 'Ganho',
    lost: 'Perdido',
    spam: 'Spam',
  }
  return map[s] ?? s
}

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

type LeadItemRow = {
  id: string
  sku_snapshot: string | null
  name_snapshot: string | null
  quantity: number
  notes: string | null
}

function QuoteGuide({
  lead,
  onPatched,
}: {
  lead: LeadRow
  onPatched: (row: LeadRow) => void
}) {
  const [items, setItems] = useState<LeadItemRow[]>([])
  const [loadingItems, setLoadingItems] = useState(true)
  const [notes, setNotes] = useState(lead.staff_notes ?? '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    setNotes(lead.staff_notes ?? '')
  }, [lead.id, lead.staff_notes])

  useEffect(() => {
    let alive = true
    setLoadingItems(true)
    void adminListLeadItems(lead.id)
      .then((rows) => {
        if (!alive) return
        setItems(
          rows.map((r) => ({
            id: String((r as { id: string }).id),
            sku_snapshot: (r as { sku_snapshot?: string | null }).sku_snapshot ?? null,
            name_snapshot: (r as { name_snapshot?: string | null }).name_snapshot ?? null,
            quantity: Number((r as { quantity?: number }).quantity) || 1,
            notes: (r as { notes?: string | null }).notes ?? null,
          })),
        )
      })
      .catch((e) => {
        if (alive) setErr(e instanceof Error ? e.message : 'Erro ao carregar itens')
      })
      .finally(() => {
        if (alive) setLoadingItems(false)
      })
    return () => {
      alive = false
    }
  }, [lead.id])

  async function saveStatus(status: LeadStatus) {
    setBusy(true)
    setErr(null)
    try {
      await adminUpdateLeadStatus(lead.id, status, notes)
      onPatched({ ...lead, status, staff_notes: notes })
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falha ao salvar')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4 p-1" data-admin-cotacao-guide>
      <div>
        <p className="m-0 text-xs font-bold uppercase tracking-wide text-hf-muted">
          Protocolo {lead.id.slice(0, 8)}
        </p>
        <h2 className="mt-1 mb-0 text-lg font-extrabold text-hf-ink">
          {lead.company_name || lead.contact_name}
        </h2>
        <p className="mt-1 mb-0 text-xs text-hf-muted">{formatWhen(lead.created_at)}</p>
      </div>

      <div className="rounded-[10px] border border-hf-line bg-hf-bg px-3 py-2 text-sm">
        <p className="m-0">
          <strong>{lead.contact_name}</strong>
        </p>
        <p className="mb-0 mt-1 text-xs text-hf-muted">
          {[lead.contact_email, lead.contact_phone].filter(Boolean).join(' · ') || '—'}
        </p>
        {lead.source ? (
          <p className="mb-0 mt-1 text-[11px] text-hf-muted">Origem: {lead.source}</p>
        ) : null}
      </div>

      {lead.message ? (
        <p className="m-0 whitespace-pre-wrap rounded-[10px] border border-hf-line bg-hf-surface px-3 py-2 text-sm">
          {lead.message}
        </p>
      ) : null}

      <div>
        <h3 className="mt-0 mb-2 text-sm font-extrabold">Itens</h3>
        {loadingItems ? (
          <Loading />
        ) : items.length === 0 ? (
          <p className="m-0 text-sm text-hf-muted">Sem itens vinculados.</p>
        ) : (
          <ul className="m-0 list-none space-y-2 p-0">
            {items.map((it) => (
              <li
                key={it.id}
                className="rounded-[10px] border border-hf-line bg-hf-surface px-3 py-2 text-sm"
              >
                <p className="m-0 font-extrabold text-hf-ink">
                  {it.name_snapshot || it.sku_snapshot || 'Item'}
                </p>
                <p className="mb-0 mt-0.5 text-xs text-hf-muted">
                  {it.sku_snapshot || '—'} · qtd {it.quantity}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <label className="block text-sm font-semibold">
        Status
        <select
          className="mt-1 w-full rounded-[10px] border border-hf-line bg-hf-surface px-3 py-2"
          value={lead.status}
          disabled={busy}
          onChange={(e) => void saveStatus(e.target.value as LeadStatus)}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {statusLabel(s)}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm font-semibold">
        Notas internas
        <textarea
          className="mt-1 w-full rounded-[10px] border border-hf-line bg-hf-surface px-3 py-2 text-sm"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>
      <Button
        type="button"
        variant="outline"
        disabled={busy}
        onClick={() => void saveStatus(lead.status)}
      >
        Salvar notas
      </Button>
      {err ? <p className="m-0 text-sm text-hf-red">{err}</p> : null}
    </div>
  )
}

/** Fila de cotações Adaptive dentro da Central de Pedidos. */
export function AdminPedidosCotacoesPage() {
  const [params] = useSearchParams()
  const deepLead = params.get('lead')
  const [rows, setRows] = useState<LeadRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [onlyNew, setOnlyNew] = useState(false)
  const splitTabs = useIdSplitTabs()
  const [deepOpened, setDeepOpened] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await adminListLeads('quote'))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao listar cotações')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    if (deepOpened || !deepLead || loading) return
    if (!rows.some((r) => r.id === deepLead)) return
    splitTabs.openTab(deepLead)
    setDeepOpened(true)
  }, [deepLead, deepOpened, loading, rows, splitTabs])

  const visible = useMemo(
    () => (onlyNew ? rows.filter((r) => r.status === 'new') : rows),
    [onlyNew, rows],
  )

  function patch(row: LeadRow) {
    setRows((prev) => prev.map((r) => (r.id === row.id ? row : r)))
  }

  const contextualOpen = splitTabs.hasOpen
  const contextualTitle = useMemo(() => {
    const id = splitTabs.activeId
    if (!id) return 'Cotação'
    const r = rows.find((x) => x.id === id)
    return r?.company_name || r?.contact_name || 'Cotação'
  }, [rows, splitTabs.activeId])

  const primary = (
    <div className="space-y-3 sm:space-y-4" data-admin-pedidos-cotacoes>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="m-0 text-xl font-extrabold text-hf-ink sm:text-2xl">Cotações</h1>
          <p className="mt-1 mb-0 max-w-2xl text-xs text-hf-muted sm:text-sm">
            Fila da cesta do site. Duplo clique ou Abrir guia para ver itens.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => void reload()}>
            Atualizar
          </Button>
          <label className="inline-flex items-center gap-2 rounded-[10px] border border-hf-line bg-hf-surface px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={onlyNew}
              onChange={(e) => setOnlyNew(e.target.checked)}
            />
            Só novas
          </label>
        </div>
      </div>

      {error ? (
        <p className="m-0 rounded-[10px] border border-hf-red/40 bg-[#2a1010] px-3 py-2 text-sm">
          {error}
        </p>
      ) : null}

      {loading ? (
        <Loading />
      ) : visible.length === 0 ? (
        <p className="m-0 rounded-[12px] border border-dashed border-hf-line bg-hf-surface p-6 text-sm text-hf-muted">
          Nenhuma cotação neste filtro.
        </p>
      ) : (
        <ul className="m-0 list-none space-y-2 p-0">
          {visible.map((r) => {
            const open = splitTabs.openIds.includes(r.id)
            return (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => splitTabs.openTab(r.id)}
                  onDoubleClick={() => splitTabs.openTab(r.id)}
                  className={[
                    'flex w-full flex-col gap-1 rounded-[12px] border px-3 py-3 text-left transition sm:flex-row sm:items-center sm:justify-between',
                    r.status === 'new'
                      ? 'border-hf-red/50 bg-hf-surface-2 hover:border-hf-red'
                      : 'border-hf-line bg-hf-surface hover:border-hf-red/50',
                    open ? 'ring-1 ring-hf-red' : '',
                  ].join(' ')}
                >
                  <div className="min-w-0">
                    <p className="m-0 truncate text-sm font-extrabold text-hf-ink">
                      {r.company_name || r.contact_name}
                    </p>
                    <p className="m-0 truncate text-xs text-hf-muted">
                      {r.id.slice(0, 8)} · {statusLabel(r.status)} · {formatWhen(r.created_at)}
                      {r.contact_phone ? ` · ${r.contact_phone}` : ''}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-bold text-hf-muted">
                    {open ? 'Na guia' : 'Abrir guia'}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )

  const contextual = contextualOpen ? (
    <GuideStackPanels
      ids={splitTabs.openIds}
      meta={splitTabs.openIds.map((id) => {
        const r = rows.find((x) => x.id === id)
        return {
          id,
          label: r?.company_name || r?.contact_name || id.slice(0, 8),
          statusLabel: r ? statusLabel(r.status) : undefined,
        }
      })}
      onCloseTab={splitTabs.closeTab}
      render={(id) => {
        const r = rows.find((x) => x.id === id)
        if (!r) return <p className="text-sm text-hf-muted">Cotação não encontrada.</p>
        return <QuoteGuide lead={r} onPatched={patch} />
      }}
    />
  ) : null

  return (
    <AdaptiveWorkspace
      moduleKey="pedidos"
      primary={primary}
      contextual={contextual}
      contextualOpen={contextualOpen}
      onContextualOpenChange={(open) => {
        if (!open) splitTabs.closeAll()
      }}
      contextualTitle={contextualTitle}
    />
  )
}
