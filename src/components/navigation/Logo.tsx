import { Link } from 'react-router-dom'
import { businessConfig } from '@/config/business'
import logoHf from '@/assets/logos/logo-hf.png'

export function Logo({ className = '' }: { className?: string }) {
  return (
    <Link
      to="/"
      className={[
        'flex h-12 shrink-0 items-center justify-start sm:h-14 lg:h-[72px]',
        className,
      ].join(' ')}
      aria-label={`${businessConfig.companyName} — Início`}
    >
      <img
        src={logoHf}
        alt={businessConfig.companyName}
        className="h-full w-auto max-w-[120px] object-contain object-left sm:max-w-[140px]"
      />
    </Link>
  )
}
