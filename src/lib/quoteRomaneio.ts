/** Copy puro do romaneio de cotação (wa.me). Sem rede. */

import { formatMoney } from '@/lib/money'
import type { QuoteBasketItem } from '@/lib/quoteBasket'

export type QuoteRomaneioLine = QuoteBasketItem & {
  unitPrice?: number | null
  priceVisible?: boolean
}

export type QuoteRomaneioInput = {
  protocolId: string
  companyName?: string | null
  contactName?: string | null
  lines: QuoteRomaneioLine[]
  conditionsSummary?: string | null
  catalogUrl?: string | null
}

export function buildQuoteRomaneioMessage(input: QuoteRomaneioInput): string {
  const proto = input.protocolId.slice(0, 8)
  const lines: string[] = [
    'Solicitação de cotação — HF Comércio de Peças',
    `Protocolo: ${proto}`,
  ]
  if (input.companyName?.trim()) lines.push(`Empresa: ${input.companyName.trim()}`)
  if (input.contactName?.trim()) lines.push(`Contato: ${input.contactName.trim()}`)
  lines.push('', 'Itens:')

  for (const row of input.lines) {
    const parts = [
      `- ${row.sku || row.productId}`,
      row.name,
      `qtd ${row.quantity}`,
    ]
    if (row.priceVisible && row.unitPrice != null && Number.isFinite(row.unitPrice)) {
      parts.push(formatMoney(row.unitPrice))
    }
    lines.push(parts.join(' · '))
  }

  if (input.conditionsSummary?.trim()) {
    lines.push('', `Condições: ${input.conditionsSummary.trim()}`)
  }
  if (input.catalogUrl?.trim()) {
    lines.push('', `Catálogo: ${input.catalogUrl.trim()}`)
  }
  lines.push('', 'Aguardo retorno do time comercial.')
  return lines.join('\n')
}
