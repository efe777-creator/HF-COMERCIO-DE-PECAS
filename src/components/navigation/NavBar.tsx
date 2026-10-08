import { Container } from '@/components/layout/Container'
import { NavLink } from 'react-router-dom'

const links = [
  { to: '/catalogo', label: 'Catálogo' },
  { to: '/categorias', label: 'Categorias' },
  { to: '/marcas', label: 'Marcas' },
  { to: '/veiculo', label: 'Aplicações' },
  { to: '/atendimento', label: 'Atendimento' },
]

export function NavBar() {
  return (
    <nav className="hidden border-t border-hf-line bg-hf-surface-2 text-white lg:block">
      <Container className="flex flex-nowrap items-center gap-1 overflow-x-auto">
        {links.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              [
                'shrink-0 whitespace-nowrap px-[15px] py-[13px] text-sm font-semibold transition',
                isActive ? 'bg-hf-red text-white' : 'hover:bg-hf-surface/20',
              ].join(' ')
            }
          >
            {item.label}
          </NavLink>
        ))}
      </Container>
    </nav>
  )
}
