import { getSupabase } from '@/lib/supabase'

/** Soft-delete: anonimiza perfil, limpa CPF/CNPJ; pedidos permanecem. */
export async function requestAccountDeletion(): Promise<void> {
  const { error } = await getSupabase().rpc('request_account_deletion')
  if (error) throw error
}
