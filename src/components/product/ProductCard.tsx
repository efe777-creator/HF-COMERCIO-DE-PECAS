import { Button } from '@/components/common/Button'
import { features } from '@/config/features'
import { formatCodigoReferencia } from '@/lib/productLabels'
import { formatLadoLabel, formatPosicaoLabel } from '@/lib/productPosicaoLado'
import type { Product } from '@/types'
import { Link } from 'react-router-dom'

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="relative min-w-0 overflow-hidden rounded-hf border border-hf-line bg-hf-surface p-2.5 transition hover:-translate-y-0.5 hover:shadow-hf sm:p-3.5">
      <Link to={`/produto/${product.id}`} className="block min-w-0">
        <div className="grid h-[100px] place-items-center rounded-[10px] bg-gradient-to-br from-hf-surface-2 to-[#0c0c0e] text-4xl sm:h-[150px] sm:text-[62px]">
          🧩
        </div>
        <h3
          className="mt-3 mb-1 line-clamp-2 min-h-9 break-words text-xs font-bold leading-snug sm:min-h-[2.7rem] sm:text-[15px]"
          title={product.name}
        >
          {product.name}
        </h3>
        <p className="m-0 truncate text-[11px] text-hf-muted">
          {formatCodigoReferencia(product.sku)}
        </p>
        {product.brand || product.manufacturerCode ? (
          <p className="m-0 truncate text-[11px] text-hf-muted">
            {product.brand ? <span>{product.brand}</span> : null}
            {product.brand && product.manufacturerCode ? ' · ' : null}
            {product.manufacturerCode ? (
              <span className="font-mono">{product.manufacturerCode}</span>
            ) : null}
          </p>
        ) : null}
        {product.posicao || product.lado ? (
          <p className="m-0 truncate text-[11px] text-hf-ink">
            {[
              product.posicao ? formatPosicaoLabel(product.posicao) : null,
              product.lado ? formatLadoLabel(product.lado) : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        ) : null}
        {product.compatibilitySummary ? (
          <p
            className="my-2 line-clamp-3 break-words text-xs text-hf-success"
            title={product.compatibilitySummary}
          >
            {product.compatibilitySummary}
          </p>
        ) : (
          <p className="my-2 text-xs text-hf-muted">Aplicações sob consulta</p>
        )}
        {features.price_enabled ? null : (
          <p className="m-0 text-sm font-semibold text-hf-ink">Consultar disponibilidade</p>
        )}
      </Link>

      <div className="mt-3">
        <Link to={`/produto/${product.id}`} className="block">
          <Button variant="primary" size="sm" fullWidth>
            Ver peça
          </Button>
        </Link>
      </div>
    </article>
  )
}
