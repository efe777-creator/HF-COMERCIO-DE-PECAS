import { Button } from '@/components/common/Button'
import { CategoryCard } from '@/components/product/CategoryCard'
import { ProductCard } from '@/components/product/ProductCard'
import { VehicleSelector } from '@/components/vehicle/VehicleSelector'
import { Container } from '@/components/layout/Container'
import { Loading } from '@/components/common/Loading'
import { ErrorState } from '@/components/common/ErrorState'
import { EmptyState } from '@/components/common/EmptyState'
import { businessConfig } from '@/config/business'
import { useCategories, useFeaturedProducts } from '@/hooks/useCatalog'
import { Link } from 'react-router-dom'

export function HomePage() {
  const categories = useCategories()
  const featured = useFeaturedProducts(12)
  const suspensao = useFeaturedProducts(8)

  return (
    <>
      <section className="relative overflow-hidden py-10 text-white sm:py-14">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,rgba(197,23,31,0.22),transparent_55%)]"
          aria-hidden
        />
        <Container className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="max-w-3xl">
            <p className="text-xs font-extrabold tracking-[0.16em] text-hf-red-bright uppercase">
              {businessConfig.eyebrow}
            </p>
            <h1 className="mt-3 text-[32px] font-black leading-[1.05] sm:text-[48px]">
              {businessConfig.heroHeadline}{' '}
              <span className="text-hf-red-bright">{businessConfig.heroHighlight}</span>
            </h1>
            <p className="mt-4 max-w-xl text-sm text-[#d7d7d7] sm:text-base">
              {businessConfig.heroSupport}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link to="/catalogo">
                <Button variant="dark">Consultar catálogo</Button>
              </Link>
              <Link to="/login">
                <Button variant="primary">Entrar</Button>
              </Link>
              <Link to="/cadastro">
                <Button variant="outline">Criar conta</Button>
              </Link>
            </div>
          </div>
          <div className="rounded-[14px] border border-hf-line bg-hf-surface/90 p-5 shadow-hf backdrop-blur">
            <p className="m-0 text-xs font-extrabold tracking-[0.14em] text-hf-red-bright uppercase">
              Catálogo B2B
            </p>
            <h2 className="mt-2 mb-2 text-2xl font-black text-hf-ink">Acesso personalizado</h2>
            <p className="m-0 text-sm text-hf-muted">
              Login da empresa + listas autorizadas. Sem preço público — disponibilidade sob
              consulta via WhatsApp.
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { v: 'B2B', l: 'clientes' },
                { v: 'Listas', l: 'catálogo' },
                { v: 'WA', l: 'consulta' },
              ].map((s) => (
                <div
                  key={s.l}
                  className="rounded-[10px] border border-hf-line bg-hf-surface-2 px-2 py-3 text-center"
                >
                  <div className="text-lg font-black text-hf-ink">{s.v}</div>
                  <div className="text-[11px] text-hf-muted">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <section className="border-t border-hf-line bg-hf-bg-2 py-8 sm:py-10">
        <Container>
          <div className="mb-4 flex flex-col gap-1 sm:mb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="m-0 text-[22px] font-extrabold text-hf-ink sm:text-[26px]">Destaques</h2>
              <p className="mt-1 text-sm text-hf-muted">Produtos publicados no catálogo autorizado</p>
            </div>
            <Link to="/catalogo" className="text-sm font-semibold text-hf-red-bright">
              Ver catálogo →
            </Link>
          </div>
          {featured.loading ? <Loading /> : null}
          {featured.error ? <ErrorState message={featured.error} /> : null}
          {!featured.loading && !featured.error && featured.data.length === 0 ? (
            <EmptyState
              title="Ainda não há produtos em destaque"
              description="Entre com a conta B2B para ver o catálogo autorizado."
              actionLabel="Entrar"
              actionTo="/login"
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
              <h2 className="m-0 text-[22px] font-extrabold text-hf-ink sm:text-[26px]">Categorias</h2>
              <p className="mt-1 text-sm text-hf-muted">Navegue por departamento</p>
            </div>
            <Link to="/catalogo" className="text-sm font-semibold text-hf-red-bright">
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

      <section className="border-t border-hf-line bg-hf-bg-2 py-8 sm:py-10">
        <Container>
          <div className="mb-4 flex flex-col gap-1 sm:mb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="m-0 text-[22px] font-extrabold text-hf-ink sm:text-[26px]">
                Suspensão e direção
              </h2>
              <p className="mt-1 text-sm text-hf-muted">Foco HF — peça certa para o conjunto</p>
            </div>
            <Link to="/catalogo?q=suspensao" className="text-sm font-semibold text-hf-red-bright">
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

      <section id="veiculo" className="scroll-mt-20 border-t border-hf-line py-6 sm:py-8">
        <Container>
          <div className="mb-3">
            <h2 className="m-0 text-lg font-extrabold text-hf-ink sm:text-xl">Buscar pelo carro</h2>
            <p className="mt-1 text-sm text-hf-muted">
              Informe só o que souber — montadora, modelo, ano ou motor.
            </p>
          </div>
          <div className="max-w-3xl rounded-[12px] border border-hf-line bg-hf-surface p-3 sm:p-4">
            <VehicleSelector />
          </div>
        </Container>
      </section>
    </>
  )
}
