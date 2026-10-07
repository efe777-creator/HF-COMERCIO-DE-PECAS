import { useAuth } from '@/contexts/AuthContext'
import { isStaffRole } from '@/services/admin/staffService'
import { Link } from 'react-router-dom'

const cards = [
  { to: '/conta/perfil', title: 'Perfil', desc: 'Nome, telefone e documentos' },
  { to: '/conta/veiculos', title: 'Meus veículos', desc: 'Veículos salvos para busca' },
]

export function AccountHomePage() {
  const { user } = useAuth()
  const isStaff = isStaffRole(user?.role)

  return (
    <div className="rounded-fal border border-fal-line bg-white p-5">
      <h2 className="mt-0 text-xl font-extrabold">Resumo</h2>
      <p className="text-sm text-fal-muted">
        Gerencie seus dados e veículos. Use a busca do catálogo para encontrar peças.
      </p>
      {user && user.emailConfirmed === false ? (
        <p className="mt-3 rounded-[10px] border border-[#f0d979] bg-[#fff8db] p-3 text-sm">
          <strong>Confirme seu e-mail</strong> — verifique a caixa de entrada (e o spam) e clique no
          link de confirmação.
        </p>
      ) : user?.emailConfirmed ? (
        <p className="mt-3 text-sm text-fal-success">✓ E-mail confirmado</p>
      ) : null}
      {isStaff ? (
        <p className="mt-3">
          <Link
            to="/admin"
            className="inline-flex rounded-[10px] bg-fal-navy px-4 py-2.5 text-sm font-extrabold text-white"
          >
            Abrir painel administrativo
          </Link>
        </p>
      ) : null}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {cards.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className="rounded-[12px] border border-fal-line p-4 transition hover:border-fal-yellow"
          >
            <h3 className="m-0 font-extrabold text-fal-navy">{c.title}</h3>
            <p className="mb-0 mt-1 text-sm text-fal-muted">{c.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
