import { useEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

/**
 * Rola ao topo só quando o pathname muda (PUSH/REPLACE).
 * Não reage a troca só de search (filtros / page / q) nem a POP
 * (voltar do browser — o scroll nativo/histórico deve prevalecer).
 */
export function ScrollToTop() {
  const { pathname } = useLocation()
  const navType = useNavigationType()
  const prevPathname = useRef(pathname)

  useEffect(() => {
    const pathChanged = prevPathname.current !== pathname
    prevPathname.current = pathname
    if (!pathChanged) return
    if (navType === 'POP') return
    window.scrollTo(0, 0)
  }, [pathname, navType])

  return null
}
