import { useAuth } from '@/contexts/AuthContext'
import { Loading } from '@/components/common/Loading'
import { isStaffRole } from '@/services/admin/staffService'
import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

export function StaffRoute({ children }: { children: ReactNode }) {
  const { user, loading, profileLoading } = useAuth()
  const location = useLocation()

  if (loading || profileLoading) return <Loading label="Verificando permissões…" />
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  if (!isStaffRole(user.role)) {
    return <Navigate to="/" replace />
  }
  return children
}
