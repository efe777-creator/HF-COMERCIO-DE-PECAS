import {
  FABRICANTE_LABEL,
  REFERENCIA_LABEL,
} from '@/lib/productLabels'
import { formatLadoLabel, formatPosicaoLabel } from '@/lib/productPosicaoLado'
import type { Product } from '@/types'

export type SpecRow = { label: string; value: string }

/** Linhas de especificação só com valores existentes. */
export function buildProductSpecRows(product: Product): SpecRow[] {
  const rows: SpecRow[] = []
  if (product.sku?.trim()) rows.push({ label: REFERENCIA_LABEL, value: product.sku.trim() })
  if (product.brand?.trim()) rows.push({ label: FABRICANTE_LABEL, value: product.brand.trim() })
  if (product.manufacturerCode?.trim()) {
    rows.push({ label: 'Cód. fabricante', value: product.manufacturerCode.trim() })
  }
  if (product.categoryName?.trim()) {
    rows.push({ label: 'Categoria', value: product.categoryName.trim() })
  }
  if (product.posicao) {
    rows.push({ label: 'Posição', value: formatPosicaoLabel(product.posicao) })
  }
  if (product.lado) {
    rows.push({ label: 'Lado', value: formatLadoLabel(product.lado) })
  }
  if (product.references?.length) {
    for (const r of product.references) {
      const code = r.code?.trim()
      if (!code) continue
      const label = r.brandLabel?.trim() ? `Ref. ${r.brandLabel.trim()}` : 'Referência adicional'
      rows.push({ label, value: code })
    }
  }
  if (product.attrs && typeof product.attrs === 'object') {
    for (const [key, raw] of Object.entries(product.attrs)) {
      if (raw == null) continue
      const value = String(raw).trim()
      if (!value || value === 'null' || value === 'undefined') continue
      const label = key.replace(/_/g, ' ').trim()
      if (!label) continue
      rows.push({ label, value })
    }
  }
  return rows
}
