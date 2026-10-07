import { getSupabase } from '@/lib/supabase'
import type { UserRole } from '@/types'

export type AssignableRole = UserRole

export const ASSIGNABLE_ROLES: { value: AssignableRole; label: string }[] = [
  { value: 'customer', label: 'Cliente (sem admin)' },
  { value: 'administrador', label: 'Administrador' },
  { value: 'gerente', label: 'Gerente' },
  { value: 'operador', label: 'Operador' },
  { value: 'estoque', label: 'Estoque' },
  { value: 'atendimento', label: 'Atendimento' },
]

export interface AdminOperatorUserRow {
  id: string
  email: string | null
  fullName: string | null
  username: string | null
  role: UserRole
  createdAt: string
  lastSignInAt: string | null
  deactivatedAt: string | null
}

function mapOperatorRow(r: Record<string, unknown>): AdminOperatorUserRow {
  return {
    id: String(r.id),
    email: r.email != null ? String(r.email) : null,
    fullName: r.full_name != null ? String(r.full_name) : null,
    username: r.username != null ? String(r.username) : null,
    role: r.role as UserRole,
    createdAt: String(r.created_at),
    lastSignInAt: r.last_sign_in_at != null ? String(r.last_sign_in_at) : null,
    deactivatedAt: r.deactivated_at != null ? String(r.deactivated_at) : null,
  }
}

/** Query vazia → lista staff. Com texto → busca e-mail/nome. */
export async function adminSearchUsers(query: string): Promise<AdminOperatorUserRow[]> {
  const { data, error } = await getSupabase().rpc('admin_search_users', {
    p_query: query.trim(),
  })
  if (error) throw error
  return (data ?? []).map((r: Record<string, unknown>) => mapOperatorRow(r))
}

export async function adminDeactivateOperator(userId: string): Promise<AdminOperatorUserRow> {
  const { data, error } = await getSupabase().rpc('admin_deactivate_operator', {
    p_user_id: userId,
  })
  if (error) throw error
  if (!data) throw new Error('Resposta vazia ao desativar operador')
  const row = data as Record<string, unknown>
  return {
    id: String(row.id),
    email: null,
    fullName: row.full_name != null ? String(row.full_name) : null,
    username: row.username != null ? String(row.username) : null,
    role: row.role as UserRole,
    createdAt: String(row.created_at),
    lastSignInAt: null,
    deactivatedAt: row.deactivated_at != null ? String(row.deactivated_at) : null,
  }
}

export async function adminSetUserRole(
  userId: string,
  role: AssignableRole,
): Promise<AdminOperatorUserRow> {
  const { data, error } = await getSupabase().rpc('admin_set_user_role', {
    p_user_id: userId,
    p_role: role,
  })
  if (error) throw error
  if (!data) throw new Error('Resposta vazia ao alterar role')

  const row = data as Record<string, unknown>
  return {
    id: String(row.id),
    email: null,
    fullName: row.full_name != null ? String(row.full_name) : null,
    username: row.username != null ? String(row.username) : null,
    role: row.role as UserRole,
    createdAt: String(row.created_at),
    lastSignInAt: null,
    deactivatedAt: row.deactivated_at != null ? String(row.deactivated_at) : null,
  }
}
