import { Button } from '@/components/common/Button'
import { Loading } from '@/components/common/Loading'
import { communicationCtaLabel, isAccessNotificationKind } from '@/lib/communicationCopy'
import {
  listCustomerNotifications,
  markAllCustomerNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from '@/services/communication/communicationService'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export function AccountAvisosPage() {
  const [items, setItems] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setItems(await listCustomerNotifications())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar avisos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  async function markOne(id: string) {
    setBusyId(id)
    try {
      await markNotificationRead(id)
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao marcar lido')
    } finally {
      setBusyId(null)
    }
  }

  async function markAll() {
    setBusyId('all')
    try {
      await markAllCustomerNotificationsRead()
      const now = new Date().toISOString()
      setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? now })))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao marcar todos')
    } finally {
      setBusyId(null)
    }
  }

  const unread = items.filter((n) => !n.readAt).length

  return (
    <div className="rounded-hf border border-hf-line bg-hf-surface p-5" data-conta-avisos>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="mt-0 mb-1 text-xl font-extrabold">Avisos</h2>
          <p className="m-0 text-sm text-hf-muted">
            Comunicação in-app da HF sobre o acesso da sua empresa.
            {unread > 0 ? ` · ${unread} não lido(s)` : ''}
          </p>
        </div>
        {unread > 0 ? (
          <Button
            type="button"
            variant="outline"
            disabled={busyId === 'all'}
            onClick={() => void markAll()}
          >
            Marcar todos lidos
          </Button>
        ) : null}
      </div>

      {error ? (
        <p className="mt-3 mb-0 rounded-[10px] border border-hf-red/40 bg-[#2a1010] p-3 text-sm">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="mt-4">
          <Loading />
        </div>
      ) : items.length === 0 ? (
        <p className="mt-4 mb-0 rounded-[12px] border border-dashed border-hf-line bg-hf-bg p-4 text-sm text-hf-muted">
          Nenhum aviso por enquanto.
        </p>
      ) : (
        <ul className="mt-4 mb-0 list-none space-y-2 p-0">
          {items.map((n) => {
            const cta = isAccessNotificationKind(n.kind)
              ? communicationCtaLabel(n.kind)
              : 'Ver conta'
            return (
              <li
                key={n.id}
                className={[
                  'rounded-[12px] border p-4',
                  n.readAt ? 'border-hf-line bg-hf-bg' : 'border-hf-red/40 bg-hf-surface-2',
                ].join(' ')}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="m-0 text-base font-extrabold text-hf-ink">{n.title}</h3>
                    <p className="mb-0 mt-1 text-sm text-hf-muted">{n.body}</p>
                    <p className="mb-0 mt-2 text-xs text-hf-muted">{formatWhen(n.createdAt)}</p>
                  </div>
                  {!n.readAt ? (
                    <span className="rounded-full bg-hf-red px-2 py-0.5 text-[10px] font-bold text-white">
                      Novo
                    </span>
                  ) : null}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    to={n.href || '/conta'}
                    className="inline-flex rounded-[10px] bg-hf-red px-3 py-2 text-sm font-extrabold text-white"
                    onClick={() => {
                      if (!n.readAt) void markOne(n.id)
                    }}
                  >
                    {cta}
                  </Link>
                  {!n.readAt ? (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={busyId === n.id}
                      onClick={() => void markOne(n.id)}
                    >
                      Marcar lido
                    </Button>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
