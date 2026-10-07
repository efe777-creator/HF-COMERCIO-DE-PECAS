import type { SelectHTMLAttributes } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: Array<{ value: string; label: string }>
  placeholder?: string
}

export function Select({
  label,
  options,
  placeholder,
  id,
  className = '',
  ...props
}: SelectProps) {
  const selectId = id ?? props.name
  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={selectId} className="text-xs font-extrabold text-fal-muted">
          {label}
        </label>
      ) : null}
      <select
        id={selectId}
        className={[
          'w-full rounded-[9px] border border-fal-line bg-white px-3 py-3 outline-none',
          'focus:border-fal-yellow-dark focus:shadow-[0_0_0_3px_rgba(242,200,75,0.2)]',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
