import type { ReactNode } from 'react'

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded-md bg-fal-yellow px-2 py-1 text-[11px] font-extrabold text-fal-navy-dark">
      {children}
    </span>
  )
}
