import type { ReactNode } from 'react'

/** Shell mínimo de página (Bloco B) — padding e largura consistentes. */
export function PageShell({
  title,
  description,
  actions,
  children,
}: {
  title?: string
  description?: string
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 px-0 sm:space-y-5">
      {title || description || actions ? (
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            {title ? (
              <h1 className="m-0 text-xl font-extrabold text-hf-ink sm:text-2xl">{title}</h1>
            ) : null}
            {description ? (
              <p className="mt-1 text-sm text-hf-muted">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
        </header>
      ) : null}
      <div className="min-w-0">{children}</div>
    </div>
  )
}
