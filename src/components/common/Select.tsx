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
        <label htmlFor={selectId} className="text-xs font-extrabold text-hf-muted">
          {label}
        </label>
      ) : null}
      <select
        id={selectId}
        className={[
          'w-full rounded-[9px] border border-hf-line bg-hf-surface-2 px-3 py-3 text-hf-ink outline-none',
          'focus:border-hf-red focus:shadow-[0_0_0_3px_rgba(197,23,31,0.25)]',
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
