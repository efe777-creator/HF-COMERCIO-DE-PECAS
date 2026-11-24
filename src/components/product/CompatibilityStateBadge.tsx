import {
  resolveCardSeal,
  type CompatibilityVerdict,
} from '@/services/compatibility/compatibilityEngine'

const STYLES: Record<CompatibilityVerdict['state'], string> = {
  confirmed: 'border-emerald-600/40 bg-emerald-600/10 text-emerald-700',
  probable: 'border-amber-500/50 bg-amber-500/15 text-hf-ink',
  unconfirmed: 'border-hf-line bg-hf-bg text-hf-muted',
}

const CARD_STYLES = {
  compatible: 'border-emerald-700 bg-emerald-600 text-white',
  similar: 'border-amber-600 bg-amber-400 text-hf-ink',
  check: 'border-hf-line bg-hf-surface text-hf-ink',
  hide: 'border-hf-red bg-hf-red text-white',
} as const

const CARD_STYLES_NEUTRAL_HIDE = 'border-hf-line bg-hf-bg text-hf-muted'

export function CompatibilityStateBadge({
  verdict,
  className = '',
  variant = 'pdp',
  tone = 'default',
}: {
  verdict: CompatibilityVerdict | null | undefined
  className?: string
  variant?: 'pdp' | 'card'
  tone?: 'default' | 'neutral'
  compact?: boolean
}) {
  if (!verdict) return null

  if (variant === 'card') {
    const seal = resolveCardSeal(verdict)
    if (seal.kind === 'hide' && !seal.label) return null
    const tip = verdict.evidences.map((e) => e.detail).join(' · ')
    const hideStyle =
      tone === 'neutral' && seal.kind === 'hide' ? CARD_STYLES_NEUTRAL_HIDE : CARD_STYLES[seal.kind]
    return (
      <span
        role="status"
        title={tip || seal.label}
        className={[
          'inline-flex max-w-[min(100%,11rem)] items-baseline gap-0.5 rounded-[8px] border-2 px-2 py-1 text-[11px] font-black leading-tight sm:text-xs',
          hideStyle,
          className,
        ].join(' ')}
      >
        <span className="truncate">{seal.label}</span>
        {seal.micro ? (
          <span className="shrink-0 text-[10px] font-extrabold opacity-90"> {seal.micro}</span>
        ) : null}
      </span>
    )
  }

  const tip = verdict.evidences.map((e) => e.detail).join(' · ')
  return (
    <span
      role="status"
      title={tip || verdict.label}
      className={[
        'inline-flex max-w-full items-center rounded-[8px] border px-2 py-0.5 text-[11px] font-extrabold',
        STYLES[verdict.state],
        className,
      ].join(' ')}
    >
      <span className="truncate">{verdict.label}</span>
    </span>
  )
}
