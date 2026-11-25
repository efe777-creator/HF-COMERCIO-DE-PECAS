import { PanelChrome } from '@/components/admin/workspace/PanelChrome'
import {
  clampSplitWidth,
  readModulePrefs,
  WORKSPACE_SPLIT_MAX,
  WORKSPACE_SPLIT_MIN,
  WORKSPACE_SPLIT_STEP,
  writeModulePrefs,
  type WorkspaceGuideDensity,
  type WorkspaceMode,
  type WorkspaceModuleKey,
} from '@/lib/adminWorkspacePrefs'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MutableRefObject,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'

const DESKTOP_MQ = '(min-width: 1024px)'
export const WORKSPACE_PANEL_STICKY_TOP = '0px'
export const WORKSPACE_ADMIN_HEADER = '4.25rem'

export type AdaptiveWorkspaceModeApi = {
  requestWideMode: (mode: 'expanded' | 'fullscreen') => void
  setMode: (mode: WorkspaceMode) => void
}

export type AdaptiveWorkspaceProps = {
  moduleKey: WorkspaceModuleKey
  primary: ReactNode
  contextual: ReactNode | null
  contextualOpen: boolean
  onContextualOpenChange: (open: boolean) => void
  contextualTitle?: string
  contextualExtraActions?: ReactNode
  contextualStatusBadge?: ReactNode
  modeApiRef?: MutableRefObject<AdaptiveWorkspaceModeApi | null>
}

