import { useProductSearch } from '@/hooks/useCatalog'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export function SearchBar() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const { data, loading } = useProductSearch(query)
  const navigate = useNavigate()
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const suggestions = data.slice(0, 6)

  return (
    <div className="relative w-full" ref={wrapRef}>
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            setOpen(false)
            navigate(`/catalogo?q=${encodeURIComponent(query.trim())}`)
          }
        }}
        placeholder="Busque por peça, código, aplicação ou veículo"
        className="min-h-11 w-full rounded-xl border border-fal-line bg-[#fafbfc] py-2.5 pr-10 pl-3 text-sm outline-none focus:border-fal-yellow-dark focus:shadow-[0_0_0_3px_rgba(242,200,75,0.2)] sm:min-h-[46px] sm:py-[13px] sm:pr-11 sm:pl-4 lg:py-[15px] lg:pl-[18px]"
        aria-label="Busca de produtos"
      />
      <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-lg text-fal-muted sm:right-4 sm:text-xl">
        ⌕
      </span>

      {open && query.trim() ? (
        <div className="absolute top-[calc(100%+6px)] z-[120] w-full overflow-hidden rounded-xl border border-fal-line bg-white shadow-fal">
          {loading ? (
            <div className="px-4 py-3 text-sm text-fal-muted">Buscando…</div>
          ) : suggestions.length ? (
            suggestions.map((p) => (
              <Link
                key={p.id}
                to={`/produto/${p.id}`}
                className="block border-b border-fal-line px-4 py-3 text-sm hover:bg-[#f8f9fa]"
                onClick={() => setOpen(false)}
              >
                <strong>{p.name}</strong>
                <span className="mt-0.5 block text-xs text-fal-muted">
                  {p.brand} · {p.sku}
                </span>
              </Link>
            ))
          ) : (
            <Link
              to={`/catalogo?q=${encodeURIComponent(query.trim())}`}
              className="block px-4 py-3 text-sm hover:bg-[#f8f9fa]"
              onClick={() => setOpen(false)}
            >
              Ver resultados para “{query.trim()}” no catálogo
            </Link>
          )}
        </div>
      ) : null}
    </div>
  )
}
