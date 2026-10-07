export function AdminPlaceholderPage({ title }: { title: string }) {
  return (
    <div className="rounded-[14px] border border-fal-line bg-white p-6">
      <h1 className="text-2xl font-extrabold text-fal-navy">{title}</h1>
      <p className="mt-2 text-fal-muted">
        Módulo preparado no menu. Implementação operacional fica para fases posteriores
        (vendas / estoque / relatórios).
      </p>
    </div>
  )
}
