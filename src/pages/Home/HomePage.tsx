import { Button } from '@/components/common/Button'
import { CategoryCard } from '@/components/product/CategoryCard'
import { ProductCard } from '@/components/product/ProductCard'
import { Container } from '@/components/layout/Container'
import { Loading } from '@/components/common/Loading'
import { ErrorState } from '@/components/common/ErrorState'
import { EmptyState } from '@/components/common/EmptyState'
import { WhatsAppButton } from '@/components/common/WhatsAppButton'
import { businessConfig } from '@/config/business'
import { useAuth } from '@/contexts/AuthContext'
import { useCategories, useFeaturedProducts } from '@/hooks/useCatalog'
import { buildHomeWhatsAppMessage } from '@/lib/whatsapp'
import { listActiveBrands } from '@/services/brands/brandService'
import { getVehicleOptions } from '@/services/vehicles/vehicleService'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export function HomePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const categories = useCategories()
  const featured = useFeaturedProducts(8)
  const [q, setQ] = useState('')
  const [brands, setBrands] = useState<{ id: string; name: string; slug: string }[]>([])
  const [makers, setMakers] = useState<string[]>([])

  useEffect(() => {
    void listActiveBrands()
      .then((list) => setBrands(list.slice(0, 12).map((b) => ({ id: b.id, name: b.name, slug: b.slug }))))
      .catch(() => setBrands([]))
    void getVehicleOptions()
      .then((tree) => setMakers(tree.makers.slice(0, 10)))
      .catch(() => setMakers([]))
  }, [])

  function onSearch(e: FormEvent) {
    e.preventDefault()
    const query = q.trim()
    navigate(query ? `/busca?q=${encodeURIComponent(query)}` : '/catalogo')
  }

  const loggedIn = Boolean(user)

  return (
    <>
      <section className="relative overflow-hidden border-b border-hf-line py-10 text-white sm:py-14">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_70%_10%,rgba(179,32,42,0.22),transparent_55%)]"
          aria-hidden
        />
        <Container className="relative max-w-3xl">
          <p className="text-xs font-extrabold tracking-[0.16em] text-hf-red-bright uppercase">
            {businessConfig.eyebrow}
          </p>
          <h1 className="mt-3 text-[32px] font-black leading-[1.05] sm:text-[44px]">
            Encontre a peça certa para o seu negócio
          </h1>
          <p className="mt-3 text-sm text-hf-muted sm:text-base">
            Catálogo B2B autorizado — sem preço público. Consulte disponibilidade direto com a HF.
          </p>
          <form onSubmit={onSearch} className="mt-6 flex flex-col gap-2 sm:flex-row">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Busque por peça, código, marca ou aplicação"
              className="min-h-12 flex-1 rounded-[10px] border border-hf-line bg-hf-surface px-4 text-sm text-hf-ink outline-none focus:border-hf-red"
              aria-label="Busca rápida"
            />
            <Button type="submit" variant="primary">
              Buscar
            </Button>
          </form>
          <div className="mt-4 flex flex-wrap gap-2">
            {loggedIn ? (
              <Link to="/catalogo">
                <Button variant="dark">Explorar catálogo</Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="primary">Entrar</Button>
                </Link>
                <Link to="/cadastro">
                  <Button variant="outline">Solicitar acesso</Button>
                </Link>
              </>
            )}
            <WhatsAppButton message={buildHomeWhatsAppMessage()}>Falar com a HF</WhatsAppButton>
          </div>
        </Container>
      </section>

      <section className="border-b border-hf-line py-8 sm:py-10">
        <Container>
          <h2 className="m-0 text-xl font-extrabold text-hf-ink">Como encontrar</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              {
                to: '/busca',
                title: 'Buscar peça',
                desc: 'Nome, descrição ou aplicação.',
              },
              {
                to: '/busca',
                title: 'Buscar código',
                desc: 'SKU / código de referência.',
              },
              {
                to: '/veiculo',
                title: 'Por veículo',
                desc: 'Montadora, modelo e ano.',
              },
            ].map((c) => (
              <Link
                key={c.title}
                to={c.to}
                className="rounded-[14px] border border-hf-line bg-hf-surface p-4 transition hover:border-hf-red"
              >
                <h3 className="m-0 text-lg font-extrabold text-hf-ink">{c.title}</h3>
                <p className="mt-1 mb-0 text-sm text-hf-muted">{c.desc}</p>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      <section className="border-b border-hf-line bg-hf-bg-2 py-8 sm:py-10">
        <Container>
          <div className="mb-4 flex items-end justify-between gap-3">
            <h2 className="m-0 text-xl font-extrabold text-hf-ink">Categorias</h2>
            <Link to="/categorias" className="text-sm font-semibold text-hf-red-bright">
              Ver todas →
            </Link>
          </div>
          {categories.loading ? <Loading /> : null}
          {categories.error ? <ErrorState message={categories.error} /> : null}
          {!categories.loading && categories.data.length === 0 ? (
            <EmptyState title="Categorias em breve" description="Cadastre categorias no admin." />
          ) : null}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
            {categories.data.slice(0, 8).map((c) => (
              <CategoryCard key={c.id} category={c} />
            ))}
          </div>
        </Container>
      </section>

      <section className="border-b border-hf-line py-8 sm:py-10">
        <Container>
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="m-0 text-xl font-extrabold text-hf-ink">Destaques</h2>
              <p className="mt-1 text-sm text-hf-muted">Sem ofertas ou preço — só o catálogo autorizado</p>
            </div>
            <Link to="/catalogo" className="text-sm font-semibold text-hf-red-bright">
              Ver catálogo →
            </Link>
          </div>
          {featured.loading ? <Loading /> : null}
          {featured.error ? <ErrorState message={featured.error} /> : null}
          {!featured.loading && featured.data.length === 0 ? (
            <EmptyState
              title="Nenhum destaque ainda"
              description={loggedIn ? 'Publique produtos no admin.' : 'Entre para ver o catálogo autorizado.'}
              actionLabel={loggedIn ? 'Catálogo' : 'Entrar'}
              actionTo={loggedIn ? '/catalogo' : '/login'}
            />
          ) : null}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
            {featured.data.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </Container>
      </section>

      <section className="border-b border-hf-line bg-hf-bg-2 py-8 sm:py-10">
        <Container>
          <div className="mb-4 flex items-end justify-between gap-3">
            <h2 className="m-0 text-xl font-extrabold text-hf-ink">Marcas</h2>
            <Link to="/marcas" className="text-sm font-semibold text-hf-red-bright">
              Ver todas →
            </Link>
          </div>
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
            {brands.length === 0 ? (
              <p className="text-sm text-hf-muted">Marcas aparecerão após o cadastro no admin.</p>
            ) : null}
          </div>
        </Container>
      </section>

      <section className="border-b border-hf-line py-8 sm:py-10">
        <Container>
          <div className="mb-4 flex items-end justify-between gap-3">
            <h2 className="m-0 text-xl font-extrabold text-hf-ink">Aplicações</h2>
            <Link to="/veiculo" className="text-sm font-semibold text-hf-red-bright">
              Buscar por veículo →
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {makers.map((m) => (
              <Link
                key={m}
                to={`/veiculo?maker=${encodeURIComponent(m)}`}
                className="rounded-[10px] border border-hf-line bg-hf-surface px-3 py-2 text-sm font-semibold text-hf-ink hover:border-hf-red"
              >
                {m}
              </Link>
            ))}
            {makers.length === 0 ? (
              <p className="text-sm text-hf-muted">Montadoras aparecerão após o cadastro de veículos.</p>
            ) : null}
          </div>
        </Container>
      </section>

      <section className="py-10 sm:py-12">
        <Container className="rounded-[14px] border border-hf-line bg-hf-surface p-6 text-center sm:p-8">
          <h2 className="m-0 text-2xl font-black text-hf-ink">Precisa de ajuda?</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-hf-muted">
            Fale com o time HF no WhatsApp para disponibilidade, aplicações e códigos.
          </p>
          <div className="mt-5 flex justify-center">
            <WhatsAppButton message={buildHomeWhatsAppMessage()}>Falar com a HF</WhatsAppButton>
          </div>
        </Container>
      </section>
    </>
  )
}
