import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Container } from '@/components/layout/Container'
import { AuthNotConfiguredError, useAuth } from '@/contexts/AuthContext'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'

export function LoginPage() {
  const { signIn, user, loading, isConfigured } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/conta'

  const [emailOrUsername, setEmailOrUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!loading && user) return <Navigate to={from} replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await signIn(emailOrUsername, password)
      navigate(from, { replace: true })
    } catch (err) {
      if (err instanceof AuthNotConfiguredError) {
        setError(err.message)
      } else if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Não foi possível entrar.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Container className="py-8">
      <div className="mx-auto grid max-w-[1050px] grid-cols-1 gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-10">
        <div className="py-4 lg:py-10">
          <h1 className="mt-0 text-[36px] leading-tight font-black lg:text-[44px]">
            Bem-vindo à FAL
          </h1>
          <p className="text-[17px] text-fal-muted">
            Acesse sua conta para acompanhar pedidos, endereços e favoritos.
          </p>
          {!isConfigured ? (
            <p className="mt-4 rounded-[10px] border border-[#f0d979] bg-[#fff8db] p-3 text-sm">
              Supabase ainda não configurado. Copie <code>.env.example</code> para{' '}
              <code>.env</code> e preencha URL + anon key.
            </p>
          ) : null}
        </div>

        <div className="overflow-hidden rounded-fal border border-fal-line bg-white">
          <div className="grid grid-cols-2 border-b border-fal-line">
            <span className="bg-[#fafbfc] px-4 py-4 text-center font-extrabold shadow-[inset_0_-3px_var(--fal-yellow)]">
              Entrar
            </span>
            <Link to="/cadastro" className="px-4 py-4 text-center font-extrabold hover:bg-[#fafbfc]">
              Criar conta grátis
            </Link>
          </div>
          <form className="p-5 sm:p-7" onSubmit={onSubmit}>
            <h2 className="mt-0 text-xl font-extrabold">Entrar na conta</h2>
            <div className="mt-3 space-y-3">
              <Input
                label="E-mail ou usuário"
                name="emailOrUsername"
                autoComplete="username"
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                hint="Fase 1: use e-mail. Login por usuário virá com resolução segura no backend."
                required
              />
              <Input
                label="Senha"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="mt-4 flex items-center justify-between gap-2 text-[13px]">
              <label className="flex items-center gap-2">
                <input type="checkbox" /> Manter conectado
              </label>
              <Link to="/recuperar-senha" className="font-bold text-fal-auth-link">
                Esqueci minha senha
              </Link>
            </div>
            {error ? <p className="mt-3 text-sm text-fal-danger">{error}</p> : null}
            <Button type="submit" variant="primary" fullWidth className="mt-4" disabled={submitting}>
              {submitting ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>
        </div>
      </div>
    </Container>
  )
}
