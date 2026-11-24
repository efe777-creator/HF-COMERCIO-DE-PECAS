import { useId, useState, type ReactNode } from 'react'

export type PdpAccordionItem = {
  id: string
  title: string
  children: ReactNode
  defaultOpen?: boolean
  icon?: string
}

/** Acordeões técnicos da PDP (tokens HF). */
export function PdpAccordion({ items }: { items: PdpAccordionItem[] }) {
  return (
    <div id="pdp-detalhes" className="mt-3 space-y-1.5">
      {items.map((item) => (
        <PdpAccordionSection key={item.id} item={item} />
      ))}
    </div>
  )
}

function PdpAccordionSection({ item }: { item: PdpAccordionItem }) {
  const panelId = useId()
  const [open, setOpen] = useState(Boolean(item.defaultOpen))

  return (
    <div className="overflow-hidden rounded-hf border border-hf-line bg-hf-surface">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm font-bold text-hf-ink hover:bg-hf-surface-2"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="inline-flex min-w-0 items-center gap-2">
          {item.icon ? (
            <span
              className="grid h-7 w-7 shrink-0 place-items-center rounded-hf bg-hf-bg text-xs"
              aria-hidden="true"
            >
              {item.icon}
            </span>
          ) : null}
          <span className="truncate">{item.title}</span>
        </span>
        <span className="shrink-0 text-xs font-bold text-hf-muted" aria-hidden="true">
          {open ? '▴' : '▾'}
        </span>
      </button>
      {open ? (
        <div id={panelId} className="border-t border-hf-line px-3 py-2.5 text-sm text-hf-ink">
          {item.children}
        </div>
      ) : null}
    </div>
  )
}
