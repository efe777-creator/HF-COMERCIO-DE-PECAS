import { describe, expect, it } from 'vitest'
import {
  communicationCopyForKind,
  communicationCtaLabel,
  isAccessNotificationKind,
  kindForCustomerStatus,
} from './communicationCopy'

describe('communicationCopy', () => {
  it('maps kinds to PT title and href', () => {
    expect(communicationCopyForKind('access_granted')).toMatchObject({
      title: 'Acesso liberado',
      href: '/conta',
      audience: 'customer',
    })
    expect(communicationCopyForKind('access_suspended')).toMatchObject({
      title: 'Acesso suspenso',
      href: '/conta',
      audience: 'customer',
    })
    expect(communicationCopyForKind('access_pending')).toMatchObject({
      title: 'Cliente aguardando liberação',
      href: '/admin/clientes',
      audience: 'staff',
    })
  })

  it('maps customer status to kind', () => {
    expect(kindForCustomerStatus('pending')).toBe('access_pending')
    expect(kindForCustomerStatus('active')).toBe('access_granted')
    expect(kindForCustomerStatus('suspended')).toBe('access_suspended')
  })

  it('cta labels', () => {
    expect(communicationCtaLabel('access_pending')).toBe('Abrir clientes')
    expect(communicationCtaLabel('access_granted')).toBe('Ver conta')
  })

  it('guards kind', () => {
    expect(isAccessNotificationKind('access_granted')).toBe(true)
    expect(isAccessNotificationKind('order_status')).toBe(false)
  })
})
