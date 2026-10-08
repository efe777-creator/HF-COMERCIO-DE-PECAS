import { Link } from 'react-router-dom'
import { Container } from './Container'
import { businessConfig } from '@/config/business'
import { useAuth } from '@/contexts/AuthContext'
import { buildHomeWhatsAppMessage, storeWhatsAppHref } from '@/lib/whatsapp'
import logoHf from '@/assets/logos/logo-hf.png'

export function Footer() {
  const { user } = useAuth()
  const wa = storeWhatsAppHref(buildHomeWhatsAppMessage())

  return (
    <footer className="mt-8 border-t border-hf-line bg-hf-bg py-[38px] text-hf-muted sm:mt-12">
      <Container className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
        <div>
          <img
            src={logoHf}
            alt={businessConfig.companyName}
            className="mb-3 block h-[72px] w-auto max-w-[160px] object-contain object-left"
          />
          <p className="m-0 max-w-sm text-sm text-hf-muted">{businessConfig.tagline}</p>
          <p className="mt-2 m-0 text-xs text-hf-muted">{businessConfig.address}</p>
          <p className="mt-1 m-0 text-xs text-hf-muted">
            {businessConfig.hoursWeek} · {businessConfig.hoursSat}
          </p>
        </div>
        <div>
          <h4 className="mt-0 mb-3 text-hf-ink">Catálogo</h4>
          <Link className="mb-2 block text-[13px] text-hf-muted hover:text-hf-red-bright" to="/catalogo">
            Buscar peças
          </Link>
          <Link className="mb-2 block text-[13px] text-hf-muted hover:text-hf-red-bright" to="/categorias">
            Categorias
          </Link>
          <Link className="mb-2 block text-[13px] text-hf-muted hover:text-hf-red-bright" to="/marcas">
            Marcas
          </Link>
          <Link className="mb-2 block text-[13px] text-hf-muted hover:text-hf-red-bright" to="/veiculo">
            Aplicações
          </Link>
        </div>
        <div>
          <h4 className="mt-0 mb-3 text-hf-ink">Conta</h4>
          <Link className="mb-2 block text-[13px] text-hf-muted hover:text-hf-red-bright" to="/conta">
            Minha conta
          </Link>
          {!user ? (
            <>
              <Link className="mb-2 block text-[13px] text-hf-muted hover:text-hf-red-bright" to="/login">
                Entrar
              </Link>
              <Link className="mb-2 block text-[13px] text-hf-muted hover:text-hf-red-bright" to="/cadastro">
                Solicitar acesso
              </Link>
            </>
          ) : null}
          <a
            className="mb-2 block text-[13px] text-hf-muted hover:text-hf-red-bright"
            href={businessConfig.instagramUrl}
            target="_blank"
            rel="noreferrer"
          >
            Instagram
          </a>
        </div>
        <div>
          <h4 className="mt-0 mb-3 text-hf-ink">Atendimento</h4>
          <a
            className="mb-2 block text-[13px] text-hf-muted hover:text-hf-red-bright"
            href={`mailto:${businessConfig.email}`}
          >
            {businessConfig.email}
          </a>
          {wa ? (
            <a
              className="mb-2 block text-[13px] font-semibold text-hf-whatsapp hover:brightness-110"
              href={wa}
              target="_blank"
              rel="noreferrer"
            >
              WhatsApp
            </a>
          ) : (
            <span className="mb-2 block text-[13px] text-hf-muted">WhatsApp (configure VITE_WHATSAPP_NUMBER)</span>
          )}
          <Link className="mb-2 block text-[13px] text-hf-muted hover:text-hf-red-bright" to="/atendimento">
            Falar com a HF
          </Link>
        </div>
      </Container>
    </footer>
  )
}
