import { storeWhatsAppNumber } from '@/config/business'

/** Mensagens WhatsApp contextualizadas (catálogo HF). */

export function buildProductWhatsAppMessage(input: {
  name: string
  sku: string
  quantity?: number
  productUrl?: string
}): string {
  const lines = [
    'Olá! Gostaria de consultar esta peça na HF Comércio de Peças:',
    '',
    `Peça: ${input.name}`,
    `Código: ${input.sku}`,
  ]
  if (input.quantity && input.quantity > 0) {
    lines.push(`Quantidade: ${input.quantity}`)
  }
  if (input.productUrl) {
    lines.push('', `Link: ${input.productUrl}`)
  }
  return lines.join('\n')
}

export function whatsAppHref(phoneE164Digits: string, message: string): string {
  const phone = phoneE164Digits.replace(/\D/g, '')
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}

/** @deprecated Use storeWhatsAppNumber from @/config/business */
export function storeWhatsAppPhone(): string | null {
  return storeWhatsAppNumber()
}
