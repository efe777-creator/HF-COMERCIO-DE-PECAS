/** Cesta de cotação (localStorage). Sem preço persistido. */

export const QUOTE_BASKET_KEY = 'hf-quote-basket-v1'
export const QUOTE_BASKET_EVENT = 'hf-quote-basket-changed'

export type QuoteBasketItem = {
  productId: string
  sku: string
  name: string
  quantity: number
}

export type QuoteBasket = {
  version: 1
  updatedAt: string
  items: QuoteBasketItem[]
}

function emptyBasket(): QuoteBasket {
  return { version: 1, updatedAt: new Date().toISOString(), items: [] }
}

function storage(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null
    return localStorage
  } catch {
    return null
  }
}

function notify() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(QUOTE_BASKET_EVENT))
}

export function readQuoteBasket(): QuoteBasket {
  const s = storage()
  if (!s) return emptyBasket()
  try {
    const raw = s.getItem(QUOTE_BASKET_KEY)
    if (!raw) return emptyBasket()
    const parsed = JSON.parse(raw) as Partial<QuoteBasket>
    if (!Array.isArray(parsed.items)) return emptyBasket()
    const items: QuoteBasketItem[] = []
    for (const row of parsed.items) {
      if (!row || typeof row !== 'object') continue
      const productId = String((row as QuoteBasketItem).productId || '').trim()
      const sku = String((row as QuoteBasketItem).sku || '').trim()
      const name = String((row as QuoteBasketItem).name || '').trim()
      const quantity = Math.max(1, Math.floor(Number((row as QuoteBasketItem).quantity) || 1))
      if (!productId && !sku && !name) continue
      items.push({
        productId: productId || sku || name,
        sku: sku || productId,
        name: name || sku || productId,
        quantity,
      })
    }
    return {
      version: 1,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
      items,
    }
  } catch {
    return emptyBasket()
  }
}

export function writeQuoteBasket(basket: QuoteBasket): void {
  const s = storage()
  const next: QuoteBasket = {
    version: 1,
    updatedAt: new Date().toISOString(),
    items: basket.items.map((i) => ({
      productId: i.productId,
      sku: i.sku,
      name: i.name,
      quantity: Math.max(1, Math.floor(i.quantity) || 1),
    })),
  }
  if (s) s.setItem(QUOTE_BASKET_KEY, JSON.stringify(next))
  notify()
}

export function quoteBasketCount(basket: QuoteBasket = readQuoteBasket()): number {
  return basket.items.reduce((sum, i) => sum + i.quantity, 0)
}

export function addToQuoteBasket(input: {
  productId: string
  sku: string
  name: string
  quantity?: number
}): QuoteBasket {
  const basket = readQuoteBasket()
  const qty = Math.max(1, Math.floor(input.quantity ?? 1))
  const id = input.productId.trim()
  const idx = basket.items.findIndex((i) => i.productId === id)
  if (idx >= 0) {
    const next = basket.items.slice()
    next[idx] = { ...next[idx], quantity: next[idx].quantity + qty }
    writeQuoteBasket({ ...basket, items: next })
    return readQuoteBasket()
  }
  writeQuoteBasket({
    ...basket,
    items: [
      ...basket.items,
      {
        productId: id,
        sku: input.sku.trim(),
        name: input.name.trim(),
        quantity: qty,
      },
    ],
  })
  return readQuoteBasket()
}

/** Substitui a cesta por um único item (CTA “Cotar só este”). */
export function replaceQuoteBasketWithItem(input: {
  productId: string
  sku: string
  name: string
  quantity?: number
}): QuoteBasket {
  writeQuoteBasket({
    version: 1,
    updatedAt: new Date().toISOString(),
    items: [
      {
        productId: input.productId.trim(),
        sku: input.sku.trim(),
        name: input.name.trim(),
        quantity: Math.max(1, Math.floor(input.quantity ?? 1)),
      },
    ],
  })
  return readQuoteBasket()
}

export function setQuoteBasketItemQuantity(productId: string, quantity: number): QuoteBasket {
  const basket = readQuoteBasket()
  const qty = Math.floor(quantity)
  const items =
    qty < 1
      ? basket.items.filter((i) => i.productId !== productId)
      : basket.items.map((i) =>
          i.productId === productId ? { ...i, quantity: qty } : i,
        )
  writeQuoteBasket({ ...basket, items })
  return readQuoteBasket()
}

export function removeFromQuoteBasket(productId: string): QuoteBasket {
  const basket = readQuoteBasket()
  writeQuoteBasket({
    ...basket,
    items: basket.items.filter((i) => i.productId !== productId),
  })
  return readQuoteBasket()
}

export function clearQuoteBasket(): QuoteBasket {
  writeQuoteBasket(emptyBasket())
  return readQuoteBasket()
}
