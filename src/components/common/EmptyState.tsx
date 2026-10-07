import { Button } from './Button'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface EmptyStateProps {
  title: string
  description?: string
  actionLabel?: string
  actionTo?: string
  children?: ReactNode
}

export function EmptyState({
  title,
  description,
  actionLabel,
  actionTo,
  children,
}: EmptyStateProps) {
  return (
    <div className="rounded-fal border border-fal-line bg-white px-5 py-14 text-center text-fal-muted">
      <h2 className="m-0 text-xl font-extrabold text-fal-navy-dark">{title}</h2>
      {description ? <p className="mt-2">{description}</p> : null}
      {children}
      {actionLabel && actionTo ? (
        <div className="mt-5 flex justify-center">
          <Link to={actionTo}>
            <Button variant="primary">{actionLabel}</Button>
          </Link>
        </div>
      ) : null}
    </div>
  )
}
