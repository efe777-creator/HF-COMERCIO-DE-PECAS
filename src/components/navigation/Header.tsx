import { AccountButton } from './AccountButton'
import { Logo } from './Logo'
import { NavBar } from './NavBar'
import { SearchBar } from './SearchBar'
import { MobileDrawer } from './MobileDrawer'
import { Container } from '@/components/layout/Container'
import { useCategories } from '@/hooks/useCatalog'
import { useState } from 'react'
import { Link } from 'react-router-dom'

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const categories = useCategories()

  return (
    <header className="sticky top-0 z-[100] border-b border-fal-line bg-white">
      <Container className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-2 py-2 sm:gap-x-4 sm:py-2.5 lg:grid-cols-[180px_minmax(0,1fr)_auto] lg:min-h-[84px] lg:gap-x-[22px] lg:py-3">
        <Logo />
        <SearchBar />
        <div className="flex items-center justify-end gap-2 lg:gap-4">
          <div className="hidden items-center gap-4 lg:flex">
            <AccountButton />
          </div>
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-[10px] border border-fal-line bg-white text-lg lg:hidden"
            aria-label="Abrir menu"
            onClick={() => setMenuOpen(true)}
          >
            ☰
          </button>
        </div>
      </Container>
      <NavBar />

      <MobileDrawer open={menuOpen} title="Menu" onClose={() => setMenuOpen(false)}>
        <nav className="flex flex-col gap-1 text-sm">
          <Link
            to="/"
            className="rounded-[10px] px-3 py-2.5 font-semibold text-fal-navy hover:bg-fal-bg"
            onClick={() => setMenuOpen(false)}
          >
            Início
          </Link>
          <Link
            to="/catalogo"
            className="rounded-[10px] px-3 py-2.5 font-semibold text-fal-navy hover:bg-fal-bg"
            onClick={() => setMenuOpen(false)}
          >
            Catálogo / buscar peça
          </Link>
          <Link
            to="/veiculo"
            className="rounded-[10px] px-3 py-2.5 font-semibold text-fal-navy hover:bg-fal-bg"
            onClick={() => setMenuOpen(false)}
          >
            Buscar pelo carro
          </Link>
          <Link
            to="/conta"
            className="rounded-[10px] px-3 py-2.5 font-semibold text-fal-navy hover:bg-fal-bg"
            onClick={() => setMenuOpen(false)}
          >
            Minha conta
          </Link>
          {categories.data.length > 0 ? (
            <>
              <p className="mt-3 mb-1 px-3 text-xs font-bold uppercase tracking-wide text-fal-muted">
                Categorias
              </p>
              {categories.data.slice(0, 12).map((cat) => (
                <Link
                  key={cat.id}
                  to={`/catalogo?cat=${encodeURIComponent(cat.slug)}`}
                  className="rounded-[10px] px-3 py-2 text-fal-navy hover:bg-fal-bg"
                  onClick={() => setMenuOpen(false)}
                >
                  {cat.name}
                </Link>
              ))}
            </>
          ) : null}
        </nav>
      </MobileDrawer>
    </header>
  )
}
