import type { ReactNode } from 'react'

export function Container({
  children,
  className = '',
  maxWidth = 'default',
}: {
  children: ReactNode
  className?: string
  maxWidth?: 'default' | 'pdp'
}) {
  const width = maxWidth === 'pdp' ? 'max-w-[1440px]' : 'max-w-[1240px]'
  return (
    <div className={['mx-auto w-full px-[14px] sm:px-[22px]', width, className].join(' ')}>
      {children}
    </div>
  )
}
