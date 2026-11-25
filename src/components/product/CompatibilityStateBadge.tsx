import {
  compatFaltante,
  compatMotivo,
  compatSealDisplayLabel,
} from '@/services/compatibility/compatCopy'
import {
  resolveCardSeal,
  type CompatibilityVerdict,
} from '@/services/compatibility/compatibilityEngine'

const STYLES: Record<CompatibilityVerdict['state'], string> = {
  confirmed: 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300',
  probable: 'border-amber-400/60 bg-amber-400/20 text-amber-100',
  unconfirmed: 'border-hf-line bg-hf-bg text-hf-muted',
}

const CARD_STYLES = {
  compatible: 'border-emerald-600 bg-emerald-600 text-white',
  similar: 'border-amber-500 bg-amber-400 text-hf-ink',
  check: 'border-hf-line bg-hf-surface text-hf-ink',
  hide: 'border-hf-red bg-hf-red text-white',
} as const

const CARD_STYLES_NEUTRAL_HIDE = 'border-hf-line bg-hf-bg text-hf-muted'

function tipFromVerdict(verdict: CompatibilityVerdict): string {
  const motivo = compatMotivo(verdict)
  const faltante = compatFaltante(verdict)
  const parts = [motivo, faltante ? `Falta: ${faltante}` : null].filter(Boolean)
  if (parts.length) return parts.join(' · ')
  return verdict.evidences.map((e) => e.detail).join(' · ')
}

export function CompatibilityStateBadge({
  verdict,
  className = '',
  variant = 'pdp',
  tone = 'default',
  showHint = false,
}: {
  verdict: CompatibilityVerdict | null | undefined
  className?: string
  variant?: 'pdp' | 'card'
  tone?: 'default' | 'neutral'
  /** PDP: mostra linha “Falta: …” sob o selo quando aplicável. */
  showHint?: boolean
  compact?: boolean
}) {
  if (!verdict) return null

  const label = compatSealDisplayLabel(verdict)
  const tip = tipFromVerdict(verdict) || label
  const faltante = compatFaltante(verdict)

  if (variant === 'card') {
    const seal = resolveCardSeal(verdict)
    if (seal.kind === 'hide' && !seal.label) return null
    const hideStyle =
      tone === 'neutral' && seal.kind === 'hide' ? CARD_STYLES_NEUTRAL_HIDE : CARD_STYLES[seal.kind]
    return (
      <span
        role="status"
        title={tip}
        className={[
          'inline-flex max-w-[min(100%,12rem)] items-baseline rounded-[8px] border-2 px-2 py-1 text-[11px] font-black leading-tight sm:text-xs',
          hideStyle,
          className,
        ].join(' ')}
      >
        <span className="truncate">{label}</span>
      </span>
    )
  }

  return (
    <div className={['flex max-w-full flex-col gap-1', className].join(' ')}>
      <span
        role="status"
        title={tip}
        className={[
          'inline-flex max-w-full items-center rounded-[8px] border px-2 py-0.5 text-[11px] font-extrabold',
          STYLES[verdict.state],
        ].join(' ')}
      >
        <span className="truncate">{label || verdict.label}</span>
      </span>
      {showHint && faltante ? (
        <p className="m-0 text-[11px] text-hf-muted">Falta: {faltante}</p>
      ) : null}
      {showHint && !faltante && tip && tip !== label ? (
        <p className="m-0 text-[11px] text-hf-muted">{tip}</p>
      ) : null}
    </div>
  )
}
