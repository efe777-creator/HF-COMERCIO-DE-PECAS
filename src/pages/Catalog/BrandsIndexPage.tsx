import { Container } from '@/components/layout/Container'
import { Loading } from '@/components/common/Loading'
import { EmptyState } from '@/components/common/EmptyState'
import { listActiveBrands } from '@/services/brands/brandService'
import type { ProductBrand } from '@/types'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

export function BrandsIndexPage() {
  const [brands, setBrands] = useState<ProductBrand[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void listActiveBrands()
      .then(setBrands)
      .catch(() => setBrands([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <Container className="py-8">
      <p className="mb-2 text-[13px] text-hf-muted">
        <Link to="/" className="hover:underline">
          Início
        </Link>{' '}
        / Marcas
      </p>
      <h1 className="mt-0 text-[28px] font-extrabold sm:text-[34px]">Marcas</h1>
      <p className="text-hf-muted">Filtre o catálogo por fabricante.</p>
      <div className="mt-6">
        {loading ? <Loading /> : null}
        {!loading && brands.length === 0 ? (
          <EmptyState title="Sem marcas" description="Cadastre marcas no admin." />
        ) : null}
        <div className="flex flex-wrap gap-2">
          {brands.map((b) => (
            <Link
              key={b.id}
              to={`/marca/${encodeURIComponent(b.slug)}`}
              className="rounded-full border border-hf-line bg-hf-surface px-4 py-2 text-sm font-semibold text-hf-ink hover:border-hf-red"
            >
              {b.name}
            </Link>
          ))}
        </div>
      </div>
    </Container>
  )
}
