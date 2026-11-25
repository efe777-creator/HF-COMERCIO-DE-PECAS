import { Button } from '@/components/common/Button'
import { WhatsAppButton } from '@/components/common/WhatsAppButton'
import { features } from '@/config/features'
import { Link } from 'react-router-dom'

type Props = {
  sku: string
  name: string
  productId: string
  whatsappMessage: string
}

/** Barra mobile sticky — D1 sem preço (cotação + WhatsApp). */
export function PdpPurchaseBar({ sku, name, productId, whatsappMessage }: Props) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-hf-line bg-hf-surface/95 p-3 backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-[1440px] gap-2">
        {features.quotation_enabled ? (
          <Link
            className="min-w-0 flex-1"
            to={`/cotacao?sku=${encodeURIComponent(sku)}&name=${encodeURIComponent(name)}&productId=${encodeURIComponent(productId)}`}
          >
            <Button fullWidth variant="primary" type="button" size="sm">
              Solicitar cotação
            </Button>
          </Link>
        ) : null}
        <div className="min-w-0 flex-1">
          <WhatsAppButton fullWidth size="sm" message={whatsappMessage}>
            Consultar
          </WhatsAppButton>
        </div>
      </div>
    </div>
  )
}
