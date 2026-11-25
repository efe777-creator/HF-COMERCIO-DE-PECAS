import { GuideStackPanels } from '@/components/admin/workspace/GuideStackPanels'
import { AdaptiveWorkspace } from '@/components/admin/workspace/AdaptiveWorkspace'
import { Button } from '@/components/common/Button'
import { Loading } from '@/components/common/Loading'
import { useIdSplitTabs } from '@/hooks/useIdSplitTabs'
import { communicationCtaLabel, isAccessNotificationKind } from '@/lib/communicationCopy'
import {
  listStaffNotifications,
  markNotificationRead,
  type AppNotification,
} from '@/services/communication/communicationService'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

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

function NotificationGuide({
  item,
  onMarked,
}: {
  item: AppNotification
  onMarked: (n: AppNotification) => void
}) {
  const [busy, setBusy] = useState(false)

  async function markRead() {
    if (item.readAt) return
    setBusy(true)
    try {
      await markNotificationRead(item.id)
      onMarked({ ...item, readAt: new Date().toISOString() })
    } finally {
      setBusy(false)
    }
  }

  const cta =
    isAccessNotificationKind(item.kind) ? communicationCtaLabel(item.kind) : 'Abrir'

  return (
    <div className="space-y-4 p-1" data-admin-comunicacao-guide>
      <div>
        <p className="m-0 text-xs font-bold uppercase tracking-wide text-hf-muted">
          {item.kind}
          {!item.readAt ? (
            <span className="ml-2 rounded-full bg-hf-red px-2 py-0.5 text-[10px] text-white">
              Não lido
            </span>
          ) : null}
        </p>
        <h2 className="mt-1 mb-0 text-lg font-extrabold text-hf-ink">{item.title}</h2>
        <p className="mt-1 mb-0 text-xs text-hf-muted">{formatWhen(item.createdAt)}</p>
      </div>

      {item.customerLabel || item.customerId ? (
        <p className="m-0 rounded-[10px] border border-hf-line bg-hf-bg px-3 py-2 text-sm">
          <span className="text-hf-muted">Cliente · </span>
          <strong>{item.customerLabel || item.customerId?.slice(0, 8)}</strong>
        </p>
      ) : null}

      <p className="m-0 whitespace-pre-wrap text-sm text-hf-ink">{item.body}</p>

      <div className="flex flex-wrap gap-2">
        <Link
          to={item.href || '/admin/clientes'}
          className="inline-flex rounded-[10px] bg-hf-red px-4 py-2.5 text-sm font-extrabold text-white"
        >
          {cta}
        </Link>
        {!item.readAt ? (
          <Button type="button" variant="outline" disabled={busy} onClick={() => void markRead()}>
            Marcar lido
          </Button>
        ) : null}
      </div>
    </div>
  )
}

export function AdminComunicacaoPage() {
  const [items, setItems] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [onlyUnread, setOnlyUnread] = useState(false)
  const splitTabs = useIdSplitTabs()

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setItems(await listStaffNotifications())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao listar avisos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const visible = useMemo(
    () => (onlyUnread ? items.filter((n) => !n.readAt) : items),
    [items, onlyUnread],
  )

  const unreadCount = useMemo(() => items.filter((n) => !n.readAt).length, [items])

  function patch(n: AppNotification) {
    setItems((prev) => prev.map((x) => (x.id === n.id ? n : x)))
  }

  const contextualOpen = splitTabs.hasOpen
  const contextualTitle = useMemo(() => {
    const id = splitTabs.activeId
    if (!id) return 'Aviso'
    return items.find((x) => x.id === id)?.title || 'Aviso'
  }, [items, splitTabs.activeId])

  const primary = (
    <div className="space-y-3 sm:space-y-4" data-admin-comunicacao-hub>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="m-0 text-xl font-extrabold text-hf-ink sm:text-2xl">
            Central de Comunicação
          </h1>
          <p className="mt-1 mb-0 max-w-2xl text-xs text-hf-muted sm:text-sm">
            Avisos in-app de acesso B2B. WhatsApp Cloud fica para o próximo ciclo.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => void reload()}>
            Atualizar
          </Button>
          <label className="inline-flex items-center gap-2 rounded-[10px] border border-hf-line bg-hf-surface px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={onlyUnread}
              onChange={(e) => setOnlyUnread(e.target.checked)}
            />
            Só não lidos ({unreadCount})
          </label>
        </div>
      </div>

      {error ? (
        <p className="m-0 rounded-[10px] border border-hf-red/40 bg-[#2a1010] px-3 py-2 text-sm text-hf-ink">
          {error}
        </p>
      ) : null}

      {loading ? (
        <Loading />
      ) : visible.length === 0 ? (
        <p className="m-0 rounded-[12px] border border-dashed border-hf-line bg-hf-surface p-6 text-sm text-hf-muted">
          Nenhum aviso staff no momento. Novos clientes pending aparecem aqui.
        </p>
      ) : (
        <ul className="m-0 list-none space-y-2 p-0">
          {visible.map((n) => {
            const open = splitTabs.openIds.includes(n.id)
            return (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => splitTabs.openTab(n.id)}
                  onDoubleClick={() => splitTabs.openTab(n.id)}
                  className={[
                    'flex w-full flex-col gap-1 rounded-[12px] border px-3 py-3 text-left transition sm:flex-row sm:items-center sm:justify-between',
                    n.readAt
                      ? 'border-hf-line bg-hf-surface hover:border-hf-red/50'
                      : 'border-hf-red/50 bg-hf-surface-2 hover:border-hf-red',
                    open ? 'ring-1 ring-hf-red' : '',
                  ].join(' ')}
                >
                  <div className="min-w-0">
                    <p className="m-0 truncate text-sm font-extrabold text-hf-ink">{n.title}</p>
                    <p className="m-0 truncate text-xs text-hf-muted">
                      {n.kind}
                      {n.customerLabel ? ` · ${n.customerLabel}` : ''}
                      {' · '}
                      {formatWhen(n.createdAt)}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-bold text-hf-muted">
                    {open ? 'Na guia' : n.readAt ? 'Lido' : 'Abrir guia'}
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
        const n = items.find((x) => x.id === id)
        return {
          id,
          label: n?.title || id.slice(0, 8),
          statusLabel: n?.readAt ? 'lido' : 'novo',
        }
      })}
      onCloseTab={splitTabs.closeTab}
      render={(id) => {
        const n = items.find((x) => x.id === id)
        if (!n) {
          return <p className="text-sm text-hf-muted">Aviso não encontrado.</p>
        }
        return <NotificationGuide item={n} onMarked={patch} />
      }}
    />
  ) : null

  return (
    <AdaptiveWorkspace
      moduleKey="comunicacao"
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
