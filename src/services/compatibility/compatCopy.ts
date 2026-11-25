import {
  resolveCardSeal,
  type CompatibilityVerdict,
} from '@/services/compatibility/compatibilityEngine'

const MISSING_CODE_LABEL: Record<string, string> = {
  year_missing: 'ano',
  engine_missing: 'motor',
  version_missing: 'versão',
}

/** Label E.1 legível (Compatível / Compatível similar / A verificar / Incompatível). */
export function compatSealDisplayLabel(
  verdict: CompatibilityVerdict | null | undefined,
): string {
  if (!verdict) return ''
  const seal = resolveCardSeal(verdict)
  if (seal.kind === 'hide') return 'Incompatível'
  if (seal.kind === 'similar') return `${seal.label} ${seal.micro ?? 'similar'}`.trim()
  return seal.label
}

/** Motivo principal a partir das evidências (sem códigos técnicos). */
export function compatMotivo(
  verdict: CompatibilityVerdict | null | undefined,
): string | null {
  if (!verdict?.evidences?.length) return null
  const primary =
    verdict.evidences.find((e) => e.code === 'no_intersection') ??
    verdict.evidences.find((e) => e.code === 'no_pvc') ??
    verdict.evidences.find((e) => e.code.endsWith('_missing')) ??
    verdict.evidences[0]
  return primary?.detail?.trim() || null
}

/** O que falta para confirmar (A verificar / parcial). */
export function compatFaltante(
  verdict: CompatibilityVerdict | null | undefined,
): string | null {
  if (!verdict?.evidences?.length) return null
  const parts = verdict.evidences
    .map((e) => MISSING_CODE_LABEL[e.code])
    .filter((x): x is string => Boolean(x))
  if (parts.length) {
    const unique = [...new Set(parts)]
    return unique.join(', ')
  }
  if (verdict.evidences.some((e) => e.code === 'no_pvc')) {
    return 'aplicação PVC completa'
  }
  if (verdict.evidences.some((e) => e.code === 'maker_model_only')) {
    return 'ano, motor ou versão'
  }
  return null
}

/** Precisa de confirmação consciente antes de add/buy (similar ou A verificar). */
export function needsCompatPurchaseConfirm(
  verdict: CompatibilityVerdict | null | undefined,
): boolean {
  if (!verdict) return false
  const seal = resolveCardSeal(verdict)
  return seal.kind === 'similar' || seal.kind === 'check'
}
