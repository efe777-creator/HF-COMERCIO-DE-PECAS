import { useAuth } from '@/contexts/AuthContext'
import { isStaffRole } from '@/services/admin/staffService'
import { Link } from 'react-router-dom'

const cards = [
  { to: '/conta/perfil', title: 'Perfil', desc: 'Nome, telefone e empresa vinculada' },
  { to: '/catalogo', title: 'Meu catálogo', desc: 'Peças autorizadas para sua empresa' },
]

export function AccountHomePage() {
  const { user } = useAuth()
  const isStaff = isStaffRole(user?.role)
  const b2bActive = Boolean(user?.customerId && user.customerStatus === 'active')

  return (
    <div className="rounded-hf border border-hf-line bg-hf-surface p-5">
      <h2 className="mt-0 text-xl font-extrabold">Resumo</h2>
      <p className="text-sm text-hf-muted">
        Área do cliente B2B. O catálogo exibe apenas produtos das listas autorizadas.
      </p>
      {user && user.emailConfirmed === false ? (
        <p className="mt-3 rounded-[10px] border border-[#f0d979] bg-[#fff8db] p-3 text-sm">
          <strong>Confirme seu e-mail</strong> — verifique a caixa de entrada (e o spam) e clique no
          link de confirmação.
        </p>
      ) : user?.emailConfirmed ? (
        <p className="mt-3 text-sm text-hf-success">✓ E-mail confirmado</p>
      ) : null}

      {user?.customerLegalName ? (
        <p className="mt-3 rounded-[10px] border border-hf-line bg-hf-bg p-3 text-sm">
          <strong>{user.customerLegalName}</strong>
          <span className="ml-2 text-hf-muted">· {user.customerStatus ?? '—'}</span>
        </p>
      ) : !isStaff ? (
        <p className="mt-3 rounded-[10px] border border-[#f0d979] bg-[#fff8db] p-3 text-sm">
          Conta sem empresa vinculada. Após o cadastro, a HF associa seu login ao cliente B2B.
        </p>
      ) : null}

      {isStaff ? (
        <p className="mt-3">
          <Link
            to="/admin"
            className="inline-flex rounded-[10px] bg-hf-surface-2 px-4 py-2.5 text-sm font-extrabold text-white"
          >
            Abrir painel administrativo
          </Link>
        </p>
      ) : null}

      {b2bActive ? (
        <p className="mt-3">
          <Link
            to="/catalogo"
            className="inline-flex rounded-[10px] bg-hf-surface-2 px-4 py-2.5 text-sm font-extrabold text-white"
          >
            Abrir catálogo autorizado
          </Link>
        </p>
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {cards.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className="rounded-[12px] border border-hf-line p-4 transition hover:border-hf-red"
          >
            <h3 className="m-0 font-extrabold text-hf-ink">{c.title}</h3>
            <p className="mb-0 mt-1 text-sm text-hf-muted">{c.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
