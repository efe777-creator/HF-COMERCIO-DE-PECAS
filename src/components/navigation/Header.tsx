import { AccountButton } from './AccountButton'
import { Logo } from './Logo'
import { NavBar } from './NavBar'
import { SearchBar } from './SearchBar'
import { MobileDrawer } from './MobileDrawer'
import { Container } from '@/components/layout/Container'
import { useState } from 'react'
import { Link } from 'react-router-dom'

const mobileLinks = [
  { to: '/', label: 'Início' },
  { to: '/catalogo', label: 'Catálogo' },
  { to: '/categorias', label: 'Categorias' },
  { to: '/marcas', label: 'Marcas' },
  { to: '/veiculo', label: 'Aplicações' },
  { to: '/atendimento', label: 'Atendimento' },
  { to: '/conta', label: 'Minha conta' },
]

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-[100] border-b border-hf-line bg-hf-bg/92 backdrop-blur-md">
      <Container className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-2 py-2 sm:gap-x-4 sm:py-2.5 lg:grid-cols-[160px_minmax(0,1fr)_auto] lg:min-h-[84px] lg:gap-x-[22px] lg:py-3">
        <div className="flex items-center gap-2 lg:contents">
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-[10px] border border-hf-line bg-hf-surface text-lg text-hf-ink lg:hidden"
            aria-label="Abrir menu"
            onClick={() => setMenuOpen(true)}
          >
            ☰
          </button>
          <Logo />
        </div>
        <div className="col-span-3 order-last w-full lg:col-span-1 lg:order-none">
          <SearchBar />
        </div>
        <div className="flex items-center justify-end gap-2 lg:gap-4">
          <AccountButton />
        </div>
      </Container>
      <NavBar />

      <MobileDrawer open={menuOpen} title="Menu HF" onClose={() => setMenuOpen(false)}>
        <nav className="flex flex-col gap-1 text-sm">
          {mobileLinks.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-[10px] px-3 py-2.5 font-semibold text-hf-ink hover:bg-hf-surface"
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </MobileDrawer>
    </header>
  )
}
