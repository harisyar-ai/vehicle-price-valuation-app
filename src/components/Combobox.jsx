import React from 'react'

const controlCls =
  'w-full rounded-md border border-line bg-white px-3.5 py-2.5 pr-9 text-[14px] font-medium text-ink ' +
  'outline-none transition-colors placeholder:text-muted/60 hover:border-muted/60 focus:border-accent focus:ring-2 focus:ring-accent/20'

/**
 * Searchable dropdown (combobox): type to filter, click or keyboard to pick.
 * Drop-in replacement for the native <Select> — same props contract:
 * value, onChange(value), options (string[]), disabled, placeholder.
 */
export function Combobox({ value, onChange, options, disabled, placeholder, defaultOpen = false }) {
  const [open, setOpen] = React.useState(defaultOpen)
  const [query, setQuery] = React.useState('')
  const [highlight, setHighlight] = React.useState(0)
  const wrapRef = React.useRef(null)
  const inputRef = React.useRef(null)
  const listRef = React.useRef(null)

  const opts = React.useMemo(() => (options || []).map(String), [options])

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return opts
    return opts.filter((o) => o.toLowerCase().includes(q))
  }, [opts, query])

  // Close on outside click
  React.useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open ])

  // When options change underneath us (cascading selects), reset the filter
  React.useEffect(() => {
    setQuery('')
    setHighlight(0)
  }, [opts])

  const pick = (v) => {
    onChange(v)
    setQuery('')
    setOpen(false)
    inputRef.current?.blur()
  }

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open) setOpen(true)
      setHighlight((h) => Math.min(h + 1, Math.max(filtered.length - 1, 0)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      if (open && filtered[highlight] && query.trim() !== '') {
        e.preventDefault()
        pick(filtered[highlight])
      } else if (open) {
        setOpen(false)
      }
    }
  }

  // Keep the highlighted option visible while keyboard-navigating
  React.useEffect(() => {
    const list = listRef.current
    if (!list || !open) return
    const el = list.children[highlight]
    el?.scrollIntoView({ block: 'nearest' })
  }, [highlight, open])

  // What the input shows: the live query while typing, else the chosen value
  const display = open ? query : value || ''

  return (
    <div ref={wrapRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={display}
        disabled={disabled}
        placeholder={placeholder || 'Type to search…'}
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => {
          setQuery(e.target.value)
          setHighlight(0)
          if (!open) setOpen(true)
        }}
        onFocus={() => {
          if (!disabled) {
            setQuery('')
            setHighlight(0)
            setOpen(true)
          }
        }}
        onKeyDown={onKeyDown}
        className={controlCls + (value && !open ? '' : ' text-muted') + (disabled ? ' cursor-not-allowed opacity-60' : ' cursor-text')}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M3.5 5.5 7 9l3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>

      {open && !disabled && (
        <div
          ref={listRef}
          role="listbox"
          className="absolute z-30 mt-1.5 max-h-64 w-full overflow-y-auto rounded-lg border border-line bg-white py-1 shadow-[0_12px_32px_rgba(0,0,0,0.14)]"
        >
          {filtered.length === 0 ? (
            <p className="px-3.5 py-3 text-[13px] text-muted">No matches — try another search.</p>
          ) : (
            filtered.map((o, i) => (
              <button
                key={o + i}
                type="button"
                role="option"
                aria-selected={o === value}
                onMouseDown={(e) => {
                  e.preventDefault() // select before input blur closes the list
                  pick(o)
                }}
                onMouseEnter={() => setHighlight(i)}
                className={
                  'block w-full px-3.5 py-2.5 text-left text-[14px] transition-colors ' +
                  (i === highlight ? 'bg-paperdark text-ink' : 'text-ink/90') +
                  (o === value ? ' font-semibold' : '')
                }
              >
                {o}
                {o === value && <span className="ml-2 text-accent">✓</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
