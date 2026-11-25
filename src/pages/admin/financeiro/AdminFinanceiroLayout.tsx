import { NavLink, Outlet } from 'react-router-dom'

type FinMenuItem = {
  to: string
  label: string
  end?: boolean
  disabled?: boolean
  hint?: string
}

const MENU: FinMenuItem[] = [
  { to: '/admin/financeiro', label: 'Visão geral', end: true },
  { to: '/admin/financeiro/condicoes', label: 'Condições de pagamento' },
  {
    to: '/admin/financeiro/entradas',
    label: 'Entradas',
    disabled: true,
    hint: 'Em breve — títulos a receber',
  },
  {
    to: '/admin/financeiro/saidas',
    label: 'Saídas',
    disabled: true,
    hint: 'Em breve — contas a pagar',
  },
  {
    to: '/admin/financeiro/ajustes',
    label: 'Ajustes',
    disabled: true,
    hint: 'Em breve — frete e descontos de documento',
  },
]

function menuClass({ isActive }: { isActive: boolean }) {
  return [
    'block w-full rounded-[10px] px-3 py-2 text-left text-sm font-semibold transition',
    isActive
      ? 'bg-hf-red text-white'
      : 'text-hf-ink hover:bg-hf-bg',
  ].join(' ')
}

/** Central de Finanças — menu de módulos + conteúdo. */
export function AdminFinanceiroLayout() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row lg:gap-4" data-admin-financeiro-central>
      <aside className="shrink-0 lg:w-56">
        <div className="rounded-[14px] border border-hf-line bg-hf-surface p-3">
          <p className="m-0 text-[10px] font-extrabold uppercase tracking-wide text-hf-muted">
            Central de Finanças
          </p>
          <p className="mb-2 mt-1 text-xs text-hf-muted">
            Condições agora. Entradas, saídas e ajustes depois.
          </p>
          <nav className="flex flex-col gap-1" aria-label="Menu Finanças">
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
