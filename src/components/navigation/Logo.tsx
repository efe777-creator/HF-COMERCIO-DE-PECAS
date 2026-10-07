import { Link } from 'react-router-dom'
import { businessConfig } from '@/config/business'

/**
 * Logo textual HF até o asset oficial ser incorporado.
 */
export function Logo({ className = '' }: { className?: string }) {
  return (
    <Link
      to="/"
      className={[
        'flex h-12 shrink-0 items-center justify-start sm:h-14 lg:h-[78px]',
        className,
      ].join(' ')}
      aria-label={`${businessConfig.companyName} — Início`}
    >
      <span className="text-lg font-black tracking-tight text-fal-navy sm:text-xl lg:text-2xl">
        HF
      </span>
    </Link>
  )
}
