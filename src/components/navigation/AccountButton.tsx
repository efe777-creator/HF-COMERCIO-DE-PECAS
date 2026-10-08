import { useAuth } from '@/contexts/AuthContext'
import { isStaffRole } from '@/services/admin/staffService'
import { Link } from 'react-router-dom'

export function AccountButton() {
  const { user } = useAuth()
  const isStaff = isStaffRole(user?.role)
  const company =
    user?.customerStatus === 'active' && user.customerLegalName
      ? user.customerLegalName
      : null

  return (
    <div className="flex flex-col items-end gap-0.5 text-right text-[13px] text-hf-ink">
      {company ? (
        <span className="max-w-[160px] truncate text-[11px] font-semibold text-hf-muted" title={company}>
          {company}
        </span>
      ) : null}
      <Link to={user ? '/conta' : '/login'} className="font-extrabold hover:text-hf-red-bright">
        {user ? 'Minha conta' : 'Entrar'}
      </Link>
      {isStaff ? (
        <Link to="/admin" className="text-[11px] font-extrabold text-hf-ink/80 hover:underline">
          Painel Admin
        </Link>
      ) : null}
    </div>
  )
}
