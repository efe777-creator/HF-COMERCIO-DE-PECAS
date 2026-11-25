/** Rótulos de UI — campo técnico continua `sku`. */
export const CODIGO_REFERENCIA_LABEL = 'Código referência'
export const REFERENCIA_LABEL = 'Referência'
export const FABRICANTE_LABEL = 'Fabricante'
export const APPS_EMPTY_LABEL = 'Aplicações sob consulta'
export const KIT_APPS_EMPTY_LABEL = 'Kit sem aplicação própria cadastrada'
export const APLICACAO_SECTION_LABEL = 'Aplicação'
export const MAIS_APLICACOES_LABEL = 'Mais aplicações'
export const MENOS_APLICACOES_LABEL = 'Menos aplicações'
export const AJUDA_APLICACAO_TEXT =
  'Confira sempre a aplicação no veículo. Em caso de dúvida, fale com a HF antes de pedir.'
export const VER_DESCRICAO_COMPLETA_LABEL = 'Ver descrição completa'
export const VER_MENOS_DESCRICAO_LABEL = 'Ver menos'
export const VER_MAIS_CATALOGO_LABEL = 'Ver mais no catálogo'

export function formatCodigoReferencia(sku: string): string {
  return `${CODIGO_REFERENCIA_LABEL}: ${sku}`
}

export function formatReferenciaFromProduct(product: { sku: string }): string {
  return `${REFERENCIA_LABEL}: ${product.sku}`
}
