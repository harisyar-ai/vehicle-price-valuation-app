import React from 'react'

export function Field({ label, hint, error, children }) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
          {label}
        </span>
        {hint && (
          <span className="text-[11px] text-muted/80 tnum">{hint}</span>
        )}
      </span>
      <span className="mt-1.5 block">{children}</span>
      {error && (
        <span className="mt-1 block text-[12px] font-medium text-red-700">{error}</span>
      )}
    </label>
  )
}

const controlCls =
  'field-select w-full rounded-md border border-line bg-white px-3.5 py-2.5 pr-9 text-[14px] font-medium text-ink ' +
  'outline-none transition-colors placeholder:text-muted/60 hover:border-muted/60 focus:border-accent focus:ring-2 focus:ring-accent/20'

export function Select({ value, onChange, options, disabled, placeholder, error }) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={controlCls + (error ? ' border-red-500' : '') + (value ? '' : ' text-muted')}
    >
      <option value="">{placeholder || 'Select…'}</option>
      {options.map((o) => (
        <option key={String(o)} value={String(o)}>
          {o}
        </option>
      ))}
    </select>
  )
}

export function NumberInput({ value, onChange, min, max, step, placeholder, error, suffix }) {
  return (
    <span className="relative block">
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={
          'w-full rounded-md border border-line bg-white px-3.5 py-2.5 text-[14px] font-medium text-ink tnum ' +
          'outline-none transition-colors placeholder:text-muted/60 hover:border-muted/60 focus:border-accent focus:ring-2 focus:ring-accent/20 ' +
          (suffix ? 'pr-12' : '') + (error ? ' border-red-500' : '')
        }
      />
      {suffix && (
        <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[12px] font-medium text-muted">
          {suffix}
        </span>
      )}
    </span>
  )
}
