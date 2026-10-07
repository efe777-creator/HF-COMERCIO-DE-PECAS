import { Button } from './Button'

interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
}

export function ErrorState({
  title = 'Algo deu errado',
  message,
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="rounded-hf border border-hf-line bg-hf-surface px-5 py-10 text-center">
      <h2 className="m-0 text-xl font-extrabold text-hf-ink">{title}</h2>
      <p className="mt-2 text-hf-danger">{message}</p>
      {onRetry ? (
        <div className="mt-4 flex justify-center">
          <Button variant="dark" onClick={onRetry}>
            Tentar novamente
          </Button>
        </div>
      ) : null}
    </div>
  )
}
