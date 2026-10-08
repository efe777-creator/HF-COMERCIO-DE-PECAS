/**
 * Feature flags centralizadas — HF Comércio de Peças (PRD B2B 1.0).
 * Não espalhar booleanos de produto pelo código.
 */
export const features = {
  catalog_enabled: true,
  customer_login_enabled: true,
  /** false = catálogo published livre (sem login / sem lista B2B por cliente). */
  customer_specific_catalog_enabled: false,
  ecommerce_enabled: false,
  price_enabled: false,
  inventory_enabled: false,
  quotation_enabled: false,
  orders_enabled: false,
  cart_enabled: false,
  checkout_enabled: false,
  payment_enabled: false,
  freight_enabled: false,
  vehicle_plate_enabled: false,
} as const

export type FeatureKey = keyof typeof features

export function isFeatureEnabled(key: FeatureKey): boolean {
  return features[key] === true
}
