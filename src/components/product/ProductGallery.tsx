import { ProductImageLightbox } from '@/components/product/ProductImageLightbox'
import { ProductImagePlaceholder } from '@/components/product/ProductImagePlaceholder'
import {
  ProductMediaFrame,
  productMediaImgClass,
  productMediaImgClassGallery,
} from '@/components/product/ProductMediaFrame'
import { useEffect, useState, type MouseEvent } from 'react'

type Props = {
  images: string[]
  alt: string
}

/**
 * Galeria PDP — 4:3 contain; thumbs; zoom hover; lightbox; contador.
 */
export function ProductGallery({ images, alt }: Props) {
  const urls = images.filter(Boolean)
  const [active, setActive] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [hoverZoom, setHoverZoom] = useState(false)
  const [origin, setOrigin] = useState({ x: 50, y: 50 })
  const [fineHover, setFineHover] = useState(false)

  useEffect(() => {
    setActive(0)
  }, [urls.join('|')])

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)')
    const sync = () => setFineHover(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const safeIndex = urls.length ? Math.min(active, urls.length - 1) : 0
  const mainSrc = urls[safeIndex]

  function onMainMove(e: MouseEvent<HTMLButtonElement>) {
    if (!fineHover) return
    const rect = e.currentTarget.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    setOrigin({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    })
  }

  const thumbs =
    urls.length > 1 ? (
      <div
        className="order-2 flex shrink-0 gap-2 overflow-x-auto lg:order-1 lg:max-h-[min(100%,calc(100vw*0.45*0.75))] lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden"
        role="listbox"
        aria-label="Miniaturas do produto"
      >
        {urls.map((url, i) => {
          const selected = i === safeIndex
          return (
            <button
              key={`${url}-${i}`}
              type="button"
              role="option"
              aria-selected={selected}
              aria-label={`Imagem ${i + 1} de ${urls.length}`}
              onClick={() => setActive(i)}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-hf border-2 bg-hf-surface-2 p-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hf-red ${
                selected ? 'border-hf-red' : 'border-hf-line hover:border-hf-red/60'
              }`}
            >
              <img src={url} alt="" className={productMediaImgClass} loading="lazy" />
            </button>
          )
        })}
      </div>
    ) : null

  return (
    <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start">
      {thumbs}
      <ProductMediaFrame variant="gallery" className="order-1 min-w-0 flex-1 lg:order-2">
        {mainSrc ? (
          <button
            type="button"
            className={[
              'relative flex h-full w-full items-center justify-center overflow-hidden',
              fineHover ? 'cursor-zoom-in' : 'cursor-pointer',
            ].join(' ')}
            onClick={() => setLightboxOpen(true)}
            onMouseEnter={() => fineHover && setHoverZoom(true)}
            onMouseLeave={() => {
              setHoverZoom(false)
              setOrigin({ x: 50, y: 50 })
            }}
            onMouseMove={onMainMove}
            aria-label={`Ampliar imagem de ${alt}`}
          >
            <img
              src={mainSrc}
              alt={alt}
              className={`${productMediaImgClassGallery} max-h-full will-change-transform`}
              style={{
                transform: hoverZoom && fineHover ? 'scale(2)' : undefined,
                transformOrigin: `${origin.x}% ${origin.y}%`,
                transition: hoverZoom ? 'none' : 'transform 160ms ease-out',
              }}
              loading="eager"
              draggable={false}
            />
            {urls.length > 1 ? (
              <span className="pointer-events-none absolute bottom-2 left-2 rounded-hf bg-black/55 px-2 py-0.5 text-[11px] font-bold text-white">
                {safeIndex + 1}/{urls.length}
              </span>
            ) : null}
            <span
              className="pointer-events-none absolute bottom-2 right-2 grid h-9 w-9 place-items-center rounded-hf border border-hf-line/40 bg-hf-surface/90 text-hf-ink shadow-sm"
              aria-hidden="true"
              title="Ampliar"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="2" />
                <path d="M15 15l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </span>
          </button>
        ) : (
          <ProductImagePlaceholder />
        )}
      </ProductMediaFrame>

      <ProductImageLightbox
        images={urls}
        alt={alt}
        startIndex={safeIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  )
}
