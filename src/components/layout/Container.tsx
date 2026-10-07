import type { ReactNode } from 'react'

export function Container({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={['mx-auto w-full max-w-[1240px] px-[14px] sm:px-[22px]', className].join(' ')}>
      {children}
    </div>
  )
}
