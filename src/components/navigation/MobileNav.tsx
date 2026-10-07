import { NavLink } from 'react-router-dom'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'min-w-[44px] text-center text-[10px]',
    isActive ? 'font-extrabold text-fal-navy-dark' : 'text-fal-navy',
  ].join(' ')

export function MobileNav() {
  return (
    <nav
      className="fixed right-0 bottom-0 left-0 z-[150] flex justify-around border-t border-fal-line bg-white px-0.5 py-[7px] pb-[calc(7px+env(safe-area-inset-bottom))] md:hidden"
      aria-label="Navegação mobile"
    >
      <NavLink to="/" end className={linkClass}>
        <b className="block text-[18px]">⌂</b>
        Início
      </NavLink>
      <NavLink to="/catalogo" className={linkClass}>
        <b className="block text-[18px]">⌕</b>
        Buscar
      </NavLink>
      <NavLink to="/veiculo" className={linkClass}>
        <b className="block text-[18px]">🚗</b>
        Veículo
      </NavLink>
      <NavLink to="/conta" className={linkClass}>
        <b className="block text-[18px]">👤</b>
        Conta
      </NavLink>
    </nav>
  )
}
