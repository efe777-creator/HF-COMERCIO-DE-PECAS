import { useAuth } from '@/contexts/AuthContext'
import { listSavedVehicles } from '@/services/customers/customerVehicleService'
import type { CustomerSavedVehicle } from '@/types'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

/**
 * Atalho discreto: aplica filtros do veículo salvo no catálogo.
 */
export function SavedVehiclesQuickPick({
  onPick,
}: {
  /** Se informado, chama em vez de navegar (útil no catálogo). */
  onPick?: (v: CustomerSavedVehicle) => void
}) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState<CustomerSavedVehicle[]>([])

  useEffect(() => {
    if (!user) {
      setItems([])
      return
    }
    void listSavedVehicles()
      .then(setItems)
      .catch(() => setItems([]))
  }, [user])

  if (!user) {
    return (
      <p className="m-0 text-xs text-hf-muted">
        <Link to="/login" state={{ from: '/catalogo' }} className="font-semibold text-hf-ink underline-offset-2 hover:underline">
          Entrar
        </Link>{' '}
        para usar Meus veículos
      </p>
    )
  }

  if (!items.length) {
    return (
      <p className="m-0 text-xs text-hf-muted">
        <Link to="/conta/veiculos" className="font-semibold text-hf-ink underline-offset-2 hover:underline">
          Meus veículos
        </Link>
        {' — '}
        salve um carro na conta para filtrar peças rapidamente.
      </p>
    )
  }

  function apply(v: CustomerSavedVehicle) {
    if (onPick) {
      onPick(v)
      return
    }
    const qs = new URLSearchParams()
    if (v.makerName) qs.set('maker', v.makerName)
    if (v.modelName) qs.set('model', v.modelName)
    if (v.year != null) qs.set('year', String(v.year))
    if (v.engine) qs.set('engine', v.engine)
    if (v.versionName) qs.set('version', v.versionName)
    navigate(`/catalogo?${qs.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold text-hf-muted">Meus veículos:</span>
      {items.map((v) => {
        const label =
          v.nickname ||
          [v.makerName, v.modelName, v.year, v.engine].filter(Boolean).join(' ') ||
          'Veículo'
        return (
          <button
            key={v.id}
            type="button"
            className={[
              'rounded-full border px-2.5 py-1 text-xs font-semibold transition',
              v.isPrimary
                ? 'border-hf-line bg-hf-surface-2 text-white'
                : 'border-[#d8dee3] bg-[#f7f9fa] text-hf-ink hover:border-hf-line',
            ].join(' ')}
            onClick={() => apply(v)}
            title="Filtrar peças deste veículo"
          >
            {label}
            {v.isPrimary ? ' ★' : ''}
          </button>
        )
      })}
      <Link
        to="/conta/veiculos"
        className="text-xs font-semibold text-hf-muted underline-offset-2 hover:underline"
      >
        Gerenciar
      </Link>
    </div>
  )
}
