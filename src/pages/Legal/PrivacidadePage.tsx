import { Container } from '@/components/layout/Container'
import { businessConfig } from '@/config/business'
import { Link } from 'react-router-dom'

export function PrivacidadePage() {
  return (
    <Container className="py-10 sm:py-12">
      <p className="text-xs font-extrabold uppercase tracking-wide text-hf-red-bright">
        Institucional
      </p>
      <h1 className="mt-2 text-3xl font-black text-hf-ink">Política de privacidade</h1>
      <p className="mt-3 max-w-2xl text-sm text-hf-muted">
        A {businessConfig.companyName} trata dados pessoais para atendimento comercial B2B,
        cadastro de parceiros e solicitação de cotações. Não vendemos dados a terceiros.
      </p>
      <div className="mt-8 space-y-6 text-sm text-hf-ink">
        <section>
          <h2 className="text-lg font-extrabold">Dados coletados</h2>
          <p className="mt-2 text-hf-muted">
            Nome, empresa, telefone, WhatsApp, e-mail, cidade/UF, tipo de negócio e produtos de
            interesse informados em formulários do site ou WhatsApp.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-extrabold">Finalidade</h2>
          <p className="mt-2 text-hf-muted">
            Responder cotações, qualificar potenciais parceiros, manter conta de acesso ao catálogo
            e melhorar o atendimento. Cotação não constitui pedido confirmado.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-extrabold">Contato</h2>
          <p className="mt-2 text-hf-muted">
            Dúvidas: {/* */}
            <a className="font-semibold text-hf-red-bright" href={`mailto:${businessConfig.email}`}>
              {businessConfig.email}
            </a>
            {' · '}
            {businessConfig.address}
          </p>
        </section>
      </div>
      <p className="mt-10">
        <Link to="/atendimento" className="text-sm font-semibold text-hf-red-bright">
          Falar com a HF →
        </Link>
      </p>
    </Container>
  )
}
