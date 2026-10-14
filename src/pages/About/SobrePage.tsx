import { WhatsAppButton } from '@/components/common/WhatsAppButton'
import { Button } from '@/components/common/Button'
import { Container } from '@/components/layout/Container'
import { businessConfig } from '@/config/business'
import { buildHomeWhatsAppMessage } from '@/lib/whatsapp'
import estoqueOrganizado from '@/assets/images/estoque-organizado.png'
import { Link } from 'react-router-dom'

const diferenciais = [
  {
    titulo: 'Competitividade comercial',
    texto:
      'Foco em preços e condições que contribuam para o negócio dos nossos clientes.',
  },
  {
    titulo: 'Suporte na identificação de peças',
    texto:
      'Auxílio na busca por produtos e aplicações, com base nas informações fornecidas pelo cliente.',
  },
  {
    titulo: 'Variedade de produtos',
    texto: 'Opções para atender às demandas de lojas de autopeças e oficinas mecânicas.',
  },
  {
    titulo: 'Atendimento próximo',
    texto:
      'Comunicação direta, atenção às necessidades e compromisso com uma relação comercial duradoura.',
  },
] as const

export function SobrePage() {
  return (
    <Container className="py-10">
      <p className="mb-2 text-[13px] text-hf-muted">
        <Link to="/" className="hover:underline">
          Início
        </Link>{' '}
        / Sobre
      </p>

      <p className="mb-2 text-[13px] font-extrabold tracking-[0.12em] text-hf-red-bright uppercase">
        Sobre a HF
      </p>
      <h1 className="mt-0 max-w-3xl text-[28px] font-extrabold leading-tight text-hf-ink sm:text-[34px]">
        Peças automotivas, parceria e confiança para o seu negócio.
      </h1>
      <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-hf-muted">
        A {businessConfig.companyName} atua na distribuição de peças automotivas, atendendo lojas de
        autopeças e oficinas mecânicas com foco em competitividade comercial, atendimento próximo e
        suporte na identificação de produtos.
      </p>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-hf-muted">
        Nosso objetivo é facilitar o dia a dia dos nossos clientes, oferecendo variedade de peças,
        condições comerciais competitivas e auxílio na busca pelos produtos e aplicações adequados
        para cada necessidade.
      </p>

      <section className="mt-12 grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-12">
        <div>
          <h2 className="mt-0 text-[22px] font-extrabold text-hf-ink sm:text-[26px]">
            Mais do que fornecer peças, construir parcerias.
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-hf-muted">
            Acreditamos que uma boa parceria vai além do preço. Por isso, buscamos entender as
            necessidades de cada cliente, oferecer um atendimento atencioso e contribuir para que o
            processo de cotação e compra seja mais simples e eficiente.
          </p>
          <p className="mt-3 text-[15px] leading-relaxed text-hf-muted">
            Trabalhamos para unir três pontos essenciais:{' '}
            <strong className="font-semibold text-hf-ink">
              preço competitivo, suporte na identificação de peças e relacionamento comercial de
              confiança.
            </strong>
          </p>
        </div>
        <div className="overflow-hidden rounded-[12px] border border-hf-line bg-hf-surface">
          <img
            src={estoqueOrganizado}
            alt="Estoque organizado da HF Comércio de Peças"
            loading="lazy"
            className="block h-full min-h-[260px] w-full object-cover object-center sm:min-h-[320px]"
          />
        </div>
      </section>

      <section className="mt-14">
        <h2 className="mt-0 text-[22px] font-extrabold text-hf-ink sm:text-[26px]">
          O que você encontra na HF?
        </h2>
        <ul className="mt-6 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2">
          {diferenciais.map((item) => (
            <li
              key={item.titulo}
              className="rounded-[12px] border border-hf-line bg-hf-surface p-5"
            >
              <h3 className="m-0 text-[16px] font-bold text-hf-ink">{item.titulo}</h3>
              <p className="mt-2 mb-0 text-[14px] leading-relaxed text-hf-muted">{item.texto}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-14 rounded-[12px] border border-hf-line bg-hf-surface-2 px-5 py-8 sm:px-8">
        <h2 className="mt-0 text-[22px] font-extrabold text-hf-ink sm:text-[26px]">Conte com a HF</h2>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-hf-muted">
          Seja para consultar um produto, esclarecer dúvidas sobre uma aplicação ou solicitar uma
          cotação, nossa equipe está pronta para atender você.
        </p>
        <p className="mt-4 mb-0 max-w-2xl text-[15px] font-semibold text-hf-ink">
          {businessConfig.companyName} — competitividade, suporte e parceria para o seu negócio.
        </p>
        <p className="mt-2 mb-0 text-[14px] text-hf-muted">
          Solicite sua cotação e fale com a nossa equipe.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <WhatsAppButton message={buildHomeWhatsAppMessage()}>
            Solicitar cotação no WhatsApp
          </WhatsAppButton>
          <Link to="/atendimento">
            <Button type="button" variant="outline">
              Atendimento HF
            </Button>
          </Link>
          <Link to="/cadastro">
            <Button type="button" variant="light">
              Solicitar acesso
            </Button>
          </Link>
        </div>
      </section>
    </Container>
  )
}
