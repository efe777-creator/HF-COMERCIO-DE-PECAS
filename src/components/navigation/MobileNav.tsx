import { features } from '@/config/features'
import { useQuoteBasket } from '@/hooks/useQuoteBasket'
import { NavLink } from 'react-router-dom'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'relative min-w-[44px] text-center text-[10px]',
    isActive ? 'font-extrabold text-hf-red-bright' : 'text-hf-muted',
  ].join(' ')

/** Altura aproximada da bottom bar (conteúdo + safe-area) — sticky PDP fica acima. */
export const MOBILE_NAV_OFFSET =
  'calc(56px + env(safe-area-inset-bottom, 0px))'

export function MobileNav() {
  const { count } = useQuoteBasket()

  return (
    <nav
      className="fixed right-0 bottom-0 left-0 z-[150] flex justify-around border-t border-hf-line bg-hf-bg px-0.5 py-[7px] pb-[calc(7px+env(safe-area-inset-bottom))] md:hidden"
      aria-label="Navegação mobile"
      data-mobile-nav
    >
      <NavLink to="/" end className={linkClass}>
        <b className="block text-[18px]">⌂</b>
        Início
      </NavLink>
      <NavLink to="/catalogo" className={linkClass}>
        <b className="block text-[18px]">⌕</b>
        Buscar
      </NavLink>
      {features.quotation_enabled ? (
        <NavLink to="/cotacao" className={linkClass} aria-label={count > 0 ? `Cotação com ${count} itens` : 'Cotação'}>
          <span className="relative inline-block">
            <b className="block text-[18px]">☰</b>
            {count > 0 ? (
              <span className="absolute -top-1 -right-3 min-w-[14px] rounded-full bg-hf-red px-1 text-[9px] font-bold leading-[14px] text-white">
                {count > 99 ? '99+' : count}
              </span>
            ) : null}
          </span>
          Cotação
        </NavLink>
      ) : null}
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
