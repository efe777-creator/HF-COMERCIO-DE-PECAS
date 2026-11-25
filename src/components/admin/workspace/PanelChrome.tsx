import type { ReactNode } from 'react'

export type PanelChromeProps = {
  title: string
  onClose: () => void
  extraActions?: ReactNode
  statusBadge?: ReactNode
}

/** Chrome da guia Adaptive: título + Fechar todas. */
export function PanelChrome({ title, onClose, extraActions, statusBadge }: PanelChromeProps) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-1.5 border-b border-hf-line pb-2">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="m-0 truncate text-sm font-extrabold text-hf-ink lg:text-base">{title}</h2>
          {statusBadge}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        {extraActions}
        <button
          type="button"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-[10px] border border-hf-line bg-hf-surface text-sm font-bold text-hf-ink hover:bg-hf-bg"
          aria-label="Fechar painel"
          title="Fechar todas as guias"
          onClick={onClose}
        >
          ×
        </button>
      </div>
    </header>
  )
}
