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
    'bg-fal-yellow text-fal-navy-dark hover:bg-fal-yellow-hover border-transparent',
  outline:
    'bg-transparent text-white border border-white/40 hover:bg-white/10',
  dark: 'bg-fal-navy text-white border-transparent hover:bg-fal-navy-dark',
  light: 'bg-white text-fal-navy border border-fal-line hover:bg-fal-bg',
  danger: 'bg-fal-bg text-fal-danger border-transparent hover:bg-red-50',
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
