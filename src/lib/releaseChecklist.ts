/**
 * Checklist para liberar no catálogo HF (Andar 1) — sem exigência de preço.
 */

export type ReleaseChecklistInput = {
  productId: string
  name: string
  sku: string
  categoryId?: string | null
  status: string
  hasApplication: boolean
  hasImage: boolean
  publishIfNeeded?: boolean
  productKind?: 'item' | 'kit'
  kitCompositionOk?: boolean
}

export type ReleaseCheckItem = {
  code: string
  label: string
  level: 'hard' | 'soft'
  ok: boolean
  detail?: string
}

export type ReleaseChecklistResult = {
  productId: string
  canRelease: boolean
  checks: ReleaseCheckItem[]
  hardFails: ReleaseCheckItem[]
  softWarnings: ReleaseCheckItem[]
  summary: string
}

export function evaluateReleaseChecklist(input: ReleaseChecklistInput): ReleaseChecklistResult {
  const checks: ReleaseCheckItem[] = []

  const nameOk = Boolean(input.name?.trim())
  checks.push({
    code: 'name',
    label: 'Nome',
    level: 'hard',
    ok: nameOk,
    detail: nameOk ? undefined : 'Nome vazio',
  })

  const skuOk = Boolean(input.sku?.trim())
  checks.push({
    code: 'sku',
    label: 'Código referência (SKU)',
    level: 'hard',
    ok: skuOk,
    detail: skuOk ? undefined : 'SKU ausente',
  })

  const catOk = Boolean(input.categoryId?.trim())
  checks.push({
    code: 'category',
    label: 'Categoria',
    level: 'hard',
    ok: catOk,
    detail: catOk ? undefined : 'Sem categoria',
  })

  const publishOk = input.status === 'published' || input.publishIfNeeded === true
  checks.push({
    code: 'published',
    label: 'Publicação',
    level: 'hard',
    ok: publishOk,
    detail: publishOk
      ? input.status === 'published'
        ? 'Já publicado'
        : 'Será publicado neste passo'
      : 'Produto ainda não publicado (marque publicar neste passo)',
  })

  const isKit = input.productKind === 'kit'

  if (isKit) {
    const compositionOk = input.kitCompositionOk !== false
    checks.push({
      code: 'kit_composition',
      label: 'Composição do kit',
      level: 'hard',
      ok: compositionOk,
      detail: compositionOk ? undefined : 'Kit sem componentes na BOM',
    })
  }

  checks.push({
    code: 'application',
    label: isKit ? 'Aplicação do kit' : 'Aplicação veículo',
    level: 'soft',
    ok: input.hasApplication,
    detail: input.hasApplication ? undefined : 'Sem aplicação em veículo (aviso)',
  })

  checks.push({
    code: 'image',
    label: 'Imagem',
    level: 'soft',
    ok: input.hasImage,
    detail: input.hasImage ? undefined : 'Sem imagem (aviso)',
  })

  const hardFails = checks.filter((c) => c.level === 'hard' && !c.ok)
  const softWarnings = checks.filter((c) => c.level === 'soft' && !c.ok)
  const canRelease = hardFails.length === 0
  const summary = canRelease
    ? softWarnings.length
      ? `OK com ${softWarnings.length} aviso(s)`
      : 'OK'
    : hardFails.map((f) => f.detail ?? f.label).join('; ')

  return {
    productId: input.productId,
    canRelease,
    checks,
    hardFails,
    softWarnings,
    summary,
  }
}