import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { WhatsAppButton } from '@/components/common/WhatsAppButton'
import { Logo } from '@/components/navigation/Logo'
import { Container } from '@/components/layout/Container'
import { AuthNotConfiguredError, useAuth } from '@/contexts/AuthContext'
import { formatPhoneMask, isValidPhone, normalizePhone } from '@/lib/phone'
import { buildHomeWhatsAppMessage } from '@/lib/whatsapp'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'

export function RegisterPage() {
  const { signUp, user, loading, isConfigured } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!loading && user) return <Navigate to="/conta" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== password2) {
      setError('As senhas não coincidem.')
      return
    }
    const phoneDigits = phone.trim() ? normalizePhone(phone) : ''
    if (phoneDigits && !isValidPhone(phoneDigits)) {
      setError('Telefone inválido. Use DDD + número (10 ou 11 dígitos).')
      return
    }
    const parts = fullName.trim().split(/\s+/)
    const firstName = parts[0] ?? ''
    const lastName = parts.slice(1).join(' ') || firstName
    setSubmitting(true)
    try {
      await signUp({
        email,
        password,
        firstName,
        lastName,
        phone: phoneDigits || undefined,
        companyName: companyName.trim() || undefined,
      })
      navigate('/conta', { replace: true })
    } catch (err) {
      if (err instanceof AuthNotConfiguredError) setError(err.message)
      else if (err instanceof Error) setError(err.message)
      else setError('Não foi possível criar a conta.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Container className="flex min-h-[70vh] items-center justify-center py-10">
      <div className="w-full max-w-md rounded-hf border border-hf-line bg-hf-surface p-6 sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo />
          <h1 className="mt-4 text-2xl font-black text-hf-ink">Solicite seu acesso à HF</h1>
          <p className="mt-2 text-sm text-hf-muted">
            Preencha os dados. Após aprovação, o catálogo autorizado da sua empresa fica disponível.
          </p>
        </div>

        {!isConfigured ? (
          <p className="mb-4 rounded-[10px] border border-hf-red/40 bg-hf-bg p-3 text-sm text-hf-muted">
            Cadastro indisponível no momento.
          </p>
        ) : null}

        <form className="space-y-3" onSubmit={onSubmit}>
          <Input
            label="Nome completo"
            name="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
          <Input
            label="E-mail"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Nome da empresa (opcional)"
            name="company"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
          <Input
            label="Telefone (opcional)"
            name="phone"
            value={phone}
            onChange={(e) => setPhone(formatPhoneMask(e.target.value))}
          />
          <Input
            label="Senha"
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Input
            label="Confirmar senha"
            name="password2"
            type="password"
            autoComplete="new-password"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            required
          />
          {error ? <p className="text-sm text-hf-danger">{error}</p> : null}
          <Button type="submit" variant="primary" fullWidth disabled={submitting}>
            {submitting ? 'Enviando…' : 'Solicitar acesso'}
          </Button>
        </form>

        <div className="mt-4 grid gap-2">
          <Link to="/login">
            <Button type="button" variant="outline" fullWidth>
              Já tenho conta — Entrar
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