export function AdaptiveWorkspace({
  moduleKey,
  primary,
  contextual,
  contextualOpen,
  onContextualOpenChange,
  contextualTitle = 'Detalhe',
  contextualExtraActions,
  contextualStatusBadge,
  modeApiRef,
}: AdaptiveWorkspaceProps) {
  const [prefs, setPrefs] = useState(() => readModulePrefs(moduleKey))
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(DESKTOP_MQ).matches : true,
  )
  const dragging = useRef(false)
  const panelRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    setPrefs(readModulePrefs(moduleKey))
  }, [moduleKey])

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_MQ)
    const onChange = () => setIsDesktop(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const persist = useCallback(
    (next: {
      mode?: WorkspaceMode
      splitWidthPx?: number
      guideDensity?: WorkspaceGuideDensity
    }) => {
      const merged = writeModulePrefs(moduleKey, {
        mode: next.mode ?? prefs.mode,
        splitWidthPx: next.splitWidthPx ?? prefs.splitWidthPx,
        guideDensity: next.guideDensity ?? prefs.guideDensity,
      })
      setPrefs(merged)
    },
    [moduleKey, prefs.mode, prefs.splitWidthPx, prefs.guideDensity],
  )

  const effectiveMode: WorkspaceMode =
    !contextualOpen || !contextual
      ? 'collapsed'
      : prefs.mode === 'collapsed'
        ? 'split'
        : prefs.mode

  useEffect(() => {
    if (contextualOpen && prefs.mode === 'collapsed') {
      persist({ mode: 'split' })
    }
  }, [contextualOpen, prefs.mode, persist])

  function handleModeChange(m: WorkspaceMode) {
    if (m === 'collapsed') {
      persist({ mode: 'collapsed' })
      onContextualOpenChange(false)
      return
    }
    persist({ mode: m })
    if (!contextualOpen) onContextualOpenChange(true)
  }

  useEffect(() => {
    if (!modeApiRef) return
    modeApiRef.current = {
      requestWideMode: (mode) => handleModeChange(mode),
      setMode: (mode) => handleModeChange(mode),
    }
    return () => {
      modeApiRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modeApiRef, moduleKey, prefs.mode, prefs.splitWidthPx, contextualOpen])

  function handleClose() {
    persist({ mode: 'collapsed' })
    onContextualOpenChange(false)
  }

  function onSplitterPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (!isDesktop) return
    e.preventDefault()
    dragging.current = true
    const startX = e.clientX
    const startW = prefs.splitWidthPx
    const target = e.currentTarget
    target.setPointerCapture(e.pointerId)
    const prevCursor = document.body.style.cursor
    const prevUserSelect = document.body.style.userSelect
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    target.dataset.dragging = '1'

    function onMove(ev: PointerEvent) {
      if (!dragging.current) return
      const delta = startX - ev.clientX
      persist({ splitWidthPx: clampSplitWidth(startW + delta) })
    }
    function onUp(ev: PointerEvent) {
      dragging.current = false
      delete target.dataset.dragging
      document.body.style.cursor = prevCursor
      document.body.style.userSelect = prevUserSelect
      try {
        target.releasePointerCapture(ev.pointerId)
      } catch {
        /* already released */
      }
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  function onSplitterKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (!isDesktop) return
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      persist({ splitWidthPx: clampSplitWidth(prefs.splitWidthPx + WORKSPACE_SPLIT_STEP) })
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      persist({ splitWidthPx: clampSplitWidth(prefs.splitWidthPx - WORKSPACE_SPLIT_STEP) })
    } else if (e.key === 'Home') {
      e.preventDefault()
      persist({ splitWidthPx: WORKSPACE_SPLIT_MAX })
    } else if (e.key === 'End') {
      e.preventDefault()
      persist({ splitWidthPx: WORKSPACE_SPLIT_MIN })
    }
  }

  const showContextual = contextualOpen && contextual != null && effectiveMode !== 'collapsed'
  const fullscreen = showContextual && effectiveMode === 'fullscreen'
  const expanded = showContextual && effectiveMode === 'expanded'
  const splitWidth = expanded ? Math.max(prefs.splitWidthPx, 560) : prefs.splitWidthPx
  const showGrip = isDesktop && showContextual && !fullscreen

  useEffect(() => {
    if (!showContextual || !isDesktop || fullscreen) return
    panelRef.current?.focus({ preventScroll: true })
  }, [showContextual, isDesktop, fullscreen, contextualTitle])

  const panelBody = (
    <>
      {showGrip ? (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-valuenow={Math.round(splitWidth)}
          aria-valuemin={WORKSPACE_SPLIT_MIN}
          aria-valuemax={WORKSPACE_SPLIT_MAX}
          aria-label="Arrastar para largura da guia"
          title="Arrastar · ← → para ajustar"
          tabIndex={0}
          className="group absolute inset-y-0 -left-2 z-20 w-4 cursor-col-resize touch-none outline-none focus-visible:ring-2 focus-visible:ring-hf-red"
          onPointerDown={onSplitterPointerDown}
          onKeyDown={onSplitterKeyDown}
        >
          <span
            className="absolute inset-y-3 left-1/2 w-1 -translate-x-1/2 rounded-full bg-hf-line transition-colors group-hover:bg-hf-red group-focus-visible:bg-hf-red group-data-[dragging=1]:w-1.5 group-data-[dragging=1]:bg-hf-red"
            aria-hidden
          />
        </div>
      ) : null}
      <PanelChrome
        title={contextualTitle}
        onClose={handleClose}
        extraActions={contextualExtraActions}
        statusBadge={contextualStatusBadge}
      />
      <div
        className="mt-1.5 flex min-h-0 flex-1 flex-col overflow-y-auto"
        data-guide-density={prefs.guideDensity}
      >
        {contextual}
      </div>
    </>
  )

  if (fullscreen || (!isDesktop && showContextual)) {
    return (
      <div className="relative min-h-[50vh]">
        <div className={fullscreen ? 'pointer-events-none invisible' : 'min-w-0'} aria-hidden={fullscreen}>
          {primary}
        </div>
        <aside
          ref={panelRef}
          tabIndex={-1}
          data-workspace-panel="overlay"
          className="fixed inset-0 z-40 m-0 flex h-full max-h-[100dvh] flex-col rounded-none border-0 bg-hf-bg p-4 outline-none"
          aria-label={contextualTitle}
        >
          {panelBody}
        </aside>
      </div>
    )
  }

  const primaryCompact = showContextual && !fullscreen

  return (
    <div
      className="flex min-h-0 items-stretch gap-0"
      data-workspace-layout={showContextual ? 'split' : 'stack'}
    >
      <div
        className="min-w-0 flex-1 overflow-x-hidden"
        data-workspace-primary={primaryCompact ? 'compact' : 'full'}
      >
        {primary}
      </div>
      {showContextual ? (
        <aside
          ref={panelRef}
          tabIndex={-1}
          data-workspace-panel="docked"
          className={[
            'relative z-20 flex shrink-0 flex-col overflow-visible border-l border-hf-line bg-hf-surface p-2.5 outline-none',
            'sticky self-start',
            '-mr-3 mb-[-0.75rem] sm:-mr-4 sm:mb-[-1rem] md:-mr-6 md:mb-[-1.5rem]',
          ].join(' ')}
          style={{
            width: splitWidth,
            maxWidth: `min(100%, ${WORKSPACE_SPLIT_MAX}px)`,
            top: WORKSPACE_PANEL_STICKY_TOP,
            height: `calc(100dvh - ${WORKSPACE_ADMIN_HEADER})`,
          }}
          aria-label={contextualTitle}
        >
          {panelBody}
        </aside>
      ) : null}
    </div>
  )
}
