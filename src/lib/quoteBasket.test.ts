import { beforeEach, describe, expect, it } from 'vitest'
import {
  addToQuoteBasket,
  clearQuoteBasket,
  quoteBasketCount,
  readQuoteBasket,
  removeFromQuoteBasket,
  replaceQuoteBasketWithItem,
  setQuoteBasketItemQuantity,
  QUOTE_BASKET_KEY,
} from './quoteBasket'
import { buildQuoteRomaneioMessage } from './quoteRomaneio'

function installMemoryStorage() {
  const map = new Map<string, string>()
  const mem: Storage = {
    get length() {
      return map.size
    },
    clear() {
      map.clear()
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null
    },
    key(index: number) {
      return [...map.keys()][index] ?? null
    },
    removeItem(key: string) {
      map.delete(key)
    },
    setItem(key: string, value: string) {
      map.set(key, String(value))
    },
  }
  Object.defineProperty(globalThis, 'localStorage', {
    value: mem,
    configurable: true,
    writable: true,
  })
}

beforeEach(() => {
  installMemoryStorage()
  localStorage.removeItem(QUOTE_BASKET_KEY)
})

describe('quoteBasket', () => {
  it('adds and merges quantity by productId', () => {
    addToQuoteBasket({ productId: 'p1', sku: 'SKU1', name: 'Peça A', quantity: 1 })
    addToQuoteBasket({ productId: 'p1', sku: 'SKU1', name: 'Peça A', quantity: 2 })
    addToQuoteBasket({ productId: 'p2', sku: 'SKU2', name: 'Peça B' })
    const b = readQuoteBasket()
    expect(b.items).toHaveLength(2)
    expect(b.items.find((i) => i.productId === 'p1')?.quantity).toBe(3)
    expect(quoteBasketCount(b)).toBe(4)
  })

  it('replace keeps only one item', () => {
    addToQuoteBasket({ productId: 'p1', sku: 'A', name: 'A' })
    addToQuoteBasket({ productId: 'p2', sku: 'B', name: 'B' })
    replaceQuoteBasketWithItem({ productId: 'p9', sku: 'X', name: 'Só este', quantity: 5 })
    const b = readQuoteBasket()
    expect(b.items).toEqual([
      { productId: 'p9', sku: 'X', name: 'Só este', quantity: 5 },
    ])
  })

  it('set quantity and remove', () => {
    addToQuoteBasket({ productId: 'p1', sku: 'A', name: 'A', quantity: 2 })
    setQuoteBasketItemQuantity('p1', 4)
    expect(readQuoteBasket().items[0].quantity).toBe(4)
    setQuoteBasketItemQuantity('p1', 0)
    expect(readQuoteBasket().items).toHaveLength(0)
    addToQuoteBasket({ productId: 'p2', sku: 'B', name: 'B' })
    removeFromQuoteBasket('p2')
    expect(readQuoteBasket().items).toHaveLength(0)
    clearQuoteBasket()
    expect(quoteBasketCount()).toBe(0)
  })
})

describe('quoteRomaneio', () => {
  it('builds message with protocol and optional prices', () => {
    const msg = buildQuoteRomaneioMessage({
      protocolId: 'abcdef12-3456-7890',
      companyName: 'Oficina X',
      contactName: 'Ana',
      lines: [
        {
          productId: 'p1',
          sku: 'SKU1',
          name: 'Amortecedor',
          quantity: 2,
          unitPrice: 199.9,
          priceVisible: true,
        },
        {
          productId: 'p2',
          sku: 'SKU2',
          name: 'Buchas',
          quantity: 1,
          priceVisible: false,
        },
      ],
      conditionsSummary: 'À vista / 28 dias',
      catalogUrl: 'https://hf.example/catalogo',
    })
    expect(msg).toContain('Protocolo: abcdef12')
    expect(msg).toContain('Empresa: Oficina X')
    expect(msg).toContain('SKU1')
    expect(msg).toContain('R$')
    expect(msg).toContain('SKU2')
    expect(msg).toContain('Condições: À vista / 28 dias')
    expect(msg).not.toMatch(/graph\.facebook|api\.whatsapp/i)
  })
})
