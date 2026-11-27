import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { WhatsAppButton } from '@/components/common/WhatsAppButton'
import { Container } from '@/components/layout/Container'
import { PaymentConditionsNotice } from '@/components/payment/PaymentConditionsNotice'
import { useAuth } from '@/contexts/AuthContext'
import { formatMoney } from '@/lib/money'
import {
  addToQuoteBasket,
  clearQuoteBasket,
  readQuoteBasket,
  removeFromQuoteBasket,
  replaceQuoteBasketWithItem,
  setQuoteBasketItemQuantity,
  type QuoteBasketItem,
} from '@/lib/quoteBasket'
import { buildQuoteRomaneioMessage } from '@/lib/quoteRomaneio'
import { storeWhatsAppHref, whatsAppHref } from '@/lib/whatsapp'
import {
  listActiveSellersPublic,
  type PublicSeller,
} from '@/services/admin/adminSellerService'
import { emitQuoteNotifications } from '@/services/communication/communicationService'
import { createLead } from '@/services/leads/leadService'
import { attachResolvedPrices } from '@/services/pricing/priceResolutionService'
import type { Product } from '@/types'
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

type LineView = QuoteBasketItem & {
  unitPrice: number | null
  priceVisible: boolean
}

export function CotacaoPage() {
  const { user } = useAuth()
  const [params] = useSearchParams()
  const b2bActive = Boolean(user?.customerId && user.customerStatus === 'active')

  const [items, setItems] = useState<QuoteBasketItem[]>(() => readQuoteBasket().items)
  const [lines, setLines] = useState<LineView[]>([])
  const [pricesLoading, setPricesLoading] = useState(false)

  const [contactName, setContactName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [doneId, setDoneId] = useState<string | null>(null)
  const [romaneio, setRomaneio] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [seeded, setSeeded] = useState(false)
  const [sellers, setSellers] = useState<PublicSeller[]>([])
  const [sellerId, setSellerId] = useState('')
  const [complementOpen, setComplementOpen] = useState(false)

  useEffect(() => {
    void listActiveSellersPublic()
      .then(setSellers)
      .catch(() => setSellers([]))
  }, [])

  useEffect(() => {
    if (seeded) return
    const productId = params.get('productId') ?? ''
    const sku = params.get('sku') ?? ''
    const name = params.get('name') ?? ''
    const only = params.get('only') === '1'
    if (productId || sku || name) {
      const payload = {
        productId: productId || sku || name,
        sku: sku || productId,
        name: name || sku || productId,
        quantity: 1,
      }
      if (only) replaceQuoteBasketWithItem(payload)
      else addToQuoteBasket(payload)
    }
    setItems(readQuoteBasket().items)
    setSeeded(true)
  }, [params, seeded])

  useEffect(() => {
    if (!user) return
    setContactName((v) => v || user.fullName || '')
    setEmail((v) => v || user.email || '')
    setPhone((v) => v || user.phone || '')
    setCompanyName((v) => v || user.customerLegalName || '')
  }, [user])

  const refreshPrices = useCallback(
    async (basketItems: QuoteBasketItem[]) => {
      if (!basketItems.length) {
        setLines([])
        return
      }
      if (!b2bActive) {
        setLines(
          basketItems.map((i) => ({
            ...i,
            unitPrice: null,
            priceVisible: false,
          })),
        )
        return
      }
      setPricesLoading(true)
      try {
        const stubs = basketItems.map(
          (i) =>
            ({
              id: i.productId,
              sku: i.sku,
              name: i.name,
              price: 0,
            }) as Product,
        )
        const priced = await attachResolvedPrices(stubs)
        const byId = new Map(priced.map((p) => [p.id, p]))
        setLines(
          basketItems.map((i) => {
            const p = byId.get(i.productId)
            const visible = Boolean(p?.priceVisible)
            return {
              ...i,
              unitPrice: visible ? (p?.resolvedPrice ?? p?.price ?? null) : null,
              priceVisible: visible,
            }
          }),
        )
      } catch {
        setLines(
          basketItems.map((i) => ({
            ...i,
            unitPrice: null,
            priceVisible: false,
          })),
        )
      } finally {
        setPricesLoading(false)
      }
    },
    [b2bActive],
  )

  useEffect(() => {
    void refreshPrices(items)
  }, [items, refreshPrices])

  function syncBasket(next: QuoteBasketItem[]) {
    setItems(next)
  }

  function changeQty(productId: string, quantity: number) {
    syncBasket(setQuoteBasketItemQuantity(productId, quantity).items)
  }

  function removeItem(productId: string) {
    syncBasket(removeFromQuoteBasket(productId).items)
  }

  const subtotal = useMemo(() => {
    if (!lines.some((l) => l.priceVisible && l.unitPrice != null)) return null
    return lines.reduce((sum, l) => {
      if (!l.priceVisible || l.unitPrice == null) return sum
      return sum + l.unitPrice * l.quantity
    }, 0)
  }, [lines])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!items.length) {
      setError('Adicione ao menos um item à cotação.')
      return
    }
    const needsComplement = !contactName.trim() || !phone.trim()
    if (needsComplement) {
      setComplementOpen(true)
      setError('Complete nome e telefone para enviar.')
      return
    }
    setSaving(true)
    try {
      const selected = sellers.find((s) => s.id === sellerId) ?? null
      const forwardedAt = selected ? new Date().toISOString() : null
      const { id } = await createLead({
        kind: 'quote',
        contactName,
        contactEmail: email,
        contactPhone: phone,
        companyName,
        message,
        source: 'cotacao-cesta',
        customerId: user?.customerId ?? null,
        recipientSellerId: selected?.id ?? null,
        forwardedAt,
        items: items.map((i) => ({
          productId: i.productId || null,
          skuSnapshot: i.sku || null,
          nameSnapshot: i.name || null,
          quantity: i.quantity,
        })),
      })

      const msg = buildQuoteRomaneioMessage({
        protocolId: id,
        companyName,
        contactName,
        lines: lines.map((l) => ({
          productId: l.productId,
          sku: l.sku,
          name: l.name,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          priceVisible: l.priceVisible,
        })),
        conditionsSummary: b2bActive
          ? 'Condições da sua conta (ver site)'
          : 'Condições sob consulta',
        catalogUrl:
          typeof window !== 'undefined' ? `${window.location.origin}/catalogo` : null,
      })

      try {
        await emitQuoteNotifications({
          leadId: id,
          customerId: user?.customerId ?? null,
          profileId: user?.id ?? null,
          companyLabel: companyName || user?.customerLegalName || null,
          itemCount: items.length,
        })
      } catch {
        // lead já salvo
      }

      clearQuoteBasket()
      setItems([])
      setDoneId(id)
      setRomaneio(msg)
      setComplementOpen(false)

      const sellerPhone = selected?.whatsapp?.replace(/\D/g, '') || ''
      const href = sellerPhone ? whatsAppHref(sellerPhone, msg) : storeWhatsAppHref(msg)
      if (href) window.open(href, '_blank', 'noopener,noreferrer')
    } catch (err) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message).trim()
          : ''
      setError(msg || 'Falha ao enviar cotação')
    } finally {
      setSaving(false)
    }
  }

  function startNewQuote() {
    setDoneId(null)
    setRomaneio('')
    setError(null)
    setItems(readQuoteBasket().items)
  }

  const pagePadClass =
    'py-10 pb-[calc(2.5rem+56px+env(safe-area-inset-bottom,0px))] md:pb-10'

  if (doneId) {
    return (
      <Container className={pagePadClass}>
        <h1 className="text-3xl font-black text-hf-ink">Cotação enviada</h1>
        <p className="mt-3 text-sm text-hf-muted">
          Registramos sua solicitação. A HF entrará em contato. Protocolo:{' '}
          {doneId.slice(0, 8)}…
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <WhatsAppButton message={romaneio}>Abrir romaneio no WhatsApp</WhatsAppButton>
          <Link to="/catalogo">
            <Button variant="outline">Voltar ao catálogo</Button>
          </Link>
          <Button type="button" variant="outline" onClick={startNewQuote}>
            Nova cotação
          </Button>
        </div>
      </Container>
    )
  }

  return (
    <Container className={`max-w-2xl ${pagePadClass}`} data-cotacao-cesta>
      <h1 className="text-3xl font-black text-hf-ink">Cotação</h1>
      <p className="mt-2 text-sm text-hf-muted">
        Monte a cesta com um ou mais itens, revise quantidades e envie ao time comercial.
        Não há checkout neste momento.
      </p>

      <section className="mt-6 rounded-hf border border-hf-line bg-hf-surface p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="m-0 text-base font-extrabold">Itens</h2>
          <Link to="/catalogo" className="text-sm font-semibold text-hf-red hover:underline">
            Continuar no catálogo
          </Link>
        </div>

        {!items.length ? (
          <p className="mt-3 mb-0 text-sm text-hf-muted">
            Cesta vazia. No card ou na ficha use <strong>Adicionar à cotação</strong>.
          </p>
        ) : (
          <ul className="mt-3 mb-0 list-none space-y-3 p-0">
            {items.map((item) => {
              const line = lines.find((l) => l.productId === item.productId)
              return (
                <li
                  key={item.productId}
                  className="rounded-[12px] border border-hf-line bg-hf-bg p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="m-0 font-extrabold text-hf-ink">{item.name}</p>
                      <p className="mb-0 mt-0.5 text-xs text-hf-muted">{item.sku}</p>
                    </div>
                    <button
                      type="button"
                      className="text-xs font-semibold text-hf-muted hover:text-hf-red"
                      onClick={() => removeItem(item.productId)}
                    >
                      Remover
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 text-sm">
                      Qtd
                      <input
                        type="number"
                        min={1}
                        className="w-20 rounded-[8px] border border-hf-line bg-hf-surface px-2 py-1"
                        value={item.quantity}
                        onChange={(e) => changeQty(item.productId, Number(e.target.value) || 1)}
                      />
                    </label>
                    {pricesLoading ? (
                      <span className="text-xs text-hf-muted">Preço…</span>
                    ) : line?.priceVisible && line.unitPrice != null ? (
                      <span className="text-sm font-extrabold">
                        {formatMoney(line.unitPrice)}
                        <span className="ml-1 text-xs font-semibold text-hf-muted">
                          · lista B2B
                        </span>
                      </span>
                    ) : (
                      <span className="text-sm font-semibold text-hf-muted">Consultar</span>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {subtotal != null ? (
          <p className="mt-3 mb-0 text-sm font-extrabold">
            Subtotal informativo: {formatMoney(subtotal)}
          </p>
        ) : null}
      </section>

      <div className="mt-4">
        {b2bActive ? (
          <PaymentConditionsNotice
            audience="customer"
            customerId={user?.customerId}
          />
        ) : (
          <PaymentConditionsNotice audience="guest" />
        )}
      </div>

      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <Input
          label="Nome *"
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          required
        />
        <Input
          label="Empresa"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
        />
        <Input
          label="Telefone / WhatsApp *"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
        <Input
          label="E-mail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {sellers.length > 0 ? (
          <label className="block text-sm font-semibold text-hf-ink">
            Vendedor preferencial (opcional)
            <select
              className="mt-1 w-full rounded-[10px] border border-hf-line bg-hf-surface px-3 py-2 text-sm"
              value={sellerId}
              onChange={(e) => setSellerId(e.target.value)}
            >
              <option value="">Loja HF (padrão)</option>
              {sellers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="block text-sm font-semibold text-hf-ink">
          Observações
          <textarea
            className="mt-1 w-full rounded-[10px] border border-hf-line bg-hf-surface px-3 py-2 text-sm"
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </label>
        {complementOpen ? (
          <p className="m-0 rounded-[10px] border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Complete seus dados de contato acima para finalizar o envio.
          </p>
        ) : null}
        {error ? <p className="text-sm text-hf-red">{error}</p> : null}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button type="submit" variant="primary" disabled={saving || !items.length}>
            {saving ? 'Enviando…' : 'Enviar cotação'}
          </Button>
          <Link to="/catalogo">
            <Button type="button" variant="outline">
              Catálogo
            </Button>
          </Link>
        </div>
        {saving ? (
          <div className="pt-2">
            <Loading />
          </div>
        ) : null}
      </form>
    </Container>
  )
}
