import { Navigate } from 'react-router-dom'

/** @deprecated Use /admin/pedidos/cotacoes — redirect de compatibilidade. */
export function AdminCotacoesPage() {
  return <Navigate to="/admin/pedidos/cotacoes" replace />
}
