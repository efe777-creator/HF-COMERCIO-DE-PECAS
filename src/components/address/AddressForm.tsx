import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { BRAZILIAN_STATES } from '@/lib/brazilianStates'
import {
  formatCepMask,
  isCompleteCep,
  lookupCep,
  normalizeCep,
} from '@/services/address/addressLookupService'
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'

export type AddressFormValues = {
  label: string
  recipient: string
  street: string
  number: string
  complement: string
  reference: string
  district: string
  city: string
  state: string
  postalCode: string
  isDefault: boolean
}

export const emptyAddressForm: AddressFormValues = {
  label: '',
  recipient: '',
  street: '',
  number: '',
  complement: '',
  reference: '',
  district: '',
  city: '',
  state: '',
  postalCode: '',
  isDefault: false,
}

type Props = {
  initial?: Partial<AddressFormValues>
  submitLabel?: string
  showCancel?: boolean
  onCancel?: () => void
  onSubmit: (values: AddressFormValues) => Promise<void> | void
}

export function AddressForm({
  initial,
  submitLabel = 'Salvar endereço',
  showCancel,
  onCancel,
  onSubmit,
}: Props) {
  const initialCep = normalizeCep(initial?.postalCode ?? '')
  const [form, setForm] = useState<AddressFormValues>({
    ...emptyAddressForm,
    ...initial,
    postalCode: formatCepMask(initial?.postalCode ?? ''),
    state: (initial?.state ?? '').toUpperCase().slice(0, 2),
  })
  const [cepStatus, setCepStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>(() =>
    initialCep.length === 8 ? 'ok' : 'idle',
  )
  const [cepMessage, setCepMessage] = useState<string | null>(() =>
    initialCep.length === 8 ? 'CEP carregado. Altere para buscar novamente.' : null,
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const consultedCep = useRef(initialCep.length === 8 ? initialCep : '')
  const requestId = useRef(0)
  const numberRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const digits = normalizeCep(form.postalCode)

    if (digits.length < 8) {
      setCepStatus((s) => (s === 'loading' ? 'idle' : s))
      return
    }

    // Já consultamos este CEP (inclui edição)
    if (digits === consultedCep.current) return

    const id = ++requestId.current
    let cancelled = false

    const timer = window.setTimeout(() => {
      void (async () => {
        setCepStatus('loading')
        setCepMessage('Buscando endereço…')

        const result = await lookupCep(digits)
        if (cancelled || id !== requestId.current) return

        consultedCep.current = digits

        if (result.ok) {
          setForm((prev) => ({
            ...prev,
            postalCode: formatCepMask(result.data.cep),
            street: result.data.street,
            district: result.data.district,
            city: result.data.city,
            state: result.data.state,
          }))
          setCepStatus('ok')
          setCepMessage('Endereço encontrado. Informe o número.')
          window.setTimeout(() => numberRef.current?.focus(), 80)
          return
        }

        setCepStatus('error')
        if (result.code === 'not_found') {
          setCepMessage(
            'Não encontramos esse CEP. Verifique o número ou preencha o endereço manualmente.',
          )
        } else if (result.code === 'unavailable') {
          setCepMessage(
            'Não foi possível consultar o CEP agora. Você pode preencher o endereço manualmente.',
          )
        } else {
          setCepMessage(result.message)
        }
      })()
    }, 350)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [form.postalCode])

  /** Enter em campos (ex.: Número após autofill do CEP) não deve salvar o endereço. */
  function handleFormKeyDown(e: KeyboardEvent<HTMLFormElement>) {
    if (e.key !== 'Enter') return
    const target = e.target as HTMLElement
    if (target.tagName === 'TEXTAREA') return
    if (target.tagName === 'BUTTON') return
    e.preventDefault()
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!isCompleteCep(form.postalCode)) {
      setError('Informe um CEP válido com 8 dígitos.')
      return
    }
    if (!form.street.trim()) {
      setError('Endereço (logradouro) é obrigatório.')
      return
    }
    if (!form.number.trim()) {
      setError('Número é obrigatório.')
      return
    }
    if (!form.district.trim()) {
      setError('Bairro é obrigatório.')
      return
    }
    if (!form.city.trim()) {
      setError('Cidade é obrigatória.')
      return
    }
    if (!form.state.trim() || form.state.length !== 2) {
      setError('Selecione o estado (UF).')
      return
    }
    if (!form.recipient.trim()) {
      setError('Informe o destinatário.')
      return
    }
    setSaving(true)
    try {
      await onSubmit({
        ...form,
        postalCode: normalizeCep(form.postalCode),
        state: form.state.trim().toUpperCase().slice(0, 2),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar endereço')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      onKeyDown={handleFormKeyDown}
      className="grid gap-3 sm:grid-cols-2"
    >
      <div className="sm:col-span-2">
        <Input
          label="CEP"
          name="postalCode"
          inputMode="numeric"
          autoComplete="postal-code"
          placeholder="00000-000"
          value={form.postalCode}
          onChange={(e) => {
            const next = formatCepMask(e.target.value)
            const digits = normalizeCep(next)
            const prevDigits = normalizeCep(form.postalCode)

            // Usuário mudou o CEP consultado → permite nova busca e limpa derivados
            if (consultedCep.current && digits !== consultedCep.current) {
              consultedCep.current = ''
              setForm((prev) => ({
                ...prev,
                postalCode: next,
                ...(digits.length === 8 || prevDigits.length === 8
                  ? { street: '', district: '', city: '', state: '' }
                  : null),
              }))
              setCepStatus('idle')
              setCepMessage(null)
              return
            }

            setForm((prev) => ({ ...prev, postalCode: next }))
          }}
          required
        />
        {cepMessage ? (
          <p
            className={[
              'mt-1 text-xs',
              cepStatus === 'error' ? 'text-fal-danger' : '',
              cepStatus === 'ok' ? 'text-fal-success' : '',
              cepStatus === 'loading' || cepStatus === 'idle' ? 'text-fal-muted' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-live="polite"
          >
            {cepStatus === 'ok' ? '✓ ' : null}
            {cepMessage}
          </p>
        ) : null}
      </div>

      <div className="sm:col-span-2">
        <Input
          label="Endereço"
          name="street"
          autoComplete="street-address"
          value={form.street}
          onChange={(e) => setForm((prev) => ({ ...prev, street: e.target.value }))}
          required
        />
      </div>

      <Input
        ref={numberRef}
        label="Número"
        name="number"
        autoComplete="address-line2"
        value={form.number}
        onChange={(e) => setForm((prev) => ({ ...prev, number: e.target.value }))}
        required
      />
      <Input
        label="Complemento (opcional)"
        name="complement"
        autoComplete="address-line3"
        placeholder="Apartamento, bloco, sala…"
        value={form.complement}
        onChange={(e) => setForm((prev) => ({ ...prev, complement: e.target.value }))}
      />

      <Input
        label="Bairro"
        name="district"
        autoComplete="address-level3"
        value={form.district}
        onChange={(e) => setForm((prev) => ({ ...prev, district: e.target.value }))}
        required
      />
      <Input
        label="Cidade"
        name="city"
        autoComplete="address-level2"
        value={form.city}
        onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
        required
      />

      <label className="block text-sm sm:col-span-2">
        <span className="mb-1 block text-xs font-extrabold text-fal-muted">Estado</span>
        <select
          className="w-full rounded-[9px] border border-fal-line bg-white px-3 py-3 outline-none focus:border-fal-yellow-dark focus:shadow-[0_0_0_3px_rgba(242,200,75,0.2)]"
          name="state"
          autoComplete="address-level1"
          value={form.state}
          onChange={(e) => setForm((prev) => ({ ...prev, state: e.target.value }))}
          required
        >
          <option value="">Selecione a UF</option>
          {BRAZILIAN_STATES.map((s) => (
            <option key={s.uf} value={s.uf}>
              {s.name} ({s.uf})
            </option>
          ))}
        </select>
      </label>

      <div className="sm:col-span-2">
        <Input
          label="Ponto de referência (opcional)"
          name="reference"
          placeholder="Próximo ao shopping"
          value={form.reference}
          onChange={(e) => setForm((prev) => ({ ...prev, reference: e.target.value }))}
        />
      </div>

      <Input
        label="Nome do endereço"
        name="label"
        placeholder="Casa, Trabalho, Oficina…"
        value={form.label}
        onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
      />
      <Input
        label="Destinatário"
        name="recipient"
        autoComplete="name"
        value={form.recipient}
        onChange={(e) => setForm((prev) => ({ ...prev, recipient: e.target.value }))}
        required
      />

      <label className="flex items-center gap-2 text-sm font-semibold sm:col-span-2">
        <input
          type="checkbox"
          checked={form.isDefault}
          onChange={(e) => setForm((prev) => ({ ...prev, isDefault: e.target.checked }))}
        />
        Usar como endereço padrão
      </label>

      {error ? <p className="text-sm text-fal-danger sm:col-span-2">{error}</p> : null}

      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <Button type="submit" disabled={saving}>
          {saving ? 'Salvando…' : submitLabel}
        </Button>
        {showCancel ? (
          <Button type="button" variant="light" onClick={onCancel}>
            Cancelar
          </Button>
        ) : null}
      </div>
    </form>
  )
}
