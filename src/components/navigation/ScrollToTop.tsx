import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/** Garante que toda navegação comece no topo (Bloco A / navegação). */
export function ScrollToTop() {
  const { pathname, search } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname, search])
  return null
}
