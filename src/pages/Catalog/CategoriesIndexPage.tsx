import { Container } from '@/components/layout/Container'
import { Loading } from '@/components/common/Loading'
import { ErrorState } from '@/components/common/ErrorState'
import { EmptyState } from '@/components/common/EmptyState'
import { CategoryCard } from '@/components/product/CategoryCard'
import { useCategories } from '@/hooks/useCatalog'
import { Link } from 'react-router-dom'

export function CategoriesIndexPage() {
  const categories = useCategories()

  return (
    <Container className="py-8">
      <p className="mb-2 text-[13px] text-hf-muted">
        <Link to="/" className="hover:underline">
          Início
        </Link>{' '}
        / Categorias
      </p>
      <h1 className="mt-0 text-[28px] font-extrabold sm:text-[34px]">Categorias</h1>
      <p className="text-hf-muted">Navegue pelo catálogo autorizado por categoria.</p>
      <div className="mt-6">
        {categories.loading ? <Loading /> : null}
        {categories.error ? <ErrorState message={categories.error} /> : null}
        {!categories.loading && categories.data.length === 0 ? (
          <EmptyState title="Sem categorias" description="Cadastre categorias no admin." />
        ) : null}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {categories.data.map((c) => (
            <CategoryCard key={c.id} category={c} />
          ))}
        </div>
      </div>
    </Container>
  )
}
