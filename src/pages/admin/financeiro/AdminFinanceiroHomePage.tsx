import { Link } from 'react-router-dom'

const MODULES = [
  {
    to: '/admin/financeiro/condicoes',
    title: 'Condições de pagamento',
    desc: 'Agenda, meios (Pix/crédito/…), acréscimo ou desconto, liberação para clientes.',
    live: true,
  },
  {
    to: null,
    title: 'Entradas',
    desc: 'Contas a receber / títulos — próximo epic.',
    live: false,
  },
  {
    to: null,
    title: 'Saídas',
    desc: 'Contas a pagar — próximo epic.',
    live: false,
  },
  {
    to: null,
    title: 'Ajustes',
    desc: 'Frete e descontos de documento — próximo epic.',
    live: false,
  },
] as const

/** Landing da Central de Finanças. */
export function AdminFinanceiroHomePage() {
  return (
    <div className="space-y-4 p-1 sm:p-2" data-admin-financeiro-home>
      <div>
        <h1 className="m-0 text-xl font-extrabold text-hf-ink sm:text-2xl">Central de Finanças</h1>
        <p className="mt-1 mb-0 max-w-2xl text-xs text-hf-muted sm:text-sm">
          Escolha um módulo no menu. Nesta base Andar 1 só <strong>Condições de pagamento</strong>{' '}
          está ativo — sem pedidos, checkout ou títulos.
        </p>
      </div>

      <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2">
        {MODULES.map((m) => (
          <li key={m.title}>
            {m.live && m.to ? (
              <Link
                to={m.to}
                className="block rounded-[14px] border border-hf-line bg-hf-surface p-4 transition hover:border-hf-red/40"
              >
                <p className="m-0 text-sm font-extrabold text-hf-ink">{m.title}</p>
                <p className="mb-0 mt-1 text-xs text-hf-muted">{m.desc}</p>
                <p className="mb-0 mt-2 text-xs font-semibold text-hf-red">Abrir →</p>
              </Link>
            ) : (
              <div className="rounded-[14px] border border-dashed border-hf-line bg-hf-bg/40 p-4 opacity-80">
                <p className="m-0 text-sm font-extrabold text-hf-muted">{m.title}</p>
                <p className="mb-0 mt-1 text-xs text-hf-muted">{m.desc}</p>
                <p className="mb-0 mt-2 text-[10px] font-bold uppercase tracking-wide text-hf-muted">
                  Em breve
                </p>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
