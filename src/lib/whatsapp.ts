import { storeWhatsAppNumber } from '@/config/business'

/** Mensagens WhatsApp contextualizadas (catálogo HF B2B). */

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

export function buildHomeWhatsAppMessage(): string {
  return 'Olá! Sou cliente B2B e gostaria de falar com a HF Comércio de Peças.'
}

export function buildNotFoundWhatsAppMessage(query?: string): string {
  const q = query?.trim()
  return q
    ? `Olá! Não encontrei “${q}” no catálogo. Podem me ajudar a localizar a peça?`
    : 'Olá! Não encontrei a peça no catálogo. Podem me ajudar?'
}

export function buildAccessPendingWhatsAppMessage(): string {
  return 'Olá! Solicitei acesso ao catálogo B2B da HF e gostaria de atualizar o status da minha empresa.'
}

export function buildVehicleWhatsAppMessage(input: {
  maker?: string
  model?: string
  year?: string
}): string {
  const parts = [input.maker, input.model, input.year].filter(Boolean).join(' ')
  return parts
    ? `Olá! Quero consultar peças para o veículo: ${parts}.`
    : 'Olá! Quero consultar peças por aplicação/veículo.'
}

export function whatsAppHref(phoneE164Digits: string, message: string): string {
  const phone = phoneE164Digits.replace(/\D/g, '')
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}

export function storeWhatsAppHref(message: string): string | null {
  const phone = storeWhatsAppNumber()
  if (!phone) return null
  return whatsAppHref(phone, message)
}

/** @deprecated Use storeWhatsAppNumber from @/config/business */
export function storeWhatsAppPhone(): string | null {
  return storeWhatsAppNumber()
}
