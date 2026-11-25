import { useEffect, useRef, useState, type MouseEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'

type Props = {
  images: string[]
  alt: string
  startIndex?: number
  open: boolean
  onClose: () => void
}

const MIN_ZOOM = 1
const MAX_ZOOM = 6
const ZOOM_STEP = 0.35

/**
 * Lightbox com zoom (wheel / botões / duplo clique) e pan ao arrastar quando ampliado.
 */
export function ProductImageLightbox({
  images,
  alt,
  startIndex = 0,
  open,
  onClose,
}: Props) {
  const urls = images.filter(Boolean)
  const [index, setIndex] = useState(startIndex)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    originX: number
    originY: number
  } | null>(null)
  const [dragging, setDragging] = useState(false)

  function resetView() {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  useEffect(() => {
    if (open) {
      setIndex(Math.min(Math.max(0, startIndex), Math.max(0, urls.length - 1)))
      resetView()
    }
  }, [open, startIndex, urls.length])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight' && urls.length > 1) {
        setIndex((i) => (i + 1) % urls.length)
        resetView()
      }
      if (e.key === 'ArrowLeft' && urls.length > 1) {
        setIndex((i) => (i - 1 + urls.length) % urls.length)
        resetView()
      }
      if (e.key === '+' || e.key === '=') {
        setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP))
      }
      if (e.key === '-') {
        setZoom((z) => {
          const next = Math.max(MIN_ZOOM, z - ZOOM_STEP)
          if (next <= MIN_ZOOM) setPan({ x: 0, y: 0 })
          return next
        })
      }
      if (e.key === '0') resetView()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose, urls.length])

  if (!open || !urls.length) return null

  const src = urls[Math.min(index, urls.length - 1)]!
  const canPan = zoom > 1.01

  function onBackdrop(e: MouseEvent) {
    if (e.target === e.currentTarget) onClose()
  }

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (!canPan) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: pan.x,
      originY: pan.y,
    }
    setDragging(true)
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const d = dragRef.current
    if (!d || d.pointerId !== e.pointerId) return
    setPan({
      x: d.originX + (e.clientX - d.startX),
      y: d.originY + (e.clientY - d.startY),
    })
  }

  function endDrag(e: ReactPointerEvent<HTMLDivElement>) {
    const d = dragRef.current
    if (!d || d.pointerId !== e.pointerId) return
    dragRef.current = null
    setDragging(false)
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* already released */
    }
  }

  function onDoubleClick(e: ReactPointerEvent<HTMLImageElement>) {
    e.stopPropagation()
    if (zoom > 1.2) {
      resetView()
      return
    }
    // Amplia em direção ao clique
    const rect = e.currentTarget.getBoundingClientRect()
    const cx = e.clientX - (rect.left + rect.width / 2)
    const cy = e.clientY - (rect.top + rect.height / 2)
    const nextZoom = 2.5
    setZoom(nextZoom)
    setPan({ x: -cx * (nextZoom - 1), y: -cy * (nextZoom - 1) })
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Ampliar imagem: ${alt}`}
      className="fixed inset-0 z-[280] flex flex-col bg-black/90 p-3 sm:p-6"
      onClick={onBackdrop}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 text-white">
        <div className="min-w-0">
          <p className="m-0 truncate text-sm font-semibold">{alt}</p>
          {urls.length > 1 ? (
            <p className="m-0 mt-0.5 text-xs text-white/80" aria-live="polite">
              Imagem {index + 1} de {urls.length}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            className="grid h-11 min-w-11 place-items-center rounded-hf border border-white/40 px-2 text-sm font-bold hover:bg-white/10"
            onClick={() =>
              setZoom((z) => {
                const next = Math.max(MIN_ZOOM, z - ZOOM_STEP)
                if (next <= MIN_ZOOM) setPan({ x: 0, y: 0 })
                return next
              })
            }
            aria-label="Diminuir zoom"
          >
            −
          </button>
          <span className="min-w-[3rem] text-center text-xs tabular-nums">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            className="grid h-11 min-w-11 place-items-center rounded-hf border border-white/40 px-2 text-sm font-bold hover:bg-white/10"
            onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP))}
            aria-label="Aumentar zoom"
          >
            +
          </button>
          <button
            type="button"
            className="grid h-11 place-items-center rounded-hf border border-white/40 px-3 text-sm font-bold hover:bg-white/10"
            onClick={resetView}
            aria-label="Resetar zoom"
          >
            100%
          </button>
          <button
            type="button"
            className="grid h-11 place-items-center rounded-hf border border-white/40 px-3 text-sm font-bold hover:bg-white/10"
            onClick={onClose}
            aria-label="Fechar"
          >
            Fechar
          </button>
        </div>
      </div>

      <div
        className={[
          'relative mt-3 flex min-h-0 flex-1 items-center justify-center overflow-hidden touch-none',
          canPan ? (dragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in',
        ].join(' ')}
        onClick={onBackdrop}
        onWheel={(e) => {
          e.preventDefault()
          const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP
          setZoom((z) => {
            const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z + delta))
            if (next <= MIN_ZOOM) setPan({ x: 0, y: 0 })
            return next
          })
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {urls.length > 1 ? (
          <button
            type="button"
            className="absolute left-1 z-[1] grid h-11 w-11 place-items-center rounded-hf border border-white/50 bg-black/40 text-lg text-white hover:bg-black/70 sm:left-4"
            aria-label="Imagem anterior"
            onClick={(e) => {
              e.stopPropagation()
              setIndex((i) => (i - 1 + urls.length) % urls.length)
              resetView()
            }}
          >
            ‹
          </button>
        ) : null}
        <img
          src={src}
          alt={alt}
          className="max-h-full max-w-full select-none object-contain"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: dragging ? 'none' : 'transform 120ms ease-out',
          }}
          draggable={false}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={onDoubleClick}
        />
        {urls.length > 1 ? (
          <button
            type="button"
            className="absolute right-1 z-[1] grid h-11 w-11 place-items-center rounded-hf border border-white/50 bg-black/40 text-lg text-white hover:bg-black/70 sm:right-4"
            aria-label="Próxima imagem"
            onClick={(e) => {
              e.stopPropagation()
              setIndex((i) => (i + 1) % urls.length)
              resetView()
            }}
          >
            ›
          </button>
        ) : null}
      </div>
      <p className="m-0 mt-2 text-center text-xs text-white/70">
        Scroll ou +/- para zoom · arraste para mover · duplo clique amplia · Esc fecha
        {urls.length > 1 ? ' · setas navegam' : ''}
      </p>
    </div>,
    document.body,
  )
}
