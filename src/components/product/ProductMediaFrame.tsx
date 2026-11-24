import type { ReactNode } from 'react'

type Variant = 'card' | 'gallery' | 'thumb'

const shell: Record<Variant, string> = {
  card: 'flex h-[104px] w-full items-center justify-center overflow-hidden rounded-hf bg-hf-surface-2 sm:h-[176px]',
  gallery:
    'flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-hf bg-hf-surface dark:bg-hf-surface-2',
  thumb: 'flex h-full w-full items-center justify-center overflow-hidden rounded-hf bg-hf-surface-2',
}

const pad: Record<Variant, string> = {
  card: 'p-1 sm:p-1.5',
  gallery: 'p-1 sm:p-1.5',
  thumb: 'p-0.5',
}

/** Enquadra foto de peça sem cortar (contain). Tokens `--hf-*`. */
export function ProductMediaFrame({
  variant,
  children,
  className = '',
}: {
  variant: Variant
  children: ReactNode
  className?: string
}) {
  return (
    <div className={[shell[variant], className].filter(Boolean).join(' ')}>
      <div className={['flex h-full w-full items-center justify-center', pad[variant]].join(' ')}>
        {children}
      </div>
    </div>
  )
}

export const productMediaImgClass =
  'max-h-full max-w-full object-contain object-center'

export const productMediaImgClassCard =
  'h-full w-full origin-center object-contain object-center scale-[1.18]'

export const productMediaImgClassGallery =
  'max-h-full max-w-full origin-center object-contain object-center scale-[1.14]'
