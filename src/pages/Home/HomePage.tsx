import { Button } from '@/components/common/Button'
import { CategoryCard } from '@/components/product/CategoryCard'
import { ProductCard } from '@/components/product/ProductCard'
import { VehicleSelector } from '@/components/vehicle/VehicleSelector'
import { Container } from '@/components/layout/Container'
import { Loading } from '@/components/common/Loading'
import { ErrorState } from '@/components/common/ErrorState'
import { EmptyState } from '@/components/common/EmptyState'
import { useCategories, useFeaturedProducts } from '@/hooks/useCatalog'
import { Link } from 'react-router-dom'

export function HomePage() {
  const categories = useCategories()
  const featured = useFeaturedProducts(12)
  const suspensao = useFeaturedProducts(8)

  return (
    <>
      <section className="bg-gradient-to-br from-fal-navy-dark to-[#4a5562] py-6 text-white sm:py-8">
        <Container>
          <div className="max-w-3xl">
            <p className="text-xs font-extrabold tracking-[0.08em] text-fal-yellow uppercase">
              FAL Peças Automotivas
            </p>
            <h1 className="mt-2 text-[28px] font-black leading-tight sm:text-[40px]">
              Peças certas para o seu carro
            </h1>
            <p className="mt-2 max-w-xl text-sm text-[#e3e7eb] sm:text-base">
              Busque pela peça, pelo veículo ou navegue por categoria — você escolhe o caminho.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link to="/catalogo">
                <Button variant="primary">Buscar peça</Button>
              </Link>
              <a href="#veiculo">
                <Button variant="outline">Buscar pelo carro</Button>
              </a>
              <a href="#categorias">
                <Button variant="outline">Ver categorias</Button>
              </a>
            </div>
          </div>
        </Container>
      </section>

      <section className="bg-white py-8 sm:py-10">
        <Container>
          <div className="mb-4 flex flex-col gap-1 sm:mb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="m-0 text-[22px] font-extrabold sm:text-[26px]">Destaques</h2>
              <p className="mt-1 text-sm text-fal-muted">Produtos publicados no catálogo</p>
            </div>
            <Link to="/catalogo" className="text-sm font-semibold text-fal-navy">
              Ver catálogo →
            </Link>
          </div>
          {featured.loading ? <Loading /> : null}
          {featured.error ? <ErrorState message={featured.error} /> : null}
          {!featured.loading && !featured.error && featured.data.length === 0 ? (
            <EmptyState
              title="Ainda não há produtos em destaque"
              description="Explore o catálogo completo."
              actionLabel="Ver catálogo"
              actionTo="/catalogo"
            />
          ) : null}
          {!featured.loading && featured.data.length > 0 ? (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {featured.data.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : null}
        </Container>
      </section>

      <section id="categorias" className="scroll-mt-20 py-8 sm:py-10">
        <Container>
          <div className="mb-4 flex flex-col gap-1 sm:mb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="m-0 text-[22px] font-extrabold sm:text-[26px]">Categorias</h2>
              <p className="mt-1 text-sm text-fal-muted">Navegue por departamento</p>
            </div>
            <Link to="/catalogo" className="text-sm font-semibold text-fal-navy">
              Ver todas →
            </Link>
          </div>
          {categories.loading ? <Loading /> : null}
          {categories.error ? <ErrorState message={categories.error} /> : null}
          {!categories.loading && !categories.error && categories.data.length === 0 ? (
            <EmptyState title="Nenhuma categoria publicada" description="Em breve novas categorias." />
          ) : null}
          {!categories.loading && categories.data.length > 0 ? (
            <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
              {categories.data.map((c) => (
                <CategoryCard key={c.id} category={c} />
              ))}
            </div>
          ) : null}
        </Container>
      </section>

      <section className="bg-white py-8 sm:py-10">
        <Container>
          <div className="mb-4 flex flex-col gap-1 sm:mb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="m-0 text-[22px] font-extrabold sm:text-[26px]">
                Suspensão e direção
              </h2>
              <p className="mt-1 text-sm text-fal-muted">
                Posicionamento FAL — peça certa para o conjunto
              </p>
            </div>
            <Link
              to="/catalogo?q=suspensao"
              className="text-sm font-semibold text-fal-navy"
            >
              Ver mais →
            </Link>
          </div>
          {suspensao.loading ? <Loading label="Carregando…" /> : null}
          {!suspensao.loading && suspensao.data.length > 0 ? (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {suspensao.data.slice(0, 8).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : !suspensao.loading ? (
            <EmptyState
              title="Em preparação"
              description="Em breve produtos desta linha em destaque."
              actionLabel="Ver catálogo"
              actionTo="/catalogo"
            />
          ) : null}
        </Container>
      </section>

      <section id="veiculo" className="scroll-mt-20 border-t border-fal-line bg-fal-bg py-6 sm:py-8">
        <Container>
          <div className="mb-3">
            <h2 className="m-0 text-lg font-extrabold sm:text-xl">Buscar pelo carro</h2>
            <p className="mt-1 text-sm text-fal-muted">
              Informe só o que souber — montadora, modelo, ano ou motor.
            </p>
          </div>
          <div className="max-w-3xl rounded-[12px] border border-fal-line bg-white p-3 shadow-sm sm:p-4">
            <VehicleSelector />
          </div>
        </Container>
      </section>
    </>
  )
}
