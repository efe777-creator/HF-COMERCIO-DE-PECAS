import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { useAuth } from '@/contexts/AuthContext'
import {
  formatCnpjMask,
  formatCpfMask,
  isValidCnpj,
  isValidCpf,
  onlyDigits,
} from '@/lib/document'
import { formatPhoneMask, isValidPhone, normalizePhone } from '@/lib/phone'
import { requestAccountDeletion } from '@/services/customers/accountDeletionService'
import { getCustomerProfile, updateCustomerProfile } from '@/services/customers/customerService'
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

export function AccountProfilePage() {
  const { user, session, signOut } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [cpf, setCpf] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
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
        setCpf(profile.cpf ? formatCpfMask(profile.cpf) : '')
        setCnpj(profile.cnpj ? formatCnpjMask(profile.cnpj) : '')
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

    const cpfDigits = cpf.trim() ? onlyDigits(cpf) : ''
    const cnpjDigits = cnpj.trim() ? onlyDigits(cnpj) : ''
    if (cpfDigits && cnpjDigits) {
      setError('Informe CPF ou CNPJ, não ambos.')
      return
    }
    if (cpfDigits && !isValidCpf(cpfDigits)) {
      setError('CPF inválido.')
      return
    }
    if (cnpjDigits && !isValidCnpj(cnpjDigits)) {
      setError('CNPJ inválido.')
      return
    }

    setSaving(true)
    try {
      await updateCustomerProfile({
        userId: user.id,
        fullName,
        phone: phoneDigits || null,
        cpf: cpfDigits || null,
        cnpj: cnpjDigits || null,
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
    <div className="rounded-fal border border-fal-line bg-white p-5">
      <h2 className="mt-0 text-xl font-extrabold">Perfil</h2>
      <p className="text-sm text-fal-muted">E-mail vinculado à autenticação. Role não é editável.</p>
      {error ? <p className="text-sm text-fal-danger">{error}</p> : null}
      {message ? <p className="text-sm font-semibold text-fal-navy">{message}</p> : null}
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
        <Input
          label="CPF (opcional)"
          inputMode="numeric"
          placeholder="000.000.000-00"
          value={cpf}
          onChange={(e) => setCpf(formatCpfMask(e.target.value))}
        />
        <Input
          label="CNPJ (opcional)"
          inputMode="numeric"
          placeholder="00.000.000/0000-00"
          value={cnpj}
          onChange={(e) => setCnpj(formatCnpjMask(e.target.value))}
        />
        <Button type="submit" disabled={saving || deleting}>
          {saving ? 'Salvando…' : 'Salvar'}
        </Button>
      </form>

      <div className="mt-8 border-t border-fal-line pt-5">
        <h3 className="m-0 text-base font-extrabold text-fal-navy">Encerrar conta</h3>
        <p className="mt-1 text-sm text-fal-muted">
          Seus pedidos e histórico comercial são preservados. Dados pessoais de cadastro são
          removidos. Esta ação não pode ser desfeita por você.
        </p>
        <button
          type="button"
          disabled={deleting || saving}
          className="mt-3 rounded-[10px] border border-fal-danger px-4 py-2 text-sm font-bold text-fal-danger hover:bg-red-50 disabled:opacity-50"
          onClick={() => {
            void (async () => {
              const ok = window.confirm(
                'Encerrar sua conta?\n\nPedidos antigos continuam no sistema da loja, mas seus dados de cadastro serão anonimizados.',
              )
              if (!ok) return
              setDeleting(true)
              setError(null)
              try {
                await requestAccountDeletion()
                await signOut()
                navigate('/', { replace: true })
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Não foi possível encerrar a conta')
              } finally {
                setDeleting(false)
              }
            })()
          }}
        >
          {deleting ? 'Encerrando…' : 'Encerrar minha conta'}
        </button>
      </div>
    </div>
  )
}
