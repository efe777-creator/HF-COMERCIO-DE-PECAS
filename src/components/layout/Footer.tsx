import { Link } from 'react-router-dom'
import { Container } from './Container'
import { businessConfig } from '@/config/business'
import { useAuth } from '@/contexts/AuthContext'
import logoFal from '@/assets/logos/logo-fal-transparente.png'

export function Footer() {
  const { user } = useAuth()

  return (
    <footer className="mt-8 bg-fal-navy-dark py-[38px] text-[#dfe5e9] sm:mt-12">
      <Container className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
        <div>
          <img
            src={logoFal}
            alt={businessConfig.companyName}
            className="mb-3 block h-[86px] w-auto max-w-[120px] object-contain object-left"
          />
          <p className="m-0 max-w-sm text-sm text-[#c5cbd1]">
            {businessConfig.companyName} — catálogo digital de peças automotivas.
          </p>
        </div>
        <div>
          <h4 className="mt-0 mb-3 text-white">Catálogo</h4>
          <Link className="mb-2 block text-[13px] text-[#c5cbd1] hover:text-white" to="/catalogo">
            Buscar peças
          </Link>
          <Link className="mb-2 block text-[13px] text-[#c5cbd1] hover:text-white" to="/veiculo">
            Busca por veículo
          </Link>
        </div>
        <div>
          <h4 className="mt-0 mb-3 text-white">Conta</h4>
          <Link className="mb-2 block text-[13px] text-[#c5cbd1] hover:text-white" to="/conta">
            Minha conta
          </Link>
          {!user ? (
            <Link className="mb-2 block text-[13px] text-[#c5cbd1] hover:text-white" to="/login">
              Entrar
            </Link>
          ) : null}
          <Link
            className="mb-2 block text-[13px] text-[#c5cbd1] hover:text-white"
            to="/conta/veiculos"
          >
            Meus veículos
          </Link>
        </div>
        <div>
          <h4 className="mt-0 mb-3 text-white">Institucional</h4>
          <Link className="mb-2 block text-[13px] text-[#c5cbd1] hover:text-white" to="/">
            Início
          </Link>
          <span className="mb-2 block text-[13px] text-[#8a9299]">Privacidade (em breve)</span>
          <span className="mb-2 block text-[13px] text-[#8a9299]">Termos (em breve)</span>
        </div>
      </Container>
    </footer>
  )
}
