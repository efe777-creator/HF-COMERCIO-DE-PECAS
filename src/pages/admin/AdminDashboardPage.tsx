import { Loading } from '@/components/common/Loading'
import { adminErrorMessage } from '@/lib/adminErrorMessage'
import { adminGetDashboardCounts, type AdminDashboardCounts } from '@/services/admin/adminDashboardService'
import { Link } from 'react-router-dom'
import { businessConfig } from '@/config/business'
import { useEffect, useState } from 'react'

const shortcuts = [
  { to: '/admin/produtos', title: 'Produtos', desc: 'Peça + aplicações (vínculo versão · motor · período)' },
  { to: '/admin/veiculos', title: 'Veículos', desc: 'Cadastro do carro (versão → motor → período)' },
  { to: '/admin/campanhas', title: 'Campanhas', desc: 'Destaques na home' },
  { to: '/admin/cotacoes', title: 'Cotações (leads)', desc: 'Pedidos de cotação' },
  { to: '/admin/clientes/listas', title: 'Listas B2B', desc: 'Visibilidade — dentro de Clientes' },
  { to: '/admin/clientes', title: 'Clientes B2B', desc: 'Cadastro, status e catálogos' },
  { to: '/admin/kits', title: 'Kits', desc: 'BOM + fotos dos itens' },
  { to: '/admin/produtos/importacoes', title: 'Importações', desc: 'Hub CSV / XLSX / imagens / custos' },
  { to: '/admin/categorias', title: 'Categorias', desc: 'Taxonomia do catálogo' },
]

export function AdminDashboardPage() {
  const [counts, setCounts] = useState<AdminDashboardCounts | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setError(null)
      setLoading(true)
      try {
        const next = await adminGetDashboardCounts()
        if (cancelled) return
        setCounts(next)
        setError(null)
      } catch (e) {
        if (cancelled) return
        setError(adminErrorMessage(e, 'Falha ao carregar indicadores do dashboard.'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="m-0 text-2xl font-extrabold text-hf-ink">Dashboard</h1>
        <p className="mt-1 text-sm text-hf-muted">
          {businessConfig.companyName} — administração do catálogo digital.
        </p>
      </div>

      {error ? <p className="text-sm text-hf-danger">{error}</p> : null}
      {loading ? <Loading label="Indicadores…" /> : null}

      {counts ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Produtos publicados', value: counts.publishedProducts, to: '/admin/produtos' },
            { label: 'Aplicações', value: counts.pvcRows, to: '/admin/produtos' },
            { label: 'Leads novos', value: counts.leadsNew, to: '/admin/leads' },
            { label: 'Campanhas ativas', value: counts.campaignsActive, to: '/admin/campanhas' },
          ].map((c) => (
            <Link
              key={c.label}
              to={c.to}
              className="rounded-hf border border-hf-line bg-hf-surface p-4 transition hover:border-hf-red"
            >
              <p className="m-0 text-xs font-bold uppercase tracking-wide text-hf-muted">{c.label}</p>
              <p className="m-0 mt-2 text-3xl font-black text-hf-ink">{c.value}</p>
            </Link>
          ))}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {shortcuts.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="rounded-hf border border-hf-line bg-hf-surface p-4 transition hover:border-hf-red hover:shadow-hf"
          >
            <h2 className="m-0 text-base font-extrabold text-hf-ink">{item.title}</h2>
            <p className="mb-0 mt-1 text-sm text-hf-muted">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}