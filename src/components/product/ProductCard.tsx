import { Badge } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { WhatsAppButton } from '@/components/common/WhatsAppButton'
import {
  CompatibilityAppsBlock,
  prioritizeCompatibilityGroupsForVehicle,
} from '@/components/product/CompatibilityAppsBlock'
import { CompatibilityStateBadge } from '@/components/product/CompatibilityStateBadge'
import { ProductImagePlaceholder } from '@/components/product/ProductImagePlaceholder'
import {
  ProductMediaFrame,
  productMediaImgClassCard,
} from '@/components/product/ProductMediaFrame'
import { features } from '@/config/features'
import { formatMoney } from '@/lib/money'
import { toCommercialTitleCase } from '@/lib/entityNormalize'
import {
  FABRICANTE_LABEL,
  formatReferenciaFromProduct,
  KIT_APPS_EMPTY_LABEL,
} from '@/lib/productLabels'
import { formatLadoLabel, formatPosicaoLabel } from '@/lib/productPosicaoLado'
import { buildProductWhatsAppMessage } from '@/lib/whatsapp'
import type { CompatibilityVerdict } from '@/services/compatibility/compatibilityEngine'
import { resolveCardSeal } from '@/services/compatibility/compatibilityEngine'
import type { Product, VehicleFilter } from '@/types'
import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'

/**
 * Card vitrine HF (D1): mídia → título → selo → ref → meta → apps → CTAs.
 * Sem preço, carrinho, favorito ou promo %.
 */
export function ProductCard({
  product,
  verdict,
  fitFilter,
  equivalentSkus,
}: {
  product: Product
  verdict?: CompatibilityVerdict | null
  fitFilter?: VehicleFilter | null
  /** SKUs de itens equivalentes (busca / vitrine). */
  equivalentSkus?: string[]
}) {
  const navigate = useNavigate()
  const displayName = toCommercialTitleCase(product.name)
  const brandName = product.brand ? toCommercialTitleCase(product.brand) : null
  const productHref = `/produto/${product.id}`

  const seal = verdict ? resolveCardSeal(verdict) : null
  const showSeal = Boolean(verdict && seal && (seal.kind !== 'hide' || seal.label))
  const incompatible = seal?.kind === 'hide'

  const prioritizedApps = useMemo(
    () =>
      prioritizeCompatibilityGroupsForVehicle(
        product.compatibilityGroups ?? [],
        fitFilter ? { maker: fitFilter.maker, model: fitFilter.model } : null,
      ),
    [product.compatibilityGroups, fitFilter],
  )

  return (
    <article className="relative flex h-full min-w-0 flex-col overflow-hidden rounded-hf border border-hf-line bg-hf-surface p-2 text-hf-ink transition hover:-translate-y-0.5 hover:border-hf-red/35 hover:shadow-hf sm:p-3">
      <div className="relative mb-0.5 shrink-0">
        <ProductMediaFrame variant="card">
          {product.imageUrl ? (
            <Link
              to={productHref}
              className="group relative flex h-full w-full items-center justify-center"
              aria-label={`Ver ${displayName}`}
            >
              <img
                src={product.imageUrl}
                alt={displayName}
                className={`${productMediaImgClassCard} transition group-hover:scale-[1.22]`}
                loading="lazy"
              />
            </Link>
          ) : (
            <ProductImagePlaceholder className="scale-75" />
          )}
        </ProductMediaFrame>
      </div>

      <Link to={productHref} className="flex min-h-0 min-w-0 flex-1 flex-col">
        {product.productKind === 'kit' ? (
          <div className="mt-1 mb-0.5 sm:mt-1.5">
            <Badge>Kit</Badge>
          </div>
        ) : null}
        <h3
          className={[
            'mb-0.5 line-clamp-2 break-words text-xs font-bold leading-snug sm:text-[15px]',
            product.productKind === 'kit' ? 'mt-0' : 'mt-1 sm:mt-1.5',
          ].join(' ')}
          title={displayName}
        >
          {displayName}
        </h3>
        {showSeal && verdict ? (
          <div className="mb-0.5">
            <CompatibilityStateBadge
              verdict={verdict}
              variant="card"
              tone={incompatible ? 'neutral' : 'default'}
              className="max-w-full shadow-none"
            />
          </div>
        ) : null}
        <p className="m-0 truncate text-[11px] text-hf-muted">
          {formatReferenciaFromProduct(product)}
        </p>
        {equivalentSkus && equivalentSkus.length > 0 ? (
          <p
            className="m-0 line-clamp-2 text-[10px] text-hf-muted"
            title={equivalentSkus.join(', ')}
          >
            Equiv.: {equivalentSkus.join(', ')}
          </p>
        ) : null}
        {product.categoryName ? (
          <p className="m-0 hidden truncate text-[11px] text-hf-muted sm:block">
            {product.categorySlug ? (
              <button
                type="button"
                className="hover:underline"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  navigate(`/catalogo?cat=${encodeURIComponent(product.categorySlug!)}`)
                }}
              >
                {product.categoryName}
              </button>
            ) : (
              product.categoryName
            )}
          </p>
        ) : null}
        {brandName || product.manufacturerCode ? (
          <p className="m-0 hidden truncate text-[11px] text-hf-muted sm:block">
            {brandName ? (
              <span>
                {FABRICANTE_LABEL}: {brandName}
              </span>
            ) : null}
            {brandName && product.manufacturerCode ? ' · ' : null}
            {product.manufacturerCode ? (
              <span className="font-mono">{product.manufacturerCode}</span>
            ) : null}
          </p>
        ) : null}
        {product.posicao || product.lado ? (
          <p className="m-0 hidden truncate text-[11px] text-hf-ink sm:block">
            {[
              product.posicao ? formatPosicaoLabel(product.posicao) : null,
              product.lado ? formatLadoLabel(product.lado) : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        ) : null}
      </Link>

      <CompatibilityAppsBlock
        className="my-1 sm:my-1.5"
        variant="card"
        groups={prioritizedApps.length ? prioritizedApps : product.compatibilityGroups}
        summary={product.compatibilitySummary}
        emptyLabel={product.productKind === 'kit' ? KIT_APPS_EMPTY_LABEL : undefined}
      />
      {product.priceVisible || features.price_enabled ? (
        <div className="space-y-0.5">
          <p className="m-0 text-sm font-extrabold text-hf-ink">
            {formatMoney(product.resolvedPrice ?? product.promoPrice ?? product.price)}
          </p>
          {product.priceVisible && !features.price_enabled ? (
            <p className="m-0 truncate text-[11px] font-semibold text-hf-muted">
              Preço da sua lista B2B
            </p>
          ) : null}
        </div>
      ) : (
        <p className="m-0 text-sm font-semibold text-hf-ink">Consultar disponibilidade</p>
      )}

      <div className="mt-auto flex shrink-0 flex-col gap-1 pt-1 sm:gap-1.5 sm:pt-1.5">
        {incompatible ? (
          <p className="m-0 text-xs font-semibold text-hf-muted">
            Não compatível com o filtro atual — confira outras aplicações
          </p>
        ) : null}
        <Link to={productHref} className="block">
          <Button variant="primary" size="sm" fullWidth>
            Ver produto
          </Button>
        </Link>
        {!incompatible ? (
          <WhatsAppButton
            size="sm"
            fullWidth
            message={buildProductWhatsAppMessage({ name: product.name, sku: product.sku })}
          >
            Consultar
          </WhatsAppButton>
        ) : null}
      </div>
    </article>
  )
}
