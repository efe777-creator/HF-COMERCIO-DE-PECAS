import { useAuth } from '@/contexts/AuthContext'
import { isStaffRole } from '@/services/admin/staffService'
import { Link } from 'react-router-dom'

export function AccountButton() {
  const { user } = useAuth()
  const isStaff = isStaffRole(user?.role)

  return (
    <div className="flex flex-col items-center gap-0.5 text-center text-[13px] text-fal-navy">
      <Link to={user ? '/conta' : '/login'}>
        <b className="block text-xl">👤</b>
        {user ? 'Minha conta' : 'Entrar'}
      </Link>
      {isStaff ? (
        <Link to="/admin" className="text-[11px] font-extrabold text-fal-navy/80 hover:underline">
          Painel Admin
        </Link>
      ) : null}
    </div>
  )
}
