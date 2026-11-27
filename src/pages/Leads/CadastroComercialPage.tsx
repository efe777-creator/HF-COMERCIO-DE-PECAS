import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Container } from '@/components/layout/Container'
import { PaymentConditionsNotice } from '@/components/payment/PaymentConditionsNotice'
import { onlyDigits } from '@/lib/cnpj'
import { readStoredUtmAttribution } from '@/lib/utmAttribution'
import { emitRequestReceivedNotification } from '@/services/communication/communicationService'
import { createLead } from '@/services/leads/leadService'
import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

const BUSINESS_PROFILES = [
  'Oficina',
  'Autocenter',
  'Loja de autopeças',
  'Distribuidor',
  'Revendedor',
  'Outro',
] as const

const INTERESTS = [
  'Catálogo e preços B2B',
  'Parceria comercial',
  'Linha específica',
  'Outro',
] as const

export function CadastroComercialPage() {
  const [contactName, setContactName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [document, setDocument] = useState('')
  const [businessProfile, setBusinessProfile] = useState<string>(BUSINESS_PROFILES[0])
  const [interest, setInterest] = useState<string>(INTERESTS[0])
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [consent, setConsent] = useState(false)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cnpjOk = useMemo(() => onlyDigits(document).length === 14, [document])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!consent) {
      setError('É necessário consentir o tratamento dos dados.')
      return
    }
    if (!cnpjOk) {
      setError('CNPJ é obrigatório (14 dígitos).')
      return
    }
    setSaving(true)
    try {
      const attribution = readStoredUtmAttribution()
      const { id } = await createLead({
        kind: 'partner',
        contactName,
        companyName,
        document: onlyDigits(document),
        contactPhone: phone,
        contactEmail: email,
        city,
        state,
        businessProfile,
        interest,
        message,
        source: 'cadastro-comercial',
        attribution,
      })
      try {
        await emitRequestReceivedNotification({
          leadId: id,
          companyLabel: companyName,
          document: onlyDigits(document),
        })
      } catch {
        // fail soft — solicitação já na fila
      }
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
        <h1 className="text-3xl font-black text-hf-ink">Solicitação recebida</h1>
        <p className="mt-3 text-sm text-hf-muted">
          A HF analisará o cadastro. Não há aprovação automática.
        </p>
        <Link to="/" className="mt-6 inline-block text-sm font-semibold text-hf-red-bright">
          Voltar à home →
        </Link>
      </Container>
    )
  }

  return (
    <Container className="max-w-xl py-10" data-cadastro-comercial>
      <h1 className="text-3xl font-black text-hf-ink">Cadastro comercial HF</h1>
      <p className="mt-2 text-sm text-hf-muted">
        Oficinas, autocenters, lojas e distribuidores. Status pendente até a HF analisar.
      </p>
      <PaymentConditionsNotice audience="guest" className="mt-4" />
      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <Input
          label="Responsável *"
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          required
        />
        <Input
          label="Empresa *"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          required
        />
        <Input
          label="CNPJ *"
          value={document}
          onChange={(e) => setDocument(e.target.value)}
          required
        />
        <label className="block text-sm font-semibold text-hf-ink">
          Perfil comercial *
          <select
            className="mt-1 w-full rounded-[10px] border border-hf-line bg-hf-surface px-3 py-2 text-sm"
            value={businessProfile}
            onChange={(e) => setBusinessProfile(e.target.value)}
          >
            {BUSINESS_PROFILES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold text-hf-ink">
          Interesse *
          <select
            className="mt-1 w-full rounded-[10px] border border-hf-line bg-hf-surface px-3 py-2 text-sm"
            value={interest}
            onChange={(e) => setInterest(e.target.value)}
          >
            {INTERESTS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Cidade" value={city} onChange={(e) => setCity(e.target.value)} />
          <Input label="UF" value={state} onChange={(e) => setState(e.target.value)} />
        </div>
        <Input label="WhatsApp / telefone *" value={phone} onChange={(e) => setPhone(e.target.value)} required />
        <Input label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <label className="block text-sm font-semibold text-hf-ink">
          Mensagem
          <textarea
            className="mt-1 w-full rounded-[10px] border border-hf-line bg-hf-surface px-3 py-2 text-sm"
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </label>
        <label className="flex items-start gap-2 text-sm text-hf-ink">
          <input
            type="checkbox"
            className="mt-1"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          <span>Autorizo o tratamento dos dados para contato comercial da HF.</span>
        </label>
        {error ? <p className="m-0 text-sm text-hf-red">{error}</p> : null}
        <Button type="submit" disabled={saving}>
          {saving ? 'Enviando…' : 'Enviar solicitação'}
        </Button>
      </form>
    </Container>
  )
}
