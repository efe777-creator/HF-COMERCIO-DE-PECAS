import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Container } from '@/components/layout/Container'
import { AuthNotConfiguredError, useAuth } from '@/contexts/AuthContext'
import { formatCpfMask, isValidCpf, onlyDigits } from '@/lib/document'
import { formatPhoneMask, isValidPhone, normalizePhone } from '@/lib/phone'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'

export function RegisterPage() {
  const { signUp, user, loading, isConfigured } = useAuth()
  const navigate = useNavigate()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [cpf, setCpf] = useState('')
  const [username, setUsername] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [terms, setTerms] = useState(false)
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
    if (!terms) {
      setError('Aceite os termos para continuar.')
      return
    }
    const cpfDigits = onlyDigits(cpf)
    if (!isValidCpf(cpfDigits)) {
      setError('CPF inválido. Confira os 11 dígitos.')
      return
    }
    const phoneDigits = phone.trim() ? normalizePhone(phone) : ''
    if (phoneDigits && !isValidPhone(phoneDigits)) {
      setError('Telefone inválido. Use DDD + número (10 ou 11 dígitos).')
      return
    }
    setSubmitting(true)
    try {
      await signUp({
        email,
        password,
        firstName,
        lastName,
        username: username || undefined,
        phone: phoneDigits || undefined,
        cpf: cpfDigits,
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
    <Container className="py-8">
      <div className="mx-auto grid max-w-[1050px] grid-cols-1 gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="py-4 lg:py-10">
          <h1 className="mt-0 text-[36px] leading-tight font-black lg:text-[44px]">
            Crie sua conta FAL
          </h1>
          <p className="text-[17px] text-fal-muted">
            Crie sua conta com nome, e-mail, CPF e senha. Você já pode navegar na loja; confirme o
            e-mail quando receber a mensagem.
          </p>
          {!isConfigured ? (
            <p className="mt-4 rounded-[10px] border border-[#f0d979] bg-[#fff8db] p-3 text-sm">
              Cadastro indisponível no momento. Tente novamente mais tarde.
            </p>
          ) : null}
        </div>

        <div className="overflow-hidden rounded-fal border border-fal-line bg-white">
          <div className="grid grid-cols-2 border-b border-fal-line">
            <Link to="/login" className="px-4 py-4 text-center font-extrabold hover:bg-[#fafbfc]">
              Entrar
            </Link>
            <span className="bg-[#fafbfc] px-4 py-4 text-center font-extrabold shadow-[inset_0_-3px_var(--fal-yellow)]">
              Criar conta grátis
            </span>
          </div>
          <form className="p-5 sm:p-7" onSubmit={onSubmit}>
            <h2 className="mt-0 text-xl font-extrabold">Criar conta</h2>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                label="Nome"
                name="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
              <Input
                label="Sobrenome"
                name="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
              <div className="sm:col-span-2">
                <Input
                  label="E-mail"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Input
                label="CPF"
                name="cpf"
                inputMode="numeric"
                autoComplete="off"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={(e) => setCpf(formatCpfMask(e.target.value))}
                required
              />
              <Input
                label="Telefone / WhatsApp"
                name="phone"
                inputMode="tel"
                autoComplete="tel"
                placeholder="(11) 99999-9999"
                value={phone}
                onChange={(e) => setPhone(formatPhoneMask(e.target.value))}
              />
              <Input
                label="Usuário (opcional)"
                name="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                hint="Opcional. Você também pode entrar com o e-mail."
              />
              <Input
                label="Senha"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Input
                label="Confirmar senha"
                name="password2"
                type="password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                required
              />
            </div>
            <label className="mt-4 flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={terms}
                onChange={(e) => setTerms(e.target.checked)}
              />
              Li e aceito os termos de uso e a política de privacidade.
            </label>
            {error ? <p className="mt-3 text-sm text-fal-danger">{error}</p> : null}
            <Button type="submit" variant="primary" fullWidth className="mt-4" disabled={submitting}>
              {submitting ? 'Criando…' : 'Criar conta'}
            </Button>
          </form>
        </div>
      </div>
    </Container>
  )
}
