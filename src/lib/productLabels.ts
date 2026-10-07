/** Rótulos de UI — campo técnico continua `sku`. */
export const CODIGO_REFERENCIA_LABEL = 'Código referência'

export function formatCodigoReferencia(sku: string): string {
  return `${CODIGO_REFERENCIA_LABEL}: ${sku}`
}
