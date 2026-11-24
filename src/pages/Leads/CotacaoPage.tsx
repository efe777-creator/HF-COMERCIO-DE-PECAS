import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Container } from '@/components/layout/Container'
import { WhatsAppButton } from '@/components/common/WhatsAppButton'
import { createLead } from '@/services/leads/leadService'
import { buildHomeWhatsAppMessage } from '@/lib/whatsapp'
import { useMemo, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

export function CotacaoPage() {
  const [params] = useSearchParams()
  const skuParam = params.get('sku') ?? ''
  const nameParam = params.get('name') ?? ''
  const productId = params.get('productId') ?? ''

  const [contactName, setContactName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [sku, setSku] = useState(skuParam)
  const [productName, setProductName] = useState(nameParam)
  const [qty, setQty] = useState('1')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [doneId, setDoneId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const waMsg = useMemo(() => {
    const bits = [
      'Solicitação de cotação HF',
      sku ? `SKU: ${sku}` : '',
      productName ? `Peça: ${productName}` : '',
      qty ? `Qtd: ${qty}` : '',
      contactName ? `Contato: ${contactName}` : '',
      companyName ? `Empresa: ${companyName}` : '',
    ].filter(Boolean)
    return bits.join('\n') || buildHomeWhatsAppMessage()
  }, [sku, productName, qty, contactName, companyName])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const { id } = await createLead({
        kind: 'quote',
        contactName,
        contactEmail: email,
        contactPhone: phone,
        companyName,
        message,
        source: 'cotacao',
        items: [
          {
            productId: productId || null,
            skuSnapshot: sku || null,
            nameSnapshot: productName || null,
            quantity: Number(qty) || 1,
          },
        ],
      })
      setDoneId(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao enviar cotação')
    } finally {
      setSaving(false)
    }
  }

  if (doneId) {
    return (
      <Container className="py-10">
        <h1 className="text-3xl font-black text-hf-ink">Cotação enviada</h1>
        <p className="mt-3 text-sm text-hf-muted">
          Registramos sua solicitação. A HF entrará em contato. Protocolo: {doneId.slice(0, 8)}…
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <WhatsAppButton message={waMsg}>Continuar no WhatsApp</WhatsAppButton>
          <Link to="/catalogo">
            <Button variant="outline">Voltar ao catálogo</Button>
          </Link>
        </div>
      </Container>
    )
  }

  return (
    <Container className="py-10 max-w-xl">
      <h1 className="text-3xl font-black text-hf-ink">Solicitar cotação</h1>
      <p className="mt-2 text-sm text-hf-muted">
        Sem preço público e sem pedido online. Sua solicitação é registrada para o time comercial.
      </p>
      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <Input label="Nome *" value={contactName} onChange={(e) => setContactName(e.target.value)} required />
        <Input label="Empresa" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
        <Input label="Telefone / WhatsApp *" value={phone} onChange={(e) => setPhone(e.target.value)} required />
        <Input label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input label="SKU / código" value={sku} onChange={(e) => setSku(e.target.value)} />
        <Input label="Peça" value={productName} onChange={(e) => setProductName(e.target.value)} />
        <Input label="Quantidade" value={qty} onChange={(e) => setQty(e.target.value)} />
        <label className="block text-sm font-semibold text-hf-ink">
          Observações
          <textarea
            className="mt-1 w-full rounded-[10px] border border-hf-line bg-hf-surface px-3 py-2 text-sm"
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </label>
        {error ? <p className="text-sm text-hf-red">{error}</p> : null}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Enviando…' : 'Enviar cotação'}
          </Button>
          <WhatsAppButton message={waMsg}>WhatsApp</WhatsAppButton>
        </div>
      </form>
    </Container>
  )
}
