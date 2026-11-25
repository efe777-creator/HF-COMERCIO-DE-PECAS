/** Copy e href dos avisos in-app (puro — sem rede). */

export type AccessNotificationKind =
  | 'access_pending'
  | 'access_granted'
  | 'access_suspended'

export type CommunicationAudience = 'customer' | 'staff'

export type CommunicationCopy = {
  kind: AccessNotificationKind
  audience: CommunicationAudience
  title: string
  body: string
  href: string
  category: 'acesso'
  severity: 'importante' | 'acao_necessaria'
  actionable: boolean
}

const COPY: Record<AccessNotificationKind, CommunicationCopy> = {
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

export function isAccessNotificationKind(kind: string): kind is AccessNotificationKind {
  return kind === 'access_pending' || kind === 'access_granted' || kind === 'access_suspended'
}

export function communicationCopyForKind(kind: AccessNotificationKind): CommunicationCopy {
  return COPY[kind]
}

export function kindForCustomerStatus(
  status: 'pending' | 'active' | 'suspended',
): AccessNotificationKind {
  if (status === 'active') return 'access_granted'
  if (status === 'suspended') return 'access_suspended'
  return 'access_pending'
}

/** Href do CTA no card (conta: Ver conta; staff: Clientes). */
export function communicationCtaLabel(kind: AccessNotificationKind): string {
  if (kind === 'access_pending') return 'Abrir clientes'
  return 'Ver conta'
}
