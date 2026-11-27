import { Badge } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { Loading } from '@/components/common/Loading'
import { WhatsAppButton } from '@/components/common/WhatsAppButton'
import { Container } from '@/components/layout/Container'
import { PaymentConditionsNotice } from '@/components/payment/PaymentConditionsNotice'
import { PaymentMethodPricesBlock } from '@/components/payment/PaymentMethodPricesBlock'
import { useAuth } from '@/contexts/AuthContext'
import { CompatibilityAppsBlock } from '@/components/product/CompatibilityAppsBlock'
import { CompatibilityStateBadge } from '@/components/product/CompatibilityStateBadge'
import { PdpAccordion } from '@/components/product/PdpAccordion'
import { PdpPurchaseBar } from '@/components/product/PdpPurchaseBar'
import { ProductGallery } from '@/components/product/ProductGallery'
import { features } from '@/config/features'
import { useProductCompatVerdicts } from '@/hooks/useProductCompatVerdicts'
import { toCommercialTitleCase } from '@/lib/entityNormalize'
import {
  joinProductDescription,
  needsDescriptionCollapse,
  truncateDescription,
  buildPdpCatalogFilterLink,
} from '@/lib/productDescription'
import {
  AJUDA_APLICACAO_TEXT,
  APLICACAO_SECTION_LABEL,
  formatReferenciaFromProduct,
  VER_DESCRICAO_COMPLETA_LABEL,
  VER_MAIS_CATALOGO_LABEL,
  VER_MENOS_DESCRICAO_LABEL,
} from '@/lib/productLabels'
import { buildProductSpecRows } from '@/lib/productSpecs'
import { addToQuoteBasket, replaceQuoteBasketWithItem } from '@/lib/quoteBasket'
import { buildNotFoundWhatsAppMessage } from '@/lib/whatsapp'
import { loadCompatibilityGroups } from '@/services/products/compatibilitySummary'
import {
  loadStoreKitComposition,
  type StoreKitComposition,
} from '@/services/products/kitCompositionStoreService'
import { listEquivalentProducts } from '@/services/products/equivalenceLinksService'
import { getProductById } from '@/services/products/productService'
import type { CompatibilityAppGroup, Product, VehicleFilter } from '@/types'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'

