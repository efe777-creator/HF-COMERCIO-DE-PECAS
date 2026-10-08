import { Container } from '@/components/layout/Container'
import { EmptyState } from '@/components/common/EmptyState'
import { Loading } from '@/components/common/Loading'
import { WhatsAppButton } from '@/components/common/WhatsAppButton'
import { getProductById } from '@/services/products/productService'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { Product } from '@/types'
import { buildNotFoundWhatsAppMessage, buildProductWhatsAppMessage } from '@/lib/whatsapp'
import { formatCodigoReferencia } from '@/lib/productLabels'
import { formatLadoLabel, formatPosicaoLabel } from '@/lib/productPosicaoLado'

export function ProductPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    void (async () => {
      setLoading(true)
      try {
        const data = id ? await getProductById(id) : null
        if (active) setProduct(data)
      } catch {
        if (active) setProduct(null)
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [id])

  if (loading) {
    return (
      <Container className="py-8">
        <Loading />
      </Container>
    )
  }

  if (!product) {
    return (
      <Container className="py-8">
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
  const categoryHref = current.categorySlug
    ? `/categoria/${encodeURIComponent(current.categorySlug)}`
    : null
  const brandHref = current.brand
    ? `/marca/${encodeURIComponent(current.brand.toLowerCase().replace(/\s+/g, '-'))}`
    : null
  const apps = current.compatibilitySummary
    ? current.compatibilitySummary.split(' · ').filter(Boolean)
    : []

  function goBack() {
    if (window.history.length > 1) navigate(-1)
    else navigate('/catalogo')
  }

  return (
    <Container className="py-8">
      <button
        type="button"
        onClick={goBack}
        className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-hf-ink hover:underline md:hidden"
        aria-label="Voltar"
      >
        ← Voltar
      </button>
      <p className="mb-2 text-[13px] text-hf-muted">
        <Link to="/" className="hover:underline">
          Início
        </Link>
        {' / '}
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
        {' / '}
        <span className="text-hf-ink">{current.name}</span>
      </p>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="grid h-[280px] place-items-center rounded-2xl bg-gradient-to-br from-hf-surface-2 to-[#0c0c0e] text-7xl lg:h-[420px]">
          🧩
        </div>
        <div className="relative rounded-hf border border-hf-line bg-hf-surface p-5">
          <h1 className="mt-0 text-[26px] font-extrabold leading-tight sm:text-[32px]">
            {current.name}
          </h1>
          <p className="mt-1 text-sm text-hf-muted">{formatCodigoReferencia(current.sku)}</p>
          <div className="mt-2 space-y-1 text-sm text-hf-ink">
            {current.brand ? (
              <p className="m-0">
                <span className="font-semibold">Marca:</span>{' '}
                {brandHref ? (
                  <Link to={`/catalogo?brand=${encodeURIComponent(current.brand)}`} className="underline">
                    {current.brand}
                  </Link>
                ) : (
                  current.brand
                )}
              </p>
            ) : null}
            {current.manufacturerCode ? (
              <p className="m-0">
                <span className="font-semibold">Cód. fabricante:</span>{' '}
                <span className="font-mono">{current.manufacturerCode}</span>
              </p>
            ) : null}
            {current.categoryName ? (
              <p className="m-0">
                <span className="font-semibold">Categoria:</span> {current.categoryName}
              </p>
            ) : null}
            {current.posicao || current.lado ? (
              <p className="m-0">
                {current.posicao ? (
                  <span>
                    <span className="font-semibold">Posição:</span>{' '}
                    {formatPosicaoLabel(current.posicao)}
                  </span>
                ) : null}
                {current.posicao && current.lado ? ' · ' : null}
                {current.lado ? (
                  <span>
                    <span className="font-semibold">Lado:</span> {formatLadoLabel(current.lado)}
                  </span>
                ) : null}
              </p>
            ) : null}
          </div>

          {current.description ? (
            <p className="mt-4 text-sm text-hf-ink whitespace-pre-wrap">{current.description}</p>
          ) : null}

          <p className="mt-4 rounded-[10px] border border-hf-line bg-hf-bg p-3 text-xs text-hf-muted">
            Confira sempre a aplicação no veículo. Em caso de dúvida, fale com a HF antes de pedir.
          </p>

          {apps.length ? (
            <div className="mt-4 overflow-x-auto">
              <p className="m-0 mb-2 font-semibold text-hf-ink">Aplicações</p>
              <table className="min-w-full text-left text-sm">
                <thead className="text-hf-muted">
                  <tr>
                    <th className="border-b border-hf-line px-2 py-2 font-semibold">Aplicação</th>
                  </tr>
                </thead>
                <tbody>
                  {apps.map((line) => (
                    <tr key={line} className="border-b border-hf-line/60">
                      <td className="px-2 py-2 text-hf-ink">{line}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-4 text-sm text-hf-muted">Aplicações sob consulta</p>
          )}

          {current.references?.length ? (
            <div className="mt-4 overflow-x-auto">
              <p className="m-0 mb-2 font-semibold text-hf-ink">Códigos / referências</p>
              <table className="min-w-full text-left text-sm">
                <thead className="text-hf-muted">
                  <tr>
                    <th className="border-b border-hf-line px-2 py-2 font-semibold">Código</th>
                    <th className="border-b border-hf-line px-2 py-2 font-semibold">Tipo / marca</th>
                  </tr>
                </thead>
                <tbody>
                  {current.references.map((ref) => (
                    <tr key={`${ref.type}-${ref.code}`} className="border-b border-hf-line/60">
                      <td className="px-2 py-2 font-mono text-hf-ink">{ref.code}</td>
                      <td className="px-2 py-2 text-hf-muted">
                        {[ref.type, ref.brandLabel].filter(Boolean).join(' · ') || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <div className="mt-5">
            <WhatsAppButton
              fullWidth
              message={buildProductWhatsAppMessage({
                name: current.name,
                sku: current.sku,
                productUrl: typeof window !== 'undefined' ? window.location.href : undefined,
              })}
            >
              Consultar esta peça
            </WhatsAppButton>
          </div>
        </div>
      </div>
    </Container>
  )
}
