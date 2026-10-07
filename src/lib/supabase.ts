import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Cliente Supabase único (frontend).
 * Usa apenas a chave anon — NUNCA service_role.
 * Políticas RLS devem proteger dados privados quando o banco for criado.
 */

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(
  url &&
    anonKey &&
    !url.includes('YOUR_PROJECT') &&
    !anonKey.includes('YOUR_SUPABASE'),
)

let client: SupabaseClient | null = null

if (isSupabaseConfigured && url && anonKey) {
  client = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })
} else if (import.meta.env.DEV) {
  console.warn(
    '[HF] Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env',
  )
}

export const supabase = client

export function getSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase não está configurado. Copie .env.example para .env e preencha as chaves anon.',
    )
  }
  return supabase
}
