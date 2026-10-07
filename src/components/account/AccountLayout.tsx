import { Button } from '@/components/common/Button'
import { Container } from '@/components/layout/Container'
import { useAuth } from '@/contexts/AuthContext'
import { isStaffRole } from '@/services/admin/staffService'
import { Link, NavLink, Outlet } from 'react-router-dom'

const links = [
  { to: '/conta', label: 'Início', end: true },
  { to: '/conta/perfil', label: 'Perfil' },
  { to: '/conta/veiculos', label: 'Meus veículos' },
]

function navClass({ isActive }: { isActive: boolean }) {
  return [
    'whitespace-nowrap rounded-full border px-3 py-2 text-sm transition lg:block lg:rounded-none lg:border-0 lg:border-b lg:border-fal-line lg:px-3 lg:py-3',
    isActive
      ? 'border-fal-navy bg-fal-navy font-extrabold text-white lg:bg-[#f7f8f9] lg:text-fal-navy'
      : 'border-fal-line bg-white text-fal-navy hover:bg-[#f7f8f9] lg:font-normal',
  ].join(' ')
}

export function AccountLayout() {
  const { user, signOut } = useAuth()
  const isStaff = isStaffRole(user?.role)
  const firstName = (user?.fullName ?? user?.email ?? 'cliente').split(' ')[0]

  return (
    <Container className="py-6 sm:py-8">
      <h1 className="mt-0 mb-1 text-[24px] font-extrabold sm:mb-2 sm:text-[34px]">Minha conta</h1>
      <p className="mb-4 text-fal-muted sm:mb-6">Olá, {firstName}.</p>

      {/* Mobile: nav compacta horizontal antes do conteúdo */}
      <nav
        className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1 lg:hidden"
        aria-label="Menu da conta"
      >
        {links.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={navClass}>
            {item.label}
          </NavLink>
        ))}
        {isStaff ? (
          <Link
            to="/admin"
            className="whitespace-nowrap rounded-full border border-fal-yellow bg-fal-yellow px-3 py-2 text-sm font-extrabold text-fal-navy-dark"
          >
            Admin
          </Link>
        ) : null}
      </nav>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="hidden rounded-fal border border-fal-line bg-white lg:block">
          <nav className="lg:block">
            {links.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={navClass}>
                {item.label}
              </NavLink>
            ))}
            {isStaff ? (
              <Link
                to="/admin"
                className="block border-b border-fal-line px-3 py-3 text-sm font-extrabold text-fal-navy hover:bg-[#f7f8f9]"
              >
                Painel Administrativo
              </Link>
            ) : null}
          </nav>
          <Button variant="danger" fullWidth className="mt-3" onClick={() => void signOut()}>
            Sair
          </Button>
        </aside>

        <section className="min-w-0">
          <Outlet />
          <div className="mt-6 lg:hidden">
            <Button variant="danger" fullWidth onClick={() => void signOut()}>
              Sair
            </Button>
          </div>
        </section>
      </div>
    </Container>
  )
}
