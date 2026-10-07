import type { ReactNode } from 'react'

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded-md bg-hf-red px-2 py-1 text-[11px] font-extrabold text-hf-ink">
      {children}
    </span>
  )
}
