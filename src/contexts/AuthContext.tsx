import {
  AuthNotConfiguredError,
  getSession,
  mapUser,
  onAuthStateChange,
  resetPassword,
  signInWithIdentifier,
  signOut,
  signUp,
} from '@/services/supabase/authService'
import { fetchProfileRole } from '@/services/admin/staffService'
import { getCustomerProfile } from '@/services/customers/customerService'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { UserProfile } from '@/types'
import type { Session, User } from '@supabase/supabase-js'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

interface AuthContextValue {
  user: UserProfile | null
  session: Session | null
  loading: boolean
  profileLoading: boolean
  isConfigured: boolean
  signIn: (emailOrUsername: string, password: string) => Promise<void>
  signUp: (params: {
    email: string
    password: string
    firstName: string
    lastName: string
    username?: string
    phone?: string
    cpf?: string
  }) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function enrichUser(authUser: User | null): Promise<UserProfile | null> {
  const base = mapUser(authUser)
  if (!base || !supabase) return base
  try {
    const [{ profile }, role] = await Promise.all([
      getCustomerProfile(base.id),
      fetchProfileRole(base.id),
    ])
    return {
      ...base,
      fullName: profile.fullName ?? base.fullName,
      phone: profile.phone ?? base.phone,
      username: profile.username ?? base.username,
      role: role ?? profile.role ?? base.role,
      customerId: profile.customerId,
      cpf: profile.cpf,
      cnpj: profile.cnpj,
    }
  } catch (err) {
    console.error('[FAL] Erro ao carregar perfil', err)
    try {
      const role = await fetchProfileRole(base.id)
      if (role) return { ...base, role }
    } catch {
      /* ignore */
    }
  }
  return base
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(true)

  useEffect(() => {
    let active = true

    void (async () => {
      try {
        const current = await getSession()
        if (!active) return
        setSession(current)
        setProfileLoading(true)
        setUser(await enrichUser(current?.user ?? null))
      } catch (err) {
        console.error('[FAL] Erro ao carregar sessão', err)
      } finally {
        if (active) {
          setLoading(false)
          setProfileLoading(false)
        }
      }
    })()

    const unsubscribe = onAuthStateChange((next) => {
      setSession(next)
      setLoading(false)
      setProfileLoading(true)
      void enrichUser(next?.user ?? null)
        .then((profile) => {
          if (active) setUser(profile)
        })
        .catch((err) => {
          console.error('[FAL] Erro ao enriquecer perfil', err)
          if (active) setUser(mapUser(next?.user ?? null))
        })
        .finally(() => {
          if (active) setProfileLoading(false)
        })
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const handleSignIn = useCallback(async (emailOrUsername: string, password: string) => {
    const result = await signInWithIdentifier({ emailOrUsername, password })
    setSession(result.session)
    setProfileLoading(true)
    setUser(await enrichUser(result.session?.user ?? null))
    setProfileLoading(false)
  }, [])

  const handleSignUp = useCallback(
    async (params: {
      email: string
      password: string
      firstName: string
      lastName: string
      username?: string
      phone?: string
    }) => {
      const result = await signUp(params)
      setSession(result.session)
      setProfileLoading(true)
      setUser(await enrichUser(result.session?.user ?? null))
      setProfileLoading(false)
    },
    [],
  )

  const handleSignOut = useCallback(async () => {
    await signOut()
    setSession(null)
    setUser(null)
  }, [])

  const handleReset = useCallback(async (email: string) => {
    await resetPassword(email)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      loading,
      profileLoading,
      isConfigured: isSupabaseConfigured,
      signIn: handleSignIn,
      signUp: handleSignUp,
      signOut: handleSignOut,
      resetPassword: handleReset,
    }),
    [user, session, loading, profileLoading, handleSignIn, handleSignUp, handleSignOut, handleReset],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}

export { AuthNotConfiguredError }
