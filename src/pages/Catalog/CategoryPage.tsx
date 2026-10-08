import { CatalogPage } from '@/pages/Catalog/CatalogPage'
import { useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'

/** Pré-aplica categoria via slug e reutiliza o catálogo. */
export function CategoryPage() {
  const { slug } = useParams()
  const [, setParams] = useSearchParams()

  useEffect(() => {
    if (!slug) return
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('cat', slug)
        next.delete('page')
        return next
      },
      { replace: true },
    )
  }, [slug, setParams])

  return <CatalogPage />
}
