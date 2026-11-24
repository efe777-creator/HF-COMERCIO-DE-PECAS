import type { ReactNode } from 'react'

export type GuideStackItem = {
  id: string
  label: string
  statusLabel?: string
}

/** Guias empilhadas: todas visíveis; scroll no painel lateral. */
export function GuideStackPanels({
  ids,
  meta,
  onCloseTab,
  render,
}: {
  ids: string[]
  meta?: GuideStackItem[]
  onCloseTab: (id: string) => void
  render: (id: string) => ReactNode
}) {
  const byId = new Map((meta ?? []).map((m) => [m.id, m]))
  if (ids.length === 0) return null

  return (
    <div className="flex flex-col gap-3" aria-label={`Guias abertas (${ids.length})`}>
      <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-hf-muted">
        Guias abertas ({ids.length})
      </p>
      {ids.map((id, index) => {
        const info = byId.get(id)
        const label = info?.label ?? `#${id.slice(0, 8)}`
        return (
          <section
            key={id}
            className="overflow-hidden rounded-[12px] border border-hf-line bg-hf-bg/40"
            aria-label={`Guia ${index + 1}: ${label}`}
          >
            <header className="flex items-center gap-2 border-b border-hf-line bg-hf-surface px-2.5 py-1.5">
              <div className="min-w-0 flex-1">
                <p className="m-0 truncate text-xs font-extrabold text-hf-ink">{label}</p>
                {info?.statusLabel ? (
                  <p className="mb-0 mt-0.5 truncate text-[10px] text-hf-muted">{info.statusLabel}</p>
                ) : null}
              </div>
              <button
                type="button"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] text-base font-bold text-hf-muted hover:bg-red-50 hover:text-hf-danger"
                aria-label={`Fechar guia ${label}`}
                title="Fechar esta guia"
                onClick={() => onCloseTab(id)}
              >
                ×
              </button>
            </header>
            <div className="p-2">{render(id)}</div>
          </section>
        )
      })}
    </div>
  )
}
