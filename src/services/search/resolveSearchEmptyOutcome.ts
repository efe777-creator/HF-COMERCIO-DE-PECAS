import type { SearchIntent } from './interpretSearchQuery'

export type SearchEmptyOutcome =
  | 'vehicle_recognized_no_products'
  | 'product_vehicle_no_application'
  | 'not_interpreted'
  | 'needs_clarification'
  | 'generic_empty'

export type SearchEmptyCopy = {
  outcome: SearchEmptyOutcome
  title: string
  description: string
}

function vehicleLabel(intent: SearchIntent | null | undefined): string {
  if (!intent) return 'este veículo'
  const maker = intent.vehicle.maker?.trim()
  const model = intent.vehicle.model?.trim()
  if (maker && model) return `${maker} ${model}`
  if (model) return model
  if (maker) return maker
  return 'este veículo'
}

/**
 * Classifica vazio da busca: não misturar “não entendemos” com “reconheceu sem produtos”.
 */
export function resolveSearchEmptyOutcome(
  intent: SearchIntent | null | undefined,
  opts: { total: number; softApplied?: boolean },
): SearchEmptyOutcome | null {
  if (opts.total > 0) return null

  if (opts.softApplied) return 'product_vehicle_no_application'

  if (!intent) return 'generic_empty'

  if (intent.intentType === 'unknown') return 'not_interpreted'

  const hasVehicle = Boolean(intent.vehicle.maker || intent.vehicle.model)

  // Veículo no cadastro + zero produtos: prioridade sobre “qual peça?”.
  if (hasVehicle && (intent.intentType === 'vehicle_only' || intent.intentType === 'product_vehicle')) {
    if (intent.productQuery || intent.codeHint) {
      return 'product_vehicle_no_application'
    }
    return 'vehicle_recognized_no_products'
  }

  if (intent.needsClarification || intent.clarification === 'ambiguous') {
    return 'needs_clarification'
  }

  return 'generic_empty'
}

export function searchEmptyCopy(
  outcome: SearchEmptyOutcome,
  intent?: SearchIntent | null,
): SearchEmptyCopy {
  switch (outcome) {
    case 'vehicle_recognized_no_products': {
      const label = vehicleLabel(intent)
      return {
        outcome,
        title: `Reconhecemos o ${label}`,
        description:
          'Ainda não temos produtos cadastrados para este veículo. Fale com a HF ou refine a peça.',
      }
    }
    case 'product_vehicle_no_application':
      return {
        outcome,
        title: 'Sem aplicação para este veículo',
        description:
          'Identificamos a busca, mas não há aplicação cadastrada dessa peça/código para o veículo. Fale com a HF.',
      }
    case 'not_interpreted':
      return {
        outcome,
        title: 'Não entendemos essa busca',
        description:
          'Tente peça + modelo (ex.: pivô Celta) ou informe a montadora. Se preferir, fale com a HF.',
      }
    case 'needs_clarification':
      return {
        outcome,
        title: 'Precisamos de mais detalhes',
        description:
          'Refine montadora, modelo, ano ou a peça que procura para continuar a busca.',
      }
    case 'generic_empty':
    default:
      return {
        outcome: 'generic_empty',
        title: 'Nenhum produto encontrado',
        description: 'Ajuste a busca ou os filtros. Se precisar, fale com a HF.',
      }
  }
}
