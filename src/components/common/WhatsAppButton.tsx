import { Button } from '@/components/common/Button'
import { storeWhatsAppHref } from '@/lib/whatsapp'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Props = {
  message: string
  children?: ReactNode
  size?: 'md' | 'sm'
  fullWidth?: boolean
  className?: string
} & Omit<ButtonHTMLAttributes<HTMLAnchorElement>, 'href'>

export function WhatsAppButton({
  message,
  children = 'Falar com a HF',
  size = 'md',
  fullWidth,
  className = '',
  ...rest
}: Props) {
  const href = storeWhatsAppHref(message)
  if (!href) {
    return (
      <Button type="button" variant="outline" size={size} fullWidth={fullWidth} disabled className={className}>
        WhatsApp indisponível
      </Button>
    )
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={['inline-flex', fullWidth ? 'w-full' : '', className].filter(Boolean).join(' ')}
      {...rest}
    >
      <Button type="button" variant="whatsapp" size={size} fullWidth={fullWidth}>
        {children}
      </Button>
    </a>
  )
}
