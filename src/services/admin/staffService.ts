import { getSupabase } from '@/lib/supabase'
import type { UserRole } from '@/types'

const STAFF_ROLES: UserRole[] = [
  'administrador',
  'gerente',
  'operador',
  'estoque',
  'atendimento',
]

export function isStaffRole(role: string | null | undefined): boolean {
  return Boolean(role && STAFF_ROLES.includes(role as UserRole))
}

export async function fetchProfileRole(userId: string): Promise<UserRole | null> {
  const { data, error } = await getSupabase()
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  return (data?.role as UserRole | undefined) ?? null
}

/** Confirma staff via RPC is_staff() (fonte de verdade RLS). */
export async function checkIsStaff(): Promise<boolean> {
  const { data, error } = await getSupabase().rpc('is_staff')
  if (error) throw error
  return Boolean(data)
}
