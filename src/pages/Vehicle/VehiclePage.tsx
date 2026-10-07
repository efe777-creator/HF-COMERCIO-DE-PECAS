import { Container } from '@/components/layout/Container'
import { VehicleSelector } from '@/components/vehicle/VehicleSelector'

export function VehiclePage() {
  return (
    <Container className="py-8">
      <p className="mb-2 text-[13px] text-fal-muted">Início / Veículo</p>
      <h1 className="mt-0 mb-2 text-[28px] font-extrabold sm:text-[34px]">Busca por veículo</h1>
      <p className="mb-6 max-w-2xl text-fal-muted">
        Informe Montadora, Modelo, Ano e/ou Motor — individualmente ou combinados. Nenhum campo é
        obrigatório.
      </p>
      <div className="max-w-xl">
        <VehicleSelector compact />
      </div>
    </Container>
  )
}
