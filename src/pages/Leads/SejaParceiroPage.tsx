import { Navigate } from 'react-router-dom'

/** Legado: redireciona para cadastro comercial. */
export function SejaParceiroPage() {
  return <Navigate to="/cadastro-comercial" replace />
}
