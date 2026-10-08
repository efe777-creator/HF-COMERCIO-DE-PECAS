import { resolveCategoryIcon } from '@/lib/categoryEmoji'
import type { Category } from '@/types'
import { Link } from 'react-router-dom'

export function CategoryCard({ category }: { category: Category }) {
  const icon = resolveCategoryIcon(category)

  return (
    <Link
      to={`/categoria/${encodeURIComponent(category.slug)}`}
      className="min-w-0 overflow-hidden rounded-hf border border-hf-line bg-hf-surface p-[15px] transition hover:-translate-y-1 hover:shadow-hf sm:p-[22px]"
    >
      <div className="flex h-[38px] items-center sm:h-[46px]" aria-hidden>
        {icon.type === 'image' ? (
          <img
            src={icon.src}
            alt=""
            className="h-[38px] w-[38px] object-contain sm:h-[46px] sm:w-[46px]"
            loading="lazy"
          />
        ) : (
          <span className="text-[30px] leading-none sm:text-[38px]">{icon.value}</span>
        )}
      </div>
      <h3 className="mt-3 mb-1.5 line-clamp-2 break-words text-[15px] font-bold sm:text-lg">
        {category.name}
      </h3>
      {category.description ? (
        <small className="line-clamp-2 break-words text-[11px] text-hf-muted sm:text-sm">
          {category.description}
        </small>
      ) : null}
    </Link>
  )
}
