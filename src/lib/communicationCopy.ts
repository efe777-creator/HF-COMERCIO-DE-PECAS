/** Copy e href dos avisos in-app (puro — sem rede). */

export type AccessNotificationKind =
  | 'access_pending'
  | 'access_granted'
  | 'access_suspended'

export type QuoteNotificationKind = 'quote_requested' | 'quote_sent'

export type CommunicationKind = AccessNotificationKind | QuoteNotificationKind

export type CommunicationAudience = 'customer' | 'staff'

export type CommunicationCopy = {
  kind: CommunicationKind
  audience: CommunicationAudience
  title: string
  body: string
  href: string
  category: 'acesso' | 'comercial' | 'sistema'
  severity: 'informativa' | 'importante' | 'acao_necessaria' | 'operacional'
  actionable: boolean
}

const ACCESS_COPY: Record<AccessNotificationKind, CommunicationCopy> = {
  access_pending: {
    kind: 'access_pending',
    audience: 'staff',
    title: 'Cliente aguardando liberação',
    body: 'Há um cliente B2B com status pending. Revise e libere o acesso.',
    href: '/admin/clientes',
    category: 'acesso',
    severity: 'acao_necessaria',
    actionable: true,
  },
  access_granted: {
    kind: 'access_granted',
    audience: 'customer',
    title: 'Acesso liberado',
    body: 'Sua empresa foi liberada. Você já pode ver o catálogo autorizado.',
    href: '/conta',
    category: 'acesso',
    severity: 'importante',
    actionable: false,
  },
  access_suspended: {
    kind: 'access_suspended',
    audience: 'customer',
    title: 'Acesso suspenso',
    body: 'O acesso B2B da sua empresa foi suspenso. Fale com a HF se precisar de ajuda.',
    href: '/conta',
    category: 'acesso',
    severity: 'importante',
    actionable: true,
  },
}

const QUOTE_COPY: Record<QuoteNotificationKind, CommunicationCopy> = {
  quote_requested: {
    kind: 'quote_requested',
    audience: 'staff',
    title: 'Nova cotação recebida',
    body: 'Há uma solicitação de cotação na fila comercial.',
    href: '/admin/pedidos/cotacoes',
    category: 'comercial',
    severity: 'acao_necessaria',
    actionable: true,
  },
  quote_sent: {
    kind: 'quote_sent',
    audience: 'customer',
    title: 'Cotação enviada',
    body: 'Recebemos sua solicitação de cotação. O time comercial retorna em breve.',
    href: '/conta/avisos',
    category: 'comercial',
    severity: 'informativa',
    actionable: false,
  },
}

export function isAccessNotificationKind(kind: string): kind is AccessNotificationKind {
  return kind === 'access_pending' || kind === 'access_granted' || kind === 'access_suspended'
}

export function isQuoteNotificationKind(kind: string): kind is QuoteNotificationKind {
  return kind === 'quote_requested' || kind === 'quote_sent'
}

export function communicationCopyForKind(kind: CommunicationKind): CommunicationCopy {
  if (isAccessNotificationKind(kind)) return ACCESS_COPY[kind]
  return QUOTE_COPY[kind]
}

export function kindForCustomerStatus(
  status: 'pending' | 'active' | 'suspended',
): AccessNotificationKind {
  if (status === 'active') return 'access_granted'
  if (status === 'suspended') return 'access_suspended'
  return 'access_pending'
}

/** Href do CTA no card. */
export function communicationCtaLabel(kind: CommunicationKind): string {
  if (kind === 'access_pending') return 'Abrir clientes'
  if (kind === 'quote_requested') return 'Abrir cotações'
  if (kind === 'quote_sent') return 'Ver avisos'
  return 'Ver conta'
}
