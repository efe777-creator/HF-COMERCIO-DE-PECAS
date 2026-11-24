import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Container } from '@/components/layout/Container'
import { createLead } from '@/services/leads/leadService'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

const BUSINESS_TYPES = [
  'Oficina',
  'Autocenter',
  'Loja de autopeças',
  'Distribuidor',
  'Revendedor',
  'Outro',
] as const

export function SejaParceiroPage() {
  const [contactName, setContactName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [document, setDocument] = useState('')
  const [businessType, setBusinessType] = useState<string>(BUSINESS_TYPES[0])
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [consent, setConsent] = useState(false)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!consent) {
      setError('É necessário consentir o tratamento dos dados.')
      return
    }
    setSaving(true)
    try {
      await createLead({
        kind: 'partner',
        contactName,
        companyName,
        document,
        contactPhone: phone,
        contactEmail: email,
        city,
        state,
        businessType,
        message,
        source: 'seja-parceiro',
      })
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao enviar')
    } finally {
      setSaving(false)
    }
  }

  if (done) {
    return (
      <Container className="py-10">
        <h1 className="text-3xl font-black text-hf-ink">Cadastro recebido</h1>
        <p className="mt-3 text-sm text-hf-muted">
          A HF analisará o contato. Não há aprovação automática de parceria.
        </p>
        <Link to="/" className="mt-6 inline-block text-sm font-semibold text-hf-red-bright">
          Voltar à home →
        </Link>
      </Container>
    )
  }

  return (
    <Container className="py-10 max-w-xl">
      <h1 className="text-3xl font-black text-hf-ink">Seja parceiro HF</h1>
      <p className="mt-2 text-sm text-hf-muted">
        Oficinas, autocenters, lojas e distribuidores. Seu cadastro fica com status pendente até a
        HF analisar.
      </p>
      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <Input label="Responsável *" value={contactName} onChange={(e) => setContactName(e.target.value)} required />
        <Input label="Empresa *" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
        <Input label="CNPJ" value={document} onChange={(e) => setDocument(e.target.value)} />
        <label className="block text-sm font-semibold text-hf-ink">
          Tipo de negócio *
          <select
            className="mt-1 w-full rounded-[10px] border border-hf-line bg-hf-surface px-3 py-2 text-sm"
            value={businessType}
            onChange={(e) => setBusinessType(e.target.value)}
          >
            {BUSINESS_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <Input label="Cidade" value={city} onChange={(e) => setCity(e.target.value)} />
          <Input label="UF" value={state} onChange={(e) => setState(e.target.value)} />
        </div>
        <Input label="Telefone / WhatsApp *" value={phone} onChange={(e) => setPhone(e.target.value)} required />
        <Input label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <label className="block text-sm font-semibold text-hf-ink">
          Interesse / observações
          <textarea
            className="mt-1 w-full rounded-[10px] border border-hf-line bg-hf-surface px-3 py-2 text-sm"
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </label>
        <label className="flex items-start gap-2 text-sm text-hf-muted">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" />
          <span>
            Concordo com o tratamento dos dados conforme a{' '}
            <Link to="/privacidade" className="font-semibold text-hf-red-bright">
              política de privacidade
            </Link>
            .
          </span>
        </label>
        {error ? <p className="text-sm text-hf-red">{error}</p> : null}
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? 'Enviando…' : 'Enviar cadastro'}
        </Button>
      </form>
    </Container>
  )
}
