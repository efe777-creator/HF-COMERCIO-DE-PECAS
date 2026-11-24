import { useCallback, useState } from 'react'

/** Guias empilháveis genéricas (padrão Adaptive HF). */
export function useIdSplitTabs() {
  const [openIds, setOpenIds] = useState<string[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)

  const openTab = useCallback((entityId: string) => {
    const id = String(entityId ?? '').trim()
    if (!id) return
    setOpenIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
    setActiveId(id)
  }, [])

  const selectTab = useCallback((entityId: string) => {
    const id = String(entityId ?? '').trim()
    if (!id) return
    setOpenIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
    setActiveId(id)
  }, [])

  const closeTab = useCallback((entityId: string) => {
    const id = String(entityId ?? '').trim()
    setOpenIds((prev) => {
      const next = prev.filter((x) => x !== id)
      setActiveId((cur) => {
        if (cur !== id) return cur
        return next[next.length - 1] ?? null
      })
      return next
    })
  }, [])

  const closeAll = useCallback(() => {
    setOpenIds([])
    setActiveId(null)
  }, [])

  return {
    openIds,
    activeId,
    openTab,
    selectTab,
    closeTab,
    closeAll,
    hasOpen: openIds.length > 0 && activeId != null,
  }
}
