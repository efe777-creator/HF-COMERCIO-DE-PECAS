import { adminListLeads } from '@/services/leads/leadService'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

/** Landing da Central de Pedidos. */
export function AdminPedidosHomePage() {
  const [kpis, setKpis] = useState<{
    solicitacoesNovas: number
    cotacoesNovas: number
    cotacoesAbertas: number
  } | null>(null)

  useEffect(() => {
    let alive = true
    void adminListLeads('all')
      .then((rows) => {
        if (!alive) return
        const solicitacoes = rows.filter((r) => r.kind === 'partner' || r.kind === 'contact')
        const quotes = rows.filter((r) => r.kind === 'quote')
        setKpis({
          solicitacoesNovas: solicitacoes.filter((r) => r.status === 'new').length,
          cotacoesNovas: quotes.filter((r) => r.status === 'new').length,
          cotacoesAbertas: quotes.filter(
            (r) => r.status === 'new' || r.status === 'in_progress',
          ).length,
        })
      })
      .catch(() => {
        if (alive) setKpis(null)
      })
    return () => {
      alive = false
    }
  }, [])

  return (
    <div className="space-y-4 p-1 sm:p-2" data-admin-pedidos-home>
      <div>
        <h1 className="m-0 text-xl font-extrabold text-hf-ink sm:text-2xl">
          Central de Pedidos
        </h1>
        <p className="mt-1 mb-0 max-w-2xl text-xs text-hf-muted sm:text-sm">
          Jornada comercial Andar 1: solicitações, cotações da cesta e encaminhamento. Pedidos com
          checkout entram depois.
        </p>
      </div>

      <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2">
        <li>
          <Link
            to="/admin/pedidos/solicitacoes"
            className="block rounded-[14px] border border-hf-line bg-hf-surface p-4 transition hover:border-hf-red/40"
          >
            <p className="m-0 text-sm font-extrabold text-hf-ink">Solicitações</p>
            <p className="mb-0 mt-1 text-xs text-hf-muted">
              Cadastro comercial partner/contact · aprovação com gates.
            </p>
            <p className="mb-0 mt-2 text-xs font-semibold text-hf-red">
              {kpis != null
                ? `${kpis.solicitacoesNovas} nova(s) · Abrir →`
                : 'Abrir →'}
            </p>
          </Link>
        </li>
        <li>
          <Link
            to="/admin/pedidos/cotacoes"
            className="block rounded-[14px] border border-hf-line bg-hf-surface p-4 transition hover:border-hf-red/40"
          >
            <p className="m-0 text-sm font-extrabold text-hf-ink">Cotações</p>
            <p className="mb-0 mt-1 text-xs text-hf-muted">
              Cesta multi-item · encaminhar · encerrar com motivo.
            </p>
            <p className="mb-0 mt-2 text-xs font-semibold text-hf-red">
              {kpis != null
                ? `${kpis.cotacoesNovas} nova(s) · ${kpis.cotacoesAbertas} aberta(s) · Abrir →`
                : 'Abrir →'}
            </p>
          </Link>
        </li>
        <li>
          <div className="rounded-[14px] border border-dashed border-hf-line bg-hf-bg/40 p-4 opacity-80">
            <p className="m-0 text-sm font-extrabold text-hf-muted">Pedidos</p>
            <p className="mb-0 mt-1 text-xs text-hf-muted">Checkout e status — próximo ciclo.</p>
            <p className="mb-0 mt-2 text-[10px] font-bold uppercase tracking-wide text-hf-muted">
              Em breve
            </p>
          </div>
        </li>
        <li>
          <div className="rounded-[14px] border border-dashed border-hf-line bg-hf-bg/40 p-4 opacity-80">
            <p className="m-0 text-sm font-extrabold text-hf-muted">Logística</p>
            <p className="mb-0 mt-1 text-xs text-hf-muted">Expedição e entrega — depois do pedido.</p>
            <p className="mb-0 mt-2 text-[10px] font-bold uppercase tracking-wide text-hf-muted">
              Em breve
            </p>
          </div>
        </li>
      </ul>
    </div>
  )
}
