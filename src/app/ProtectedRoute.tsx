import { useAuth } from '@/contexts/AuthContext'
import { Loading } from '@/components/common/Loading'
import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <Loading label="Verificando sessão…" />
  if (!user) {
    const from = `${location.pathname}${location.search}`
    return <Navigate to="/login" replace state={{ from }} />
  }
  return children
}
