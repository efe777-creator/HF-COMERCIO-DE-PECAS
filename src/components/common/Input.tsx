import { forwardRef, type InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, id, className = '', ...props },
  ref,
) {
  const inputId = id ?? props.name
  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={inputId} className="text-xs font-extrabold text-fal-muted">
          {label}
        </label>
      ) : null}
      <input
        ref={ref}
        id={inputId}
        className={[
          'w-full rounded-[9px] border border-fal-line bg-white px-3 py-3 outline-none',
          'focus:border-fal-yellow-dark focus:shadow-[0_0_0_3px_rgba(242,200,75,0.2)]',
          error ? 'border-fal-danger' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      />
      {hint && !error ? <p className="text-[13px] text-fal-muted">{hint}</p> : null}
      {error ? <p className="text-[13px] text-fal-danger">{error}</p> : null}
    </div>
  )
})
