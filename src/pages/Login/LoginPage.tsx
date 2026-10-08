import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { WhatsAppButton } from '@/components/common/WhatsAppButton'
import { Logo } from '@/components/navigation/Logo'
import { Container } from '@/components/layout/Container'
import { AuthNotConfiguredError, useAuth } from '@/contexts/AuthContext'
import { buildHomeWhatsAppMessage } from '@/lib/whatsapp'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'

export function LoginPage() {
  const { signIn, user, loading, isConfigured } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/catalogo'

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
      if (err instanceof AuthNotConfiguredError) setError(err.message)
      else if (err instanceof Error) setError(err.message)
      else setError('Não foi possível entrar.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Container className="flex min-h-[70vh] items-center justify-center py-10">
      <div className="w-full max-w-md rounded-hf border border-hf-line bg-hf-surface p-6 sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo />
          <h1 className="mt-4 text-2xl font-black text-hf-ink">Acesse seu catálogo HF</h1>
          <p className="mt-2 text-sm text-hf-muted">
            Ambiente B2B para oficinas, autopeças e profissionais autorizados.
          </p>
        </div>

        {!isConfigured ? (
          <p className="mb-4 rounded-[10px] border border-hf-red/40 bg-hf-bg p-3 text-sm text-hf-muted">
            Supabase ainda não configurado. Copie <code>.env.example</code> para <code>.env.local</code>.
          </p>
        ) : null}

        <form className="space-y-3" onSubmit={onSubmit}>
          <Input
            label="E-mail"
            name="email"
            autoComplete="username"
            value={emailOrUsername}
            onChange={(e) => setEmailOrUsername(e.target.value)}
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
          <div className="flex justify-end">
            <Link to="/recuperar-senha" className="text-sm font-bold text-hf-auth-link">
              Esqueci minha senha
            </Link>
          </div>
          {error ? <p className="text-sm text-hf-danger">{error}</p> : null}
          <Button type="submit" variant="primary" fullWidth disabled={submitting}>
            {submitting ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>

        <div className="mt-4 grid gap-2">
          <Link to="/cadastro">
            <Button type="button" variant="outline" fullWidth>
              Solicitar acesso
            </Button>
          </Link>
          <WhatsAppButton message={buildHomeWhatsAppMessage()} fullWidth>
            Falar com a HF
          </WhatsAppButton>
        </div>
      </div>
    </Container>
  )
}
