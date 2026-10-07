import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'outline' | 'dark' | 'light' | 'danger'
type Size = 'md' | 'sm'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  fullWidth?: boolean
  children: ReactNode
}

const variants: Record<Variant, string> = {
  primary:
    'bg-gradient-to-br from-hf-red to-hf-red-bright text-white hover:brightness-110 border-transparent shadow-[0_10px_30px_rgba(197,23,31,0.25)]',
  outline:
    'bg-transparent text-hf-ink border border-white/40 hover:bg-hf-surface/10',
  dark: 'bg-hf-surface-2 text-white border border-hf-line hover:bg-hf-surface',
  light:
    'bg-hf-surface text-hf-ink border border-hf-line hover:bg-hf-surface-2',
  danger: 'bg-hf-surface text-hf-danger border border-hf-danger/40 hover:bg-hf-surface-2',
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth,
  className = '',
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  const sizeCls = size === 'sm' ? 'px-3 py-2 text-xs' : 'px-[19px] py-[13px] text-sm'
  return (
    <button
      type={type}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-[10px] font-extrabold border transition',
        'disabled:cursor-not-allowed disabled:opacity-50',
        sizeCls,
        variants[variant],
        fullWidth ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </button>
  )
}
