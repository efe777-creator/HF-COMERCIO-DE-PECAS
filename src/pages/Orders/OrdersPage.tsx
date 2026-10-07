import { Container } from '@/components/layout/Container'
import { EmptyState } from '@/components/common/EmptyState'

export function OrdersPage() {
  return (
    <Container className="py-8">
      <h1 className="mt-0 text-[28px] font-extrabold sm:text-[34px]">Meus pedidos</h1>
      <p className="text-fal-muted">
        Consulta restrita ao próprio cliente (RLS futuro). Nesta fase, apenas estrutura.
      </p>
      <div className="mt-6">
        <EmptyState
          title="Nenhum pedido ainda"
          description="Quando o checkout estiver ativo, seus pedidos aparecerão aqui com status e histórico."
          actionLabel="Ir ao catálogo"
          actionTo="/catalogo"
        />
      </div>
    </Container>
  )
}
