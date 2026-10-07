import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { useAuth } from '@/contexts/AuthContext'
import { formatCnpjMask } from '@/lib/document'
import { formatPhoneMask, isValidPhone, normalizePhone } from '@/lib/phone'
import { getCustomerProfile, updateCustomerProfile } from '@/services/customers/customerService'
import { useEffect, useState, type FormEvent } from 'react'

export function AccountProfilePage() {
  const { user, session } = useAuth()
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [companyName, setCompanyName] = useState<string | null>(null)
  const [companyCnpj, setCompanyCnpj] = useState<string | null>(null)
  const [companyStatus, setCompanyStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    void (async () => {
      setLoading(true)
      try {
        const { profile } = await getCustomerProfile(user.id)
        setFullName(profile.fullName ?? '')
        setPhone(profile.phone ? formatPhoneMask(profile.phone) : '')
        setCompanyName(profile.customerLegalName ?? null)
        setCompanyCnpj(profile.cnpj ? formatCnpjMask(profile.cnpj) : null)
        setCompanyStatus(profile.customerStatus ?? null)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao carregar perfil')
      } finally {
        setLoading(false)
      }
    })()
  }, [user])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user) return
    setError(null)
    setMessage(null)

    const phoneDigits = phone.trim() ? normalizePhone(phone) : ''
    if (phoneDigits && !isValidPhone(phoneDigits)) {
      setError('Telefone inválido. Use DDD + número (10 ou 11 dígitos).')
      return
    }

    setSaving(true)
    try {
      await updateCustomerProfile({
        userId: user.id,
        fullName,
        phone: phoneDigits || null,
      })
      setMessage('Dados salvos com sucesso.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loading label="Carregando perfil…" />

  return (
    <div className="rounded-hf border border-hf-line bg-hf-surface p-5">
      <h2 className="mt-0 text-xl font-extrabold">Perfil</h2>
      <p className="text-sm text-hf-muted">
        Dados do usuário. A empresa B2B é vinculada pela HF (não editável aqui).
      </p>
      {error ? <p className="text-sm text-hf-danger">{error}</p> : null}
      {message ? <p className="text-sm font-semibold text-hf-ink">{message}</p> : null}

      <div className="mt-4 rounded-[10px] border border-hf-line bg-hf-bg p-3 text-sm">
        <p className="m-0 font-semibold text-hf-ink">Empresa vinculada</p>
        {companyName ? (
          <>
            <p className="mb-0 mt-1">{companyName}</p>
            <p className="mb-0 mt-0.5 text-xs text-hf-muted">
              {companyCnpj ?? 'CNPJ não informado'} · status: {companyStatus ?? '—'}
            </p>
          </>
        ) : (
          <p className="mb-0 mt-1 text-hf-muted">
            Nenhuma empresa ativa vinculada. Solicite o vínculo à HF após o cadastro.
          </p>
        )}
      </div>

      <form onSubmit={onSubmit} className="mt-4 grid max-w-xl gap-3">
        <Input label="Nome completo" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        <Input label="E-mail" value={session?.user?.email ?? user?.email ?? ''} disabled />
        <Input
          label="Telefone"
          inputMode="tel"
          autoComplete="tel"
          placeholder="(11) 99999-9999"
          value={phone}
          onChange={(e) => setPhone(formatPhoneMask(e.target.value))}
        />
        <Button type="submit" disabled={saving}>
          {saving ? 'Salvando…' : 'Salvar'}
        </Button>
      </form>
    </div>
  )
}
