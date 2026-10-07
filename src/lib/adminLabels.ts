/** Rótulos PT para status administrativos (sem redesign). */

export function productStatusLabel(status: string | null | undefined): string {
  switch (status) {
    case 'draft':
      return 'Rascunho'
    case 'published':
      return 'Publicado'
    case 'archived':
      return 'Arquivado'
    default:
      return status ?? '—'
  }
}

export function entityStatusLabel(status: string | null | undefined): string {
  switch (status) {
    case 'active':
      return 'Ativo'
    case 'inactive':
      return 'Inativo'
    case 'published':
      return 'Publicado'
    case 'archived':
      return 'Arquivado'
    case 'draft':
      return 'Rascunho'
    default:
      return status ?? '—'
  }
}

/** Tipos de referência / código cruzado do produto. */
export function productReferenceTypeLabel(type: string | null | undefined): string {
  switch (type) {
    case 'manufacturer':
      return 'Código do fabricante'
    case 'oem':
      return 'Código OEM (montadora)'
    case 'internal':
      return 'Código interno'
    case 'competitor':
      return 'Código concorrente'
    case 'other':
      return 'Outro'
    default:
      return type ?? '—'
  }
}
