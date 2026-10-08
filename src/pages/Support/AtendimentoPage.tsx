import { WhatsAppButton } from '@/components/common/WhatsAppButton'
import { Container } from '@/components/layout/Container'
import { businessConfig } from '@/config/business'
import { buildHomeWhatsAppMessage } from '@/lib/whatsapp'
import { Link } from 'react-router-dom'

export function AtendimentoPage() {
  return (
    <Container className="py-10">
      <p className="mb-2 text-[13px] text-hf-muted">
        <Link to="/" className="hover:underline">
          Início
        </Link>{' '}
        / Atendimento
      </p>
      <h1 className="mt-0 text-[28px] font-extrabold sm:text-[34px]">Atendimento HF</h1>
      <p className="max-w-xl text-hf-muted">
        Fale com a equipe para disponibilidade, aplicações e códigos. Sem preço público no
        catálogo B2B.
      </p>
      <div className="mt-6 space-y-2 text-sm text-hf-ink">
        <p className="m-0">
          <span className="font-semibold">E-mail:</span>{' '}
          <a className="text-hf-red-bright underline" href={`mailto:${businessConfig.email}`}>
            {businessConfig.email}
          </a>
        </p>
        <p className="m-0">
          <span className="font-semibold">Endereço:</span> {businessConfig.address}
        </p>
        <p className="m-0">
          <span className="font-semibold">Horário:</span> {businessConfig.hoursWeek} ·{' '}
          {businessConfig.hoursSat}
        </p>
      </div>
      <div className="mt-6">
        <WhatsAppButton message={buildHomeWhatsAppMessage()}>Falar com a HF no WhatsApp</WhatsAppButton>
      </div>
    </Container>
  )
}
