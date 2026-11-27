import { adminListLeads } from '@/services/leads/leadService'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

/** Landing da Central de Pedidos. */
export function AdminPedidosHomePage() {
  const [newQuotes, setNewQuotes] = useState<number | null>(null)

  useEffect(() => {
    let alive = true
    void adminListLeads('quote')
      .then((rows) => {
        if (!alive) return
        setNewQuotes(rows.filter((r) => r.status === 'new').length)
      })
      .catch(() => {
        if (alive) setNewQuotes(null)
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
          Operação comercial Andar 1: fila de <strong>Cotações</strong> da cesta do site. Pedidos
          com checkout e logística entram depois — o menu já reserva o espaço.
        </p>
      </div>

      <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2">
        <li>
          <Link
            to="/admin/pedidos/cotacoes"
            className="block rounded-[14px] border border-hf-line bg-hf-surface p-4 transition hover:border-hf-red/40"
          >
            <p className="m-0 text-sm font-extrabold text-hf-ink">Cotações</p>
            <p className="mb-0 mt-1 text-xs text-hf-muted">
              Leads da cesta multi-item · status · itens · protocolo.
            </p>
            <p className="mb-0 mt-2 text-xs font-semibold text-hf-red">
              {newQuotes != null ? `${newQuotes} nova(s) · Abrir →` : 'Abrir →'}
            </p>
          </Link>
        </li>
        <li>
          <div className="rounded-[14px] border border-dashed border-hf-line bg-hf-bg/40 p-4 opacity-80">
            <p className="m-0 text-sm font-extrabold text-hf-muted">Pedidos</p>
            <p className="mb-0 mt-1 text-xs text-hf-muted">
              Checkout e status — próximo ciclo.
            </p>
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
