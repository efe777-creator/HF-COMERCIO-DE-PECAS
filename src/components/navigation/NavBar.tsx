import { Container } from '@/components/layout/Container'
import { useCategories } from '@/hooks/useCatalog'
import { Link } from 'react-router-dom'

export function NavBar() {
  const categories = useCategories()

  return (
    <nav className="hidden bg-hf-surface-2 text-white lg:block">
      <Container className="flex flex-nowrap items-center gap-1 overflow-x-auto">
        <Link
          to="/"
          className="grid h-[46px] w-11 shrink-0 place-items-center text-lg hover:bg-hf-surface/10"
          aria-label="Início"
          title="Início"
        >
          ⌂
        </Link>
        <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-0 overflow-x-auto">
          {categories.data.map((item) => (
            <Link
              key={item.id}
              to={`/catalogo?cat=${encodeURIComponent(item.slug)}`}
              className="shrink-0 whitespace-nowrap px-[15px] py-[13px] text-sm hover:bg-hf-surface/10"
            >
              {item.name}
            </Link>
          ))}
        </div>
      </Container>
    </nav>
  )
}
