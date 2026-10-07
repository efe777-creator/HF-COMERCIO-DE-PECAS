export function AdminPlaceholderPage({ title }: { title: string }) {
  return (
    <div className="rounded-[14px] border border-hf-line bg-hf-surface p-6">
      <h1 className="text-2xl font-extrabold text-hf-ink">{title}</h1>
      <p className="mt-2 text-hf-muted">
        Módulo preparado no menu. Implementação operacional fica para fases posteriores
        (vendas / estoque / relatórios).
      </p>
    </div>
  )
}
