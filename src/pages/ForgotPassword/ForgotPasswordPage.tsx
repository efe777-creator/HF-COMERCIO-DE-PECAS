import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Container } from '@/components/layout/Container'
import { AuthNotConfiguredError, useAuth } from '@/contexts/AuthContext'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

export function ForgotPasswordPage() {
  const { resetPassword, isConfigured } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setSubmitting(true)
    try {
      await resetPassword(email)
      setSuccess(true)
    } catch (err) {
      if (err instanceof AuthNotConfiguredError) setError(err.message)
      else if (err instanceof Error) setError(err.message)
      else setError('Não foi possível enviar o e-mail.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Container className="py-8">
      <div className="mx-auto max-w-md rounded-hf border border-hf-line bg-hf-surface p-6">
        <h1 className="mt-0 text-[28px] font-extrabold">Recuperar senha</h1>
        <p className="text-hf-muted">
          Enviaremos um link de redefinição para o e-mail cadastrado (Supabase Auth).
        </p>
        {!isConfigured ? (
          <p className="mt-3 rounded-[10px] border border-[#f0d979] bg-[#fff8db] p-3 text-sm">
            Configure o Supabase no <code>.env</code> para ativar a recuperação.
          </p>
        ) : null}
        <form className="mt-4 space-y-3" onSubmit={onSubmit}>
          <Input
            label="E-mail"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {error ? <p className="text-sm text-hf-danger">{error}</p> : null}
          {success ? (
            <p className="text-sm text-hf-success">
              Se o e-mail existir, você receberá as instruções em breve.
            </p>
          ) : null}
          <Button type="submit" variant="primary" fullWidth disabled={submitting}>
            {submitting ? 'Enviando…' : 'Enviar link'}
          </Button>
        </form>
        <p className="mt-4 text-sm">
          <Link to="/login" className="font-bold text-hf-auth-link">
            Voltar ao login
          </Link>
        </p>
      </div>
    </Container>
  )
}
