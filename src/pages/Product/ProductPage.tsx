import { Container } from '@/components/layout/Container'
import { EmptyState } from '@/components/common/EmptyState'
import { Loading } from '@/components/common/Loading'
import { getProductById } from '@/services/products/productService'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { Product } from '@/types'
import {
  buildProductWhatsAppMessage,
  storeWhatsAppPhone,
  whatsAppHref,
} from '@/lib/whatsapp'
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
      const data = id ? await getProductById(id) : null
      if (active) {
        setProduct(data)
        setLoading(false)
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
          title="Produto não encontrado"
          description="O item solicitado não está disponível no catálogo."
          actionLabel="Ver catálogo"
          actionTo="/catalogo"
        />
      </Container>
    )
  }

  const current = product
  const categoryHref = current.categorySlug
    ? `/catalogo?cat=${encodeURIComponent(current.categorySlug)}`
    : null
  const phone = storeWhatsAppPhone()
  const whatsappHref = phone
    ? whatsAppHref(
        phone,
        buildProductWhatsAppMessage({
          name: current.name,
          sku: current.sku,
          productUrl: typeof window !== 'undefined' ? window.location.href : undefined,
        }),
      )
    : null

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
        <div className="grid h-[280px] place-items-center rounded-2xl bg-gradient-to-br from-[#e8ecef] to-[#d7dde1] text-7xl lg:h-[420px]">
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
                <span className="font-semibold text-hf-ink">Marca:</span> {current.brand}
              </p>
            ) : null}
            {current.manufacturerCode ? (
              <p className="m-0">
                <span className="font-semibold text-hf-ink">Cód. fabricante:</span>{' '}
                <span className="font-mono">{current.manufacturerCode}</span>
              </p>
            ) : null}
            {current.categoryName ? (
              <p className="m-0">
                <span className="font-semibold text-hf-ink">Categoria:</span> {current.categoryName}
              </p>
            ) : null}
            {current.posicao || current.lado ? (
              <p className="m-0">
                {current.posicao ? (
                  <span>
                    <span className="font-semibold text-hf-ink">Posição:</span>{' '}
                    {formatPosicaoLabel(current.posicao)}
                  </span>
                ) : null}
                {current.posicao && current.lado ? ' · ' : null}
                {current.lado ? (
                  <span>
                    <span className="font-semibold text-hf-ink">Lado:</span>{' '}
                    {formatLadoLabel(current.lado)}
                  </span>
                ) : null}
              </p>
            ) : null}
          </div>

          {current.description ? (
            <p className="mt-4 text-sm text-hf-ink whitespace-pre-wrap">{current.description}</p>
          ) : null}

          {current.compatibilitySummary ? (
            <div className="mt-4 rounded-[10px] border border-hf-line bg-hf-bg p-3 text-sm">
              <p className="m-0 font-semibold text-hf-ink">Aplicações</p>
              <ul className="mb-0 mt-1 list-none space-y-0.5 p-0 text-hf-ink">
                {current.compatibilitySummary.split(' · ').map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-4 text-sm text-hf-muted">Aplicações sob consulta</p>
          )}

          {current.references?.length ? (
            <div className="mt-3 text-sm text-hf-muted">
              <p className="m-0 font-semibold text-hf-ink">Códigos / referências</p>
              <ul className="mt-1 list-disc pl-5">
                {current.references.map((ref) => (
                  <li key={`${ref.type}-${ref.code}`}>
                    {ref.code}
                    {ref.brandLabel ? ` (${ref.brandLabel})` : ''}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-5 space-y-2">
            {whatsappHref ? (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
                className="flex w-full items-center justify-center rounded-[10px] border border-[#25D366] bg-[#25D366]/10 px-4 py-3 text-sm font-extrabold text-[#128C7E] hover:bg-[#25D366]/20"
              >
                Consultar pelo WhatsApp
              </a>
            ) : (
              <p className="text-sm text-hf-muted">
                WhatsApp não configurado. Defina VITE_WHATSAPP_NUMBER no .env.local.
              </p>
            )}
          </div>
        </div>
      </div>
    </Container>
  )
}
