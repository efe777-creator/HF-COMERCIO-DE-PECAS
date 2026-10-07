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
        <label htmlFor={inputId} className="text-xs font-extrabold text-hf-muted">
          {label}
        </label>
      ) : null}
      <input
        ref={ref}
        id={inputId}
        className={[
          'w-full rounded-[9px] border border-hf-line bg-hf-surface-2 px-3 py-3 text-hf-ink outline-none',
          'placeholder:text-hf-muted/70 focus:border-hf-red focus:shadow-[0_0_0_3px_rgba(197,23,31,0.25)]',
          error ? 'border-hf-danger' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      />
      {hint && !error ? <p className="text-[13px] text-hf-muted">{hint}</p> : null}
      {error ? <p className="text-[13px] text-hf-danger">{error}</p> : null}
    </div>
  )
})
