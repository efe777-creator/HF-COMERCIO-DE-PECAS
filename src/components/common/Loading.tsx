export function Loading({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-10 text-fal-muted" role="status">
      <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-fal-line border-t-fal-yellow" />
      <span>{label}</span>
    </div>
  )
}
