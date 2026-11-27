import { NavLink, Outlet } from 'react-router-dom'

type PedMenuItem = {
  to: string
  label: string
  end?: boolean
  disabled?: boolean
  hint?: string
}

const MENU: PedMenuItem[] = [
  { to: '/admin/pedidos', label: 'Visão geral', end: true },
  { to: '/admin/pedidos/solicitacoes', label: 'Solicitações' },
  { to: '/admin/pedidos/cotacoes', label: 'Cotações' },
  {
    to: '/admin/pedidos/lista',
    label: 'Pedidos',
    disabled: true,
    hint: 'Em breve — checkout e status de pedido',
  },
  {
    to: '/admin/pedidos/logistica',
    label: 'Logística',
    disabled: true,
    hint: 'Em breve — expedição e entrega',
  },
]

function menuClass({ isActive }: { isActive: boolean }) {
  return [
    'block w-full rounded-[10px] px-3 py-2 text-left text-sm font-semibold transition',
    isActive ? 'bg-hf-red text-white' : 'text-hf-ink hover:bg-hf-bg',
  ].join(' ')
}

/** Central de Pedidos — menu + conteúdo (padrão Finanças). */
export function AdminPedidosLayout() {
  return (
    <div
      className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row lg:gap-4"
      data-admin-pedidos-central
    >
      <aside className="shrink-0 lg:w-56">
        <div className="rounded-[14px] border border-hf-line bg-hf-surface p-3">
          <p className="m-0 text-[10px] font-extrabold uppercase tracking-wide text-hf-muted">
            Central de Pedidos
          </p>
          <p className="mb-2 mt-1 text-xs text-hf-muted">
            Cotações agora. Pedidos e logística depois.
          </p>
          <nav className="flex flex-col gap-1" aria-label="Menu Pedidos">
            {MENU.map((item) =>
              item.disabled ? (
                <span
                  key={item.label}
                  className="block cursor-not-allowed rounded-[10px] px-3 py-2 text-left text-sm font-semibold text-hf-muted opacity-70"
                  title={item.hint}
                >
                  {item.label}
                  <span className="mt-0.5 block text-[10px] font-normal">Em breve</span>
                </span>
              ) : (
                <NavLink key={item.to} to={item.to} end={item.end} className={menuClass}>
                  {item.label}
                </NavLink>
              ),
            )}
          </nav>
        </div>
      </aside>
      <div className="min-h-0 min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  )
}
