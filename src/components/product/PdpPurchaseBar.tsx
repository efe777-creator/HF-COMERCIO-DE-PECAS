import { Button } from '@/components/common/Button'
import { MOBILE_NAV_OFFSET } from '@/components/navigation/MobileNav'
import { features } from '@/config/features'
import { addToQuoteBasket } from '@/lib/quoteBasket'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

type Props = {
  sku: string
  name: string
  productId: string
}

/** Barra mobile sticky — acima do MobileNav (z/bottom). */
export function PdpPurchaseBar({ sku, name, productId }: Props) {
  const navigate = useNavigate()
  const [flash, setFlash] = useState(false)

  if (!features.quotation_enabled) return null

  function addAndGo() {
    addToQuoteBasket({ productId, sku, name, quantity: 1 })
    setFlash(true)
    window.setTimeout(() => {
      navigate('/cotacao')
    }, 450)
  }

  return (
    <div
      className="fixed inset-x-0 z-[160] border-t border-hf-line bg-hf-surface/95 p-3 backdrop-blur lg:hidden"
      style={{ bottom: MOBILE_NAV_OFFSET }}
      data-pdp-purchase-bar
    >
      <div className="mx-auto flex max-w-[1440px] gap-2">
        <Button
          fullWidth
          variant="primary"
          type="button"
          size="sm"
          onClick={addAndGo}
        >
          {flash ? 'Adicionado…' : 'Adicionar à cotação'}
        </Button>
      </div>
    </div>
  )
}
