import { Loading } from '@/components/common/Loading'
import { features } from '@/config/features'
import { useAuth } from '@/contexts/AuthContext'
import { isStaffRole } from '@/services/admin/staffService'
import type { ReactNode } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'

/**
 * Catálogo B2B: exige login. Staff sempre entra.
 * Cliente sem vínculo ACTIVE vê aviso (RLS já filtra produtos).
 */
export function B2bCatalogRoute({ children }: { children: ReactNode }) {
  const { user, loading, profileLoading } = useAuth()
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
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-extrabold text-hf-ink">Catálogo restrito</h1>
        <p className="mt-3 text-sm text-hf-muted">
          {user.customerStatus === 'pending'
            ? 'Sua empresa está pendente de aprovação. Assim que for ativada, o catálogo autorizado aparece aqui.'
            : user.customerStatus === 'suspended'
              ? 'Acesso suspenso. Fale com a HF Comércio de Peças.'
              : 'Sua conta ainda não está vinculada a um cliente B2B ativo. Solicite o vínculo à HF.'}
        </p>
        {user.customerLegalName ? (
          <p className="mt-2 text-sm font-semibold text-hf-ink">{user.customerLegalName}</p>
        ) : null}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link
            to="/conta"
            className="inline-flex rounded-[10px] bg-hf-surface-2 px-4 py-2.5 text-sm font-extrabold text-white"
          >
            Minha conta
          </Link>
          <Link
            to="/"
            className="inline-flex rounded-[10px] border border-hf-line px-4 py-2.5 text-sm font-semibold text-hf-ink"
          >
            Início
          </Link>
        </div>
      </div>
    )
  }

  return children
}
