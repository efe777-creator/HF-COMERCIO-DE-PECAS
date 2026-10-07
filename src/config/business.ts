/**
 * Configuração comercial / institucional HF.
 * WhatsApp e dados da empresa — única fonte no frontend.
 */

function digitsOnly(value: string | undefined): string {
  return (value ?? '').replace(/\D/g, '')
}

export const businessConfig = {
  companyName: 'HF Comércio de Peças',
  whatsappNumber: digitsOnly(import.meta.env.VITE_WHATSAPP_NUMBER as string | undefined),
} as const

/** Número E.164 só dígitos, ou null se inválido. */
export function storeWhatsAppNumber(): string | null {
  const digits = businessConfig.whatsappNumber
  return digits.length >= 10 ? digits : null
}