export function ProductPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { user } = useAuth()
  const b2bActive = Boolean(user?.customerId && user.customerStatus === 'active')
  const [product, setProduct] = useState<Product | null>(null)
  const [appGroups, setAppGroups] = useState<CompatibilityAppGroup[]>([])
  const [equivalents, setEquivalents] = useState<Product[]>([])
  const [kitComposition, setKitComposition] = useState<StoreKitComposition | null>(null)
  const [loading, setLoading] = useState(true)
  const [descOpen, setDescOpen] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [quoteFlash, setQuoteFlash] = useState(false)

  useEffect(() => {
    let active = true
    void (async () => {
      setLoading(true)
      try {
        const data = id ? await getProductById(id) : null
        if (active) setProduct(data)
        if (active && data?.id) {
          const groupsMap = await loadCompatibilityGroups([data.id])
          if (active) setAppGroups(groupsMap.get(data.id) ?? [])
          const equiv = await listEquivalentProducts(data.id).catch(() => [] as Product[])
          if (active) setEquivalents(equiv)
          if (data.productKind === 'kit') {
            const bom = await loadStoreKitComposition(data.id)
            if (active) setKitComposition(bom)
          } else if (active) {
            setKitComposition(null)
          }
        } else if (active) {
          setAppGroups([])
          setEquivalents([])
          setKitComposition(null)
        }
      } catch {
        if (active) {
          setProduct(null)
          setAppGroups([])
          setEquivalents([])
          setKitComposition(null)
        }
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [id])

  const descriptionFull = useMemo(() => {
    if (!product) return ''
    return joinProductDescription(product.shortDescription ?? '', product.description ?? '')
  }, [product])

  const descriptionNeedsCollapse = needsDescriptionCollapse(descriptionFull)
  const descriptionShown =
    descOpen || !descriptionNeedsCollapse
      ? descriptionFull
      : truncateDescription(descriptionFull)

  const specRows = useMemo(() => (product ? buildProductSpecRows(product) : []), [product])
  const catalogFilter = useMemo(
    () => buildPdpCatalogFilterLink(appGroups.map((g) => g.maker)),
    [appGroups],
  )

  const fitFilter: VehicleFilter | null = useMemo(() => {
    const maker = params.get('maker')?.trim() || ''
    const model = params.get('model')?.trim() || ''
    const year = params.get('year')?.trim() || ''
    const engine = params.get('engine')?.trim() || ''
    const version = params.get('version')?.trim() || ''
    if (!maker && !model && !year && !engine && !version) return null
    return {
      maker: maker || undefined,
      model: model || undefined,
      year: year || undefined,
      engine: engine || undefined,
      version: version || undefined,
    }
  }, [params])

  const productIds = useMemo(() => (product?.id ? [product.id] : []), [product?.id])
  const { verdicts } = useProductCompatVerdicts(productIds, fitFilter)
  const pdpVerdict = product?.id ? verdicts.get(product.id) : undefined

  if (loading) {
    return (
      <Container maxWidth="pdp" className="py-8">
        <Loading />
      </Container>
    )
  }

  if (!product) {
    return (
      <Container maxWidth="pdp" className="py-8">
        <EmptyState
          title="Produto não disponível"
          description="Este item não está no catálogo autorizado da sua empresa ou o link é inválido."
          actionLabel="Ver catálogo"
          actionTo="/catalogo"
        />
        <div className="mt-4 flex justify-center">
          <WhatsAppButton message={buildNotFoundWhatsAppMessage()}>Falar com a HF</WhatsAppButton>
        </div>
      </Container>
    )
  }

  const current = product
  const displayName = toCommercialTitleCase(current.name)
  const categoryHref = current.categorySlug
    ? `/categoria/${encodeURIComponent(current.categorySlug)}`
    : null
  function goBack() {
    if (window.history.length > 1) navigate(-1)
    else navigate('/catalogo')
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setLinkCopied(true)
      window.setTimeout(() => setLinkCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  return (
    <Container maxWidth="pdp" className="py-2 pb-[calc(56px+56px+env(safe-area-inset-bottom))] sm:py-3 lg:pb-8">
      <button
        type="button"
        onClick={goBack}
        className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-hf-ink hover:underline md:hidden"
        aria-label="Voltar"
      >
        ← Voltar
      </button>

      <nav aria-label="Breadcrumb" className="mb-3">
        <ol className="m-0 flex list-none flex-wrap items-center gap-1 p-0 text-[12px] text-hf-muted">
          <li>
            <Link to="/" className="hover:underline">
              Início
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            {current.categoryName ? (
              categoryHref ? (
                <Link to={categoryHref} className="hover:underline">
                  {current.categoryName}
                </Link>
              ) : (
                <span>{current.categoryName}</span>
              )
            ) : (
              <Link to="/catalogo" className="hover:underline">
                Catálogo
              </Link>
            )}
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-hf-ink">{displayName}</li>
        </ol>
      </nav>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,55fr)_minmax(0,45fr)] lg:gap-6">
        {/* Galeria */}
        <div className="order-1 min-w-0">
          <ProductGallery
            images={
              current.images?.length
                ? current.images
                : current.imageUrl
                  ? [current.imageUrl]
                  : []
            }
            alt={displayName}
          />
        </div>

        {/* Buy-box sticky */}
        <div className="order-2 min-w-0 lg:sticky lg:top-20 lg:row-span-2 lg:self-start">
          <div className="flex flex-wrap items-center gap-2">
            {current.productKind === 'kit' ? <Badge>Kit</Badge> : null}
            {current.brand ? (
              <Link
                to={`/catalogo?brand=${encodeURIComponent(current.brand)}`}
                className="inline-flex rounded-hf border border-hf-line bg-hf-surface-2 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-hf-ink hover:border-hf-red/50"
              >
                {toCommercialTitleCase(current.brand)}
              </Link>
            ) : null}
          </div>

          <h1 className="mt-2 text-[22px] font-extrabold leading-tight text-hf-ink sm:text-[26px]">
            {displayName}
          </h1>
          <p className="mt-1 text-sm text-hf-muted">{formatReferenciaFromProduct(current)}</p>

          <p className="mt-3 rounded-hf border border-hf-line bg-hf-bg px-3 py-2 text-xs text-hf-muted">
            {AJUDA_APLICACAO_TEXT}
          </p>

          {b2bActive && current?.id ? (
            <div className="mt-3">
              <PaymentMethodPricesBlock
                productId={current.id}
                customerId={user?.customerId}
                fallbackBasePrice={
                  current.priceVisible || features.price_enabled
                    ? (current.resolvedPrice ?? current.price)
                    : null
                }
              />
            </div>
          ) : (
            <div className="mt-3">
              <PaymentConditionsNotice audience="guest" />
            </div>
          )}

          <div className="mt-4 flex flex-col gap-2">
            {features.quotation_enabled ? (
              <>
                <Button
                  fullWidth
                  variant="primary"
                  type="button"
                  disabled={quoteFlash}
                  onClick={() => {
                    addToQuoteBasket({
                      productId: current.id,
                      sku: current.sku,
                      name: current.name,
                      quantity: 1,
                    })
                    setQuoteFlash(true)
                    window.setTimeout(() => {
                      navigate('/cotacao')
                    }, 450)
                  }}
                >
                  {quoteFlash ? 'Adicionado…' : 'Adicionar à cotação'}
                </Button>
                <Button
                  fullWidth
                  variant="outline"
                  type="button"
                  disabled={quoteFlash}
                  onClick={() => {
                    replaceQuoteBasketWithItem({
                      productId: current.id,
                      sku: current.sku,
                      name: current.name,
                      quantity: 1,
                    })
                    setQuoteFlash(true)
                    window.setTimeout(() => {
                      navigate('/cotacao?only=1')
                    }, 450)
                  }}
                >
                  Cotar só este
                </Button>
              </>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap gap-3 text-sm font-semibold">
            <button
              type="button"
              className="text-hf-muted hover:text-hf-ink hover:underline"
              onClick={() => void copyLink()}
            >
              {linkCopied ? 'Link copiado' : 'Copiar link'}
            </button>
            <a href="#pdp-detalhes" className="text-hf-red hover:underline">
              Ver detalhes ↓
            </a>
          </div>
        </div>

        {/* Acordeões sob a galeria */}
        <div className="order-3 min-w-0 lg:col-start-1">
          <PdpAccordion
            items={[
              ...(current.productKind === 'kit' && kitComposition?.lines.length
                ? [
                    {
                      id: 'kit-bom',
                      title: 'Composição do kit',
                      icon: 'K',
                      defaultOpen: true,
                      children: (
                        <ul className="m-0 space-y-2 p-0 list-none">
                          {kitComposition.lines.map((line) => (
                            <li
                              key={line.componentProductId}
                              className="flex items-center gap-3 border-b border-hf-line py-2 last:border-0"
                            >
                              {line.imageUrl ? (
                                <img
                                  src={line.imageUrl}
                                  alt=""
                                  className="h-12 w-12 rounded object-contain bg-hf-bg"
                                />
                              ) : (
                                <div className="h-12 w-12 rounded bg-hf-bg" />
                              )}
                              <div className="min-w-0 flex-1">
                                <Link
                                  to={`/produto/${line.componentProductId}`}
                                  className="font-semibold text-hf-ink hover:underline"
                                >
                                  {line.name}
                                </Link>
                                <p className="m-0 text-xs text-hf-muted">
                                  {line.sku} · qtd {line.quantity}
                                </p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ),
                    },
                  ]
                : []),
              {
                id: 'apps',
                title: APLICACAO_SECTION_LABEL,
                icon: 'A',
                defaultOpen: current.productKind !== 'kit',
                children: (
                  <div className="space-y-3">
                    {pdpVerdict ? (
                      <CompatibilityStateBadge
                        verdict={pdpVerdict}
                        variant="pdp"
                        showHint
                      />
                    ) : null}
                    <CompatibilityAppsBlock
                      variant="pdp"
                      groups={appGroups}
                      summary={current.compatibilitySummary}
                    />
                    <p className="m-0 text-xs text-hf-muted">{AJUDA_APLICACAO_TEXT}</p>
                    <Link
                      to={catalogFilter.href}
                      className="inline-flex text-sm font-semibold text-hf-red hover:underline"
                    >
                      {VER_MAIS_CATALOGO_LABEL}
                      {catalogFilter.hint}
                    </Link>
                  </div>
                ),
              },
              ...(equivalents.length
                ? [
                    {
                      id: 'equivalencias',
                      title: `Equivalências (${equivalents.length})`,
                      icon: '=',
                      defaultOpen: true,
                      children: (
                        <ul className="m-0 space-y-2 p-0 list-none">
                          {equivalents.map((eq) => (
                            <li
                              key={eq.id}
                              className="flex items-center gap-3 border-b border-hf-line py-2 last:border-0"
                            >
                              {eq.imageUrl ? (
                                <img
                                  src={eq.imageUrl}
                                  alt=""
                                  className="h-12 w-12 rounded object-contain bg-hf-bg"
                                />
                              ) : (
                                <div className="h-12 w-12 rounded bg-hf-bg" />
                              )}
                              <div className="min-w-0 flex-1">
                                <Link
                                  to={`/produto/${eq.id}`}
                                  className="font-semibold text-hf-ink hover:underline"
                                >
                                  {eq.name}
                                </Link>
                                <p className="m-0 text-xs text-hf-muted">
                                  {formatReferenciaFromProduct(eq)}
                                </p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ),
                    },
                  ]
                : []),
              {
                id: 'desc',
                title: 'Descrição',
                icon: 'D',
                defaultOpen: false,
                children: descriptionFull ? (
                  <div>
                    <p className="m-0 whitespace-pre-wrap text-sm text-hf-ink">{descriptionShown}</p>
                    {descriptionNeedsCollapse ? (
                      <button
                        type="button"
                        className="mt-2 text-sm font-semibold text-hf-red hover:underline"
                        onClick={() => setDescOpen((v) => !v)}
                      >
                        {descOpen ? VER_MENOS_DESCRICAO_LABEL : VER_DESCRICAO_COMPLETA_LABEL}
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <p className="m-0 text-sm text-hf-muted">Sem descrição cadastrada.</p>
                ),
              },
              {
                id: 'specs',
                title: 'Especificações',
                icon: 'E',
                defaultOpen: false,
                children: specRows.length ? (
                  <table className="min-w-full text-left text-sm">
                    <tbody>
                      {specRows.map((row, i) => (
                        <tr
                          key={`${row.label}-${i}`}
                          className={i % 2 === 0 ? 'bg-hf-bg/60' : 'bg-transparent'}
                        >
                          <th className="w-[40%] px-2 py-1.5 font-semibold text-hf-muted">
                            {row.label}
                          </th>
                          <td className="px-2 py-1.5 text-hf-ink">{row.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="m-0 text-sm text-hf-muted">Sem especificações cadastradas.</p>
                ),
              },
            ]}
          />
        </div>
      </div>

      <PdpPurchaseBar sku={current.sku} name={current.name} productId={current.id} />
    </Container>
  )
}
