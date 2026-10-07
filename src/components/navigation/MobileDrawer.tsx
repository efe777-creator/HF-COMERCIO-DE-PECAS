import type { ReactNode } from 'react'
import { useEffect } from 'react'

/**
 * Primário reutilizável para painéis laterais (ex.: filtros do catálogo no futuro).
 * A navegação mobile principal da Fase 1 é o MobileNav (bottom bar), fiel ao protótipo.
 */
export function MobileDrawer({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[260] lg:hidden" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 border-0 bg-black/40"
        aria-label="Fechar painel"
        onClick={onClose}
      />
      <aside className="absolute top-0 right-0 flex h-full w-[min(390px,92vw)] flex-col overflow-auto bg-hf-surface p-4 shadow-[-15px_0_40px_rgba(0,0,0,0.18)]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="m-0 text-lg font-extrabold">{title}</h2>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full border-0 bg-[#eef1f3] text-2xl"
            onClick={onClose}
            aria-label="Fechar"
          >
            ×
          </button>
        </div>
        {children}
      </aside>
    </div>
  )
}
