import { Loading } from '@/components/common/Loading'
import { ScrollToTop } from '@/components/navigation/ScrollToTop'
import { useAuth } from '@/contexts/AuthContext'
import { Suspense, useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'

type AdminNavLink = {
  to: string
  label: string
  /** Match só a rota exata (não filhos). */
  end?: boolean
  /**
   * Quando o destino é prefixo de outro item do menu (ex.: Produtos vs Importações),
   * evita acender os dois ao mesmo tempo.
   */
  inactiveUnder?: string[]
}

const catalogLinks: AdminNavLink[] = [
  {
    to: '/admin/produtos',
    label: 'Produtos',
    inactiveUnder: ['/admin/produtos/importacoes'],
  },
  { to: '/admin/kits', label: 'Kits' },
  { to: '/admin/produtos/importacoes', label: 'Importações' },
  { to: '/admin/categorias', label: 'Categorias' },
  { to: '/admin/veiculos', label: 'Veículos' },
  { to: '/admin/fornecedores', label: 'Fornecedores' },
  { to: '/admin/precos', label: 'Listas de preço' },
]

const commercialLinks: AdminNavLink[] = [
  { to: '/admin/financeiro', label: 'Finanças' },
  { to: '/admin/comunicacao', label: 'Central de Comunicação' },
  { to: '/admin/campanhas', label: 'Campanhas' },
  { to: '/admin/cotacoes', label: 'Cotações (leads)' },
  { to: '/admin/leads', label: 'Leads (inbox)' },
]

const clientsLinks: AdminNavLink[] = [
  { to: '/admin/clientes', label: 'Clientes B2B' },
  { to: '/admin/grupos', label: 'Grupos' },
]

const opsLinks: AdminNavLink[] = [{ to: '/admin/operadores', label: 'Usuários / operadores' }]

function linkClass({ isActive }: { isActive: boolean }) {
  return [
    'block rounded-lg px-3 py-2 text-sm font-semibold transition',
    isActive ? 'bg-hf-red text-white' : 'text-white/85 hover:bg-hf-surface/10',
  ].join(' ')
}

function navLinkIsActive(
  link: AdminNavLink,
  pathname: string,
  defaultActive: boolean,
): boolean {
  if (link.inactiveUnder?.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return false
  }
  return defaultActive
}

function NavSection({
  title,
  links,
  onNavigate,
}: {
  title: string
  links: AdminNavLink[]
  onNavigate: () => void
}) {
  const { pathname } = useLocation()
  return (
    <div>
      <p className="mb-1.5 px-3 text-[11px] font-bold uppercase tracking-wide text-white/45">
        {title}
      </p>
      <div className="space-y-0.5">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) =>
              linkClass({
                isActive: navLinkIsActive(l, pathname, isActive),
              })
            }
            onClick={onNavigate}
          >
            {l.label}
          </NavLink>
        ))}
      </div>
    </div>
  )
}

export function AdminLayout() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const [navOpen, setNavOpen] = useState(false)

  useEffect(() => {
    setNavOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!navOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [navOpen])

  const closeNav = () => setNavOpen(false)
  const userLabel = user?.email ?? user?.fullName ?? 'staff'

  const aside = (
    <aside
      className={[
        'flex w-[min(288px,88vw)] flex-col bg-hf-surface-2 text-white lg:w-[260px] lg:shrink-0',
        'fixed inset-y-0 left-0 z-40 h-screen transition-transform duration-200 ease-out',
        'lg:sticky lg:top-0 lg:z-0 lg:translate-x-0 lg:transition-none',
        navOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      ].join(' ')}
    >
      <div className="shrink-0 border-b border-white/10 px-4 py-4 lg:py-5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-hf-red-bright">HF ADMIN</p>
            <p className="mt-1 truncate text-sm text-white/65">Catálogo e cadastros</p>
          </div>
          <button
            type="button"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white/80 hover:bg-hf-surface/10 lg:hidden"
            aria-label="Fechar menu"
            onClick={closeNav}
          >
            <span className="text-xl leading-none" aria-hidden>
              ×
            </span>
          </button>
        </div>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-3">
          <div>
            <NavLink to="/admin" end className={linkClass} onClick={closeNav}>
              Dashboard
            </NavLink>
          </div>
          <NavSection title="Catálogo" links={catalogLinks} onNavigate={closeNav} />
          <NavSection title="Comercial" links={commercialLinks} onNavigate={closeNav} />
          <NavSection title="Clientes" links={clientsLinks} onNavigate={closeNav} />
          <NavSection title="Sistema" links={opsLinks} onNavigate={closeNav} />
        </div>

        <div className="shrink-0 space-y-0.5 border-t border-white/10 p-3">
          <NavLink to="/" className={linkClass} onClick={closeNav}>
            Voltar ao catálogo
          </NavLink>
          <button
            type="button"
            onClick={() => void signOut()}
            title={userLabel}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-white/70 hover:bg-hf-surface/10"
          >
            <span className="shrink-0">Sair</span>
            <span className="min-w-0 truncate text-white/45">({userLabel})</span>
          </button>
        </div>
      </nav>
    </aside>
  )

  return (
    <div className="min-h-screen bg-hf-bg lg:flex">
      <ScrollToTop />
      {navOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/45 lg:hidden"
          aria-label="Fechar menu"
          onClick={closeNav}
        />
      ) : null}

      {aside}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-hf-line bg-hf-surface px-4 py-3 lg:hidden">
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-lg border border-hf-line bg-hf-bg text-hf-ink"
            aria-label="Abrir menu"
            aria-expanded={navOpen}
            onClick={() => setNavOpen(true)}
          >
            <span className="flex flex-col gap-1" aria-hidden>
              <span className="block h-0.5 w-4 rounded bg-hf-surface-2" />
              <span className="block h-0.5 w-4 rounded bg-hf-surface-2" />
              <span className="block h-0.5 w-4 rounded bg-hf-surface-2" />
            </span>
          </button>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-hf-ink">HF ADMIN</p>
            <p className="truncate text-sm text-hf-muted">Menu</p>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-4 md:p-6">
          <Suspense fallback={<Loading label="Carregando admin…" />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  )
}
