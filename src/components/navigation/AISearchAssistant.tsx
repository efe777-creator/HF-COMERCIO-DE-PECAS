import { Button } from '@/components/common/Button'
import type { AISearchInterpretation } from '@/services/ai/types'

/**
 * Banner inline HF AI Search.
 * Nunca auto-aplica — cliente Aceita ou Mantém original.
 * Fora do catálogo: só aviso (OK), sem Aceitar que mude filtros de veículo.
 */
export function AISearchAssistant({
  originalQuery,
  suggestionLabel,
  interpretation,
  onAccept,
  onDismiss,
}: {
  originalQuery: string
  suggestionLabel: string
  interpretation: AISearchInterpretation
  onAccept: () => void
  onDismiss: () => void
}) {
  const clarifying =
    interpretation.needsClarification || interpretation.status === 'clarification_needed'
  const outside = Boolean(interpretation.vehicleRecognizedOutsideCatalog)
  const outsideLabel =
    interpretation.suggestedVehicleLabel?.trim() || suggestionLabel.trim() || null

  const displaySuggestion =
    interpretation.correctedQuery?.trim() &&
    interpretation.correctedQuery.trim().toLowerCase() !== originalQuery.trim().toLowerCase()
      ? interpretation.correctedQuery.trim()
      : suggestionLabel

  const canAcceptVehicleOrQuery =
    !outside ||
    Boolean(interpretation.productTerms?.length) ||
    (interpretation.correctedQuery?.trim() &&
      interpretation.correctedQuery.trim().toLowerCase() !== originalQuery.trim().toLowerCase() &&
      !interpretation.vehicleTerms?.model)

  if (outside && outsideLabel && !canAcceptVehicleOrQuery) {
    return (
      <div
        role="status"
        className="mt-3 rounded-hf border border-amber-500/40 bg-amber-500/10 px-3 py-3 text-sm text-hf-ink"
      >
        <p className="m-0">
          Identificamos <span className="font-extrabold">{outsideLabel}</span>, mas ainda não
          temos este veículo no catálogo HF.
          <span className="mt-1 block text-xs font-normal text-hf-muted">
            Busca original: “{originalQuery}”
          </span>
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onDismiss}>
            OK
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div
      role="status"
      className="mt-3 rounded-hf border border-amber-500/40 bg-amber-500/10 px-3 py-3 text-sm text-hf-ink"
    >
      {outside && outsideLabel ? (
        <p className="m-0 mb-2 text-xs text-hf-muted">
          Veículo reconhecido fora do catálogo: <strong>{outsideLabel}</strong> (filtro de carro
          não será aplicado).
        </p>
      ) : null}
      {clarifying && interpretation.clarificationQuestion ? (
        <p className="m-0 font-semibold">{interpretation.clarificationQuestion}</p>
      ) : (
        <p className="m-0">
          Você quis dizer{' '}
          <span className="font-extrabold text-hf-ink">{displaySuggestion}</span>?
          <span className="mt-1 block text-xs font-normal text-hf-muted">
            Busca original: “{originalQuery}”
          </span>
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" variant="primary" size="sm" onClick={onAccept}>
          {clarifying ? 'Continuar' : 'Aceitar sugestão'}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onDismiss}>
          Manter original
        </Button>
      </div>
    </div>
  )
}
