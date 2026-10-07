import { Link } from 'react-router-dom'
import { businessConfig } from '@/config/business'

const shortcuts = [
  { to: '/admin/produtos', title: 'Produtos', desc: 'Cadastrar, editar e publicar' },
  { to: '/admin/listas', title: 'Listas de catálogo', desc: 'Conjuntos de produtos B2B' },
  { to: '/admin/clientes', title: 'Clientes B2B', desc: 'Cadastro, status e catálogos' },
  { to: '/admin/grupos', title: 'Grupos', desc: 'Herança de catálogo por grupo' },
  { to: '/admin/produtos/importar', title: 'Importações', desc: 'CSV / XLSX de catálogo' },
  { to: '/admin/categorias', title: 'Categorias', desc: 'Taxonomia do catálogo' },
  { to: '/admin/fabricantes', title: 'Marcas', desc: 'Marcas de peça' },
  { to: '/admin/montadoras', title: 'Montadoras', desc: 'Marcas de veículo' },
  { to: '/admin/veiculos', title: 'Aplicações', desc: 'Modelos e versões' },
  { to: '/admin/fornecedores', title: 'Fornecedores', desc: 'Códigos de fornecedor' },
  { to: '/admin/operadores', title: 'Usuários', desc: 'Operadores e permissões' },
]

export function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="m-0 text-2xl font-extrabold text-hf-ink">Dashboard</h1>
        <p className="mt-1 text-sm text-hf-muted">
          {businessConfig.companyName} — administração do catálogo digital.
        </p>
      </div>
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
