import { Container } from './Container'

export function Topbar() {
  return (
    <div className="hidden bg-fal-navy-dark text-[12px] text-white sm:block">
      <Container className="flex justify-between gap-3 py-2">
        <span>FAL Peças Automotivas</span>
        <span>Compra digital • Atendimento apenas para exceções</span>
      </Container>
    </div>
  )
}
