export function Loading({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-10 text-hf-muted" role="status">
      <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-hf-line border-t-hf-red-bright" />
      <span>{label}</span>
    </div>
  )
}
