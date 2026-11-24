/**
 * Ciclo de vida na listagem admin de produtos.
 * Ativos = draft | published; Inativos = archived.
 */

export type ProductListLifecycle = {
  showActive: boolean
  showInactive: boolean
}

export const DEFAULT_PRODUCT_LIST_LIFECYCLE: ProductListLifecycle = {
  showActive: true,
  showInactive: false,
}

export type ProductStatusQuery =
  | { kind: 'empty' }
  | { kind: 'eq'; status: string }
  | { kind: 'neq'; status: string }
  | { kind: 'none' }

export function resolveProductStatusQuery(opts: {
  lifecycle?: ProductListLifecycle | null
  status?: string | null
}): ProductStatusQuery {
  const explicit = (opts.status ?? '').trim()
  if (explicit) return { kind: 'eq', status: explicit }

  const life = opts.lifecycle ?? DEFAULT_PRODUCT_LIST_LIFECYCLE
  const active = Boolean(life.showActive)
  const inactive = Boolean(life.showInactive)

  if (!active && !inactive) return { kind: 'empty' }
  if (active && inactive) return { kind: 'none' }
  if (inactive) return { kind: 'eq', status: 'archived' }
  return { kind: 'neq', status: 'archived' }
}

export function productLifecycleChipLabel(life: ProductListLifecycle): string | null {
  if (life.showActive && life.showInactive) return 'Ativos + inativos'
  if (life.showActive && !life.showInactive) return null
  if (!life.showActive && life.showInactive) return 'Só inativos'
  return 'Nenhum ciclo'
}

export function patchLifecycle(
  life: ProductListLifecycle,
  patch: Partial<ProductListLifecycle>,
): ProductListLifecycle {
  const next = { ...life, ...patch }
  if (!next.showActive && !next.showInactive) {
    if (patch.showActive === false) next.showInactive = true
    else next.showActive = true
  }
  return next
}
