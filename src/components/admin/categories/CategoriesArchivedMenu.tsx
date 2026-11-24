import { Button } from '@/components/common/Button'
import { useToast } from '@/components/common/Toast'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  adminDeleteCategory,
  adminSetCategoryStatus,
  categoryDepth,
  categoryLevelLabel,
  categoryPath,
} from '@/services/admin/adminCategoryService'
import type { Category } from '@/types'
import { useEffect, useMemo, useRef, useState } from 'react'

type Props = {
  items: Category[]
  onChanged: () => Promise<void>
}

export function CategoriesArchivedMenu({ items, onChanged }: Props) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [busy, setBusy] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const archivedItems = useMemo(
    () =>
      items
        .filter((c) => c.status === 'archived')
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [items],
  )

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!archivedItems.length) return null

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function onPublishSelected() {
    const ids = [...selected]
    if (!ids.length) return
    setBusy(true)
    try {
      for (const id of ids) {
        await adminSetCategoryStatus(id, 'published')
      }
      setSelected(new Set())
      setOpen(false)
      toast.push(`${ids.length} classificação(ões) publicada(s) de novo.`, 'success')
      await onChanged()
    } catch (err) {
      toast.push(toUserMessage(err, 'Falha ao publicar selecionadas'), 'error')
    } finally {
      setBusy(false)
    }
  }

  async function onDeleteSelected() {
    const ids = [...selected]
    if (!ids.length) return
    const ok = window.confirm(
      `Excluir permanentemente ${ids.length} classificação(ões)?\n\n` +
        'Só funciona sem filhos e sem produtos. Em caso de vínculo, a exclusão daquela linha falha.',
    )
    if (!ok) return
    setBusy(true)
    let deleted = 0
    const fails: string[] = []
    try {
      const ordered = ids
        .map((id) => items.find((c) => c.id === id))
        .filter((c): c is Category => Boolean(c))
        .sort((a, b) => categoryDepth(items, b.id) - categoryDepth(items, a.id))
      let working = items
      for (const cat of ordered) {
        try {
          await adminDeleteCategory(cat.id, working)
          working = working.filter((c) => c.id !== cat.id)
          deleted += 1
        } catch (err) {
          fails.push(`${cat.name}: ${toUserMessage(err, 'erro')}`)
        }
      }
      setSelected(new Set())
      if (deleted) toast.push(`${deleted} excluída(s).`, 'success')
      if (fails.length) toast.push(fails.slice(0, 3).join(' · '), 'error')
      if (!fails.length) setOpen(false)
      await onChanged()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative ml-auto" ref={rootRef}>
      <button
        type="button"
        className="text-xs font-semibold text-hf-muted underline-offset-2 hover:text-hf-ink hover:underline"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((o) => !o)}
      >
        Ver arquivados ({archivedItems.length})
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 w-[min(100vw-2rem,22rem)] rounded-[12px] border border-hf-line bg-hf-surface p-3 shadow-lg"
        >
          <p className="m-0 text-xs font-bold uppercase tracking-wide text-hf-muted">Arquivados</p>
          <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto">
            {archivedItems.map((c) => (
              <li key={c.id}>
                <label className="flex cursor-pointer items-start gap-2 rounded-md px-1 py-1 text-sm hover:bg-hf-bg">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={selected.has(c.id)}
                    onChange={() => toggleSelect(c.id)}
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-hf-ink">{c.name}</span>
                    <span className="block truncate text-[11px] text-hf-muted">
                      {categoryLevelLabel(categoryDepth(items, c.id))} · {categoryPath(items, c.id)}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2 border-t border-hf-line pt-3">
            <Button
              type="button"
              variant="primary"
              disabled={busy || selected.size === 0}
              onClick={() => void onPublishSelected()}
            >
              Publicar ({selected.size})
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy || selected.size === 0}
              onClick={() => void onDeleteSelected()}
            >
              Excluir
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
