import { CatalogPage } from '@/pages/Catalog/CatalogPage'
import { listActiveBrands } from '@/services/brands/brandService'
import { useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'

/** Pré-aplica marca (nome/id aceitos pelo search) e reutiliza o catálogo. */
export function BrandPage() {
  const { slug } = useParams()
  const [, setParams] = useSearchParams()

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    void (async () => {
      try {
        const brands = await listActiveBrands()
        const match = brands.find((b) => b.slug === slug)
        const value = match?.name ?? match?.id ?? slug
        if (cancelled) return
        setParams(
          (prev) => {
            const next = new URLSearchParams(prev)
            next.set('brand', value)
            next.delete('page')
            return next
          },
          { replace: true },
        )
      } catch {
        if (cancelled) return
        setParams(
          (prev) => {
            const next = new URLSearchParams(prev)
            next.set('brand', slug)
            next.delete('page')
            return next
          },
          { replace: true },
        )
      }
    })()
    return () => {
      cancelled = true
    }
  }, [slug, setParams])

  return <CatalogPage />
}
