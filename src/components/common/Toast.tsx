import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

interface ToastItem {
  id: number
  message: string
  tone: 'info' | 'success' | 'error'
}

interface ToastContextValue {
  push: (message: string, tone?: ToastItem['tone']) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const push = useCallback((message: string, tone: ToastItem['tone'] = 'info') => {
    const id = Date.now() + Math.random()
    setItems((prev) => [...prev, { id, message, tone }])
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id))
    }, 3200)
  }, [])

  const value = useMemo(() => ({ push }), [push])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 bottom-20 z-[300] flex w-[min(360px,calc(100%-2rem))] flex-col gap-2 lg:bottom-4">
        {items.map((t) => (
          <div
            key={t.id}
            className={[
              'rounded-[10px] px-4 py-3 text-sm font-semibold shadow-fal',
              t.tone === 'success' && 'bg-fal-success text-white',
              t.tone === 'error' && 'bg-fal-danger text-white',
              t.tone === 'info' && 'bg-fal-navy text-white',
            ]
              .filter(Boolean)
              .join(' ')}
            role="status"
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast deve ser usado dentro de ToastProvider')
  return ctx
}
