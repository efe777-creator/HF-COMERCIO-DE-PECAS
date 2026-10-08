import { Button } from '@/components/common/Button'
import { Loading } from '@/components/common/Loading'
import { WhatsAppButton } from '@/components/common/WhatsAppButton'
import { features } from '@/config/features'
import { useAuth } from '@/contexts/AuthContext'
import { buildAccessPendingWhatsAppMessage } from '@/lib/whatsapp'
import { isStaffRole } from '@/services/admin/staffService'
import type { ReactNode } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'

/**
 * Gate do catálogo quando customer_specific_catalog_enabled.
 * Com a flag false, qualquer visitante vê published (RLS alinhada).
 * Staff sempre entra; cliente sem ACTIVE vê aviso se a flag estiver true.
 */
export function B2bCatalogRoute({ children }: { children: ReactNode }) {
  const { user, loading, profileLoading, signOut } = useAuth()
  const location = useLocation()

  if (!features.customer_login_enabled || !features.customer_specific_catalog_enabled) {
    return children
  }

  if (loading || profileLoading) return <Loading label="Verificando acesso…" />

  if (!user) {
    const from = `${location.pathname}${location.search}`
    return <Navigate to="/login" replace state={{ from }} />
  }

  if (isStaffRole(user.role)) return children

  if (!user.customerId || user.customerStatus !== 'active') {
    const pending = user.customerStatus === 'pending'
    const suspended = user.customerStatus === 'suspended'
    const title = suspended
      ? 'Acesso suspenso'
      : pending
        ? 'Empresa pendente de aprovação'
        : 'Catálogo ainda não liberado'
    const description = suspended
      ? 'Sua empresa está suspensa. Fale com a HF para regularizar o acesso.'
      : pending
        ? 'Recebemos sua solicitação. Assim que a HF ativar sua empresa, o catálogo autorizado aparece aqui.'
        : 'Sua conta ainda não está vinculada a um cliente B2B ativo. Solicite o vínculo à HF.'

    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-extrabold text-hf-ink">{title}</h1>
        <p className="mt-3 text-sm text-hf-muted">{description}</p>
        {user.customerLegalName ? (
          <p className="mt-2 text-sm font-semibold text-hf-ink">{user.customerLegalName}</p>
        ) : null}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <WhatsAppButton message={buildAccessPendingWhatsAppMessage()}>
            Falar com a HF
          </WhatsAppButton>
          <Link to="/conta">
            <Button type="button" variant="dark">
              Minha conta
            </Button>
          </Link>
          <Button type="button" variant="outline" onClick={() => void signOut()}>
            Sair
          </Button>
        </div>
      </div>
    )
  }

  return children
}
