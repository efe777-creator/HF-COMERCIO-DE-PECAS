import { normalizePhone } from '@/lib/phone'
import { getSupabase, isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { UserProfile } from '@/types'
import type { Session, User } from '@supabase/supabase-js'

export class AuthNotConfiguredError extends Error {
  constructor() {
    super('Supabase Auth não configurado. Preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.')
    this.name = 'AuthNotConfiguredError'
  }
}

export function mapUser(user: User | null): UserProfile | null {
  if (!user) return null
  return {
    id: user.id,
    email: user.email ?? null,
    username: (user.user_metadata?.username as string | undefined) ?? null,
    fullName:
      (user.user_metadata?.full_name as string | undefined) ??
      (user.user_metadata?.name as string | undefined) ??
      null,
    phone: (user.user_metadata?.phone as string | undefined) ?? null,
    role: 'customer',
    emailConfirmed: Boolean(user.email_confirmed_at),
  }
}

/**
 * Login Fase 1: e-mail + senha via Supabase Auth.
 *
 * Preparação para username+senha:
 * - Aceita `emailOrUsername` na API pública.
 * - Se o valor contiver "@", trata como e-mail.
 * - Username exigirá resolução segura (Edge Function / RPC) — NÃO lookup inseguro no frontend.
 */
export async function signInWithIdentifier(params: {
  emailOrUsername: string
  password: string
}): Promise<{ session: Session | null; user: UserProfile | null }> {
  if (!isSupabaseConfigured) throw new AuthNotConfiguredError()

  const identifier = params.emailOrUsername.trim()
  const looksLikeEmail = identifier.includes('@')

  if (!looksLikeEmail) {
    throw new Error(
      'Login por usuário ainda não está disponível. Use seu e-mail. A arquitetura já está preparada para username via backend seguro.',
    )
  }

  const { data, error } = await getSupabase().auth.signInWithPassword({
    email: identifier,
    password: params.password,
  })
  if (error) throw error
  return { session: data.session, user: mapUser(data.user) }
}

export async function signUp(params: {
  email: string
  password: string
  firstName: string
  lastName: string
  username?: string
  phone?: string
  cpf?: string
}): Promise<{ session: Session | null; user: UserProfile | null }> {
  if (!isSupabaseConfigured) throw new AuthNotConfiguredError()

  const fullName = `${params.firstName} ${params.lastName}`.trim()
  const phone = params.phone?.trim() ? normalizePhone(params.phone) : null
  const cpf = params.cpf?.replace(/\D/g, '') || null
  const { data, error } = await getSupabase().auth.signUp({
    email: params.email.trim(),
    password: params.password,
    options: {
      data: {
        full_name: fullName,
        first_name: params.firstName,
        last_name: params.lastName,
        username: params.username ?? null,
        phone,
        cpf,
      },
    },
  })
  if (error) throw error

  // Persiste CPF no customer quando sessão já existe (confirmação de e-mail desligada)
  if (data.session?.user && cpf) {
    await getSupabase()
      .from('customers')
      .update({ cpf })
      .eq('profile_id', data.session.user.id)
  }

  return { session: data.session, user: mapUser(data.user) }
}

export async function signOut(): Promise<void> {
  if (!isSupabaseConfigured) return
  const { error } = await getSupabase().auth.signOut()
  if (error) throw error
}

export async function resetPassword(email: string): Promise<void> {
  if (!isSupabaseConfigured) throw new AuthNotConfiguredError()
  const redirectTo = `${window.location.origin}/recuperar-senha`
  const { error } = await getSupabase().auth.resetPasswordForEmail(email.trim(), {
    redirectTo,
  })
  if (error) throw error
}

export async function getSession(): Promise<Session | null> {
  if (!supabase) return null
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}

export function onAuthStateChange(
  callback: (session: Session | null) => void,
): () => void {
  if (!supabase) {
    callback(null)
    return () => undefined
  }
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session)
  })
  return () => data.subscription.unsubscribe()
}
