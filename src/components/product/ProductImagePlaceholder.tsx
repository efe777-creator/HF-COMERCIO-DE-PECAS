type Props = {
  className?: string
  label?: string
}

/** Placeholder neutro HF — sem emoji. */
export function ProductImagePlaceholder({ className = '', label = 'Sem foto' }: Props) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 text-hf-muted ${className}`}
      role="img"
      aria-label={label}
    >
      <svg
        width="56"
        height="56"
        viewBox="0 0 56 56"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
        className="opacity-70"
      >
        <rect x="6" y="10" width="44" height="36" rx="4" stroke="currentColor" strokeWidth="2" />
        <circle cx="20" cy="24" r="4" stroke="currentColor" strokeWidth="2" />
        <path
          d="M6 38l12-10 8 7 8-6 16 12"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
      <span className="text-xs font-semibold tracking-wide uppercase">{label}</span>
    </div>
  )
}
