/**
 * Configuração comercial / institucional HF.
 * Fonte: SITE HF HTML (contato / identidade).
 */

function digitsOnly(value: string | undefined): string {
  return (value ?? '').replace(/\D/g, '')
}

export const businessConfig = {
  companyName: 'HF Comércio de Peças',
  shortName: 'HF',
  tagline: 'Distribuidora automotiva especializada em suspensão, direção e freios.',
  eyebrow: 'Distribuição automotiva • Guarulhos/SP',
  heroHeadline: 'A peça certa.',
  heroHighlight: 'Com mais rapidez e precisão.',
  heroSupport:
    'Consulte o catálogo por código, categoria, montadora e aplicação. Ambiente B2B para oficinas, autopeças e profissionais do setor.',
  address: 'Av. Rosa Molina Pannochia, 424 — Guarulhos/SP',
  city: 'Guarulhos/SP',
  email: 'marketing@hfcomerciodepecas.com',
  phoneFixed: '1143724582',
  phoneAdmin: '11985491746',
  /** Contato institucional (exibição). CTA WhatsApp usa só `whatsappNumber` ← env. */
  phoneWhatsAppDefault: '11994370003',
  instagramUrl: 'https://www.instagram.com/hfsuspensao/',
  hoursWeek: 'Seg–Sex 08h–18h',
  hoursSat: 'Sáb 09h–14h',
  /** Somente `VITE_WHATSAPP_NUMBER` — sem fallback hardcoded no CTA. */
  whatsappNumber: digitsOnly(import.meta.env.VITE_WHATSAPP_NUMBER as string | undefined),
} as const

/** Número E.164 só dígitos, ou null se inválido. */
export function storeWhatsAppNumber(): string | null {
  const digits = businessConfig.whatsappNumber
  return digits.length >= 10 ? digits : null
}
