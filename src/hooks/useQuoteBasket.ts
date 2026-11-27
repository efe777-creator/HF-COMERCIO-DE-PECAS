import {
  QUOTE_BASKET_EVENT,
  quoteBasketCount,
  readQuoteBasket,
  type QuoteBasket,
} from '@/lib/quoteBasket'
import { useCallback, useEffect, useState } from 'react'

export function useQuoteBasket() {
  const [basket, setBasket] = useState<QuoteBasket>(() => readQuoteBasket())

  const refresh = useCallback(() => {
    setBasket(readQuoteBasket())
  }, [])

  useEffect(() => {
    refresh()
    const onStorage = (e: StorageEvent) => {
      if (e.key && e.key !== 'hf-quote-basket-v1') return
      refresh()
    }
    window.addEventListener(QUOTE_BASKET_EVENT, refresh)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(QUOTE_BASKET_EVENT, refresh)
      window.removeEventListener('storage', onStorage)
    }
  }, [refresh])

  return {
    basket,
    count: quoteBasketCount(basket),
    refresh,
  }
}
