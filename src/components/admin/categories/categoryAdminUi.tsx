import type { Category } from '@/types'

export function categoryStatusLabel(status: Category['status']): string {
  if (status === 'archived') return 'Arquivado'
  if (status === 'published') return 'Publicado'
  if (status === 'draft') return 'Rascunho'
  return status ?? '—'
}
