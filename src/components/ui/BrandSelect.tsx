'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'

export interface BrandSelectOption {
  value: string
  label: string
  hint?: string
}

interface BrandSelectProps {
  value: string
  onChange: (value: string) => void
  options: BrandSelectOption[]
  placeholder?: string
  label?: string
  disabled?: boolean
  className?: string
  size?: 'sm' | 'md'
  /** Toon een zoekveld bovenin de dropdown — handig bij lange lijsten (games). */
  searchable?: boolean
}

/**
 * Brand-styled custom dropdown — vervangt native <select>.
 * Native select-popups krijgen system styling die niet te branden is;
 * BrandSelect rendert een fully-controlled menu zodat alles in dark
 * + Space Mono past. Met `searchable` komt er een filterveld bovenin.
 */
export function BrandSelect({
  value,
  onChange,
  options,
  placeholder = 'Selecteer...',
  label,
  disabled = false,
  className = '',
  size = 'md',
  searchable = false,
}: BrandSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [highlight, setHighlight] = useState<number>(-1)

  const close = useCallback(() => {
    setOpen(false)
    setQuery('')
    setHighlight(-1)
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        close()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [close])

  // Zoekveld focussen wanneer het menu opent.
  useEffect(() => {
    if (open && searchable) {
      requestAnimationFrame(() => searchRef.current?.focus())
    }
  }, [open, searchable])

  const selected = options.find((o) => o.value === value)

  const filtered = useMemo(() => {
    if (!searchable || !query.trim()) return options
    const q = query.trim().toLowerCase()
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, query, searchable])

  const pickIndex = useCallback(
    (idx: number) => {
      const opt = filtered[idx]
      if (!opt) return
      onChange(opt.value)
      close()
      buttonRef.current?.focus()
    },
    [filtered, onChange, close],
  )

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      close()
      return
    }
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        setOpen(true)
        setHighlight(Math.max(0, filtered.findIndex((o) => o.value === value)))
      }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => (filtered.length ? (h + 1) % filtered.length : -1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => (filtered.length ? (h - 1 + filtered.length) % filtered.length : -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (highlight >= 0) pickIndex(highlight)
    }
  }

  const padding = size === 'sm' ? 'px-3 py-2 text-[11px]' : 'px-3 py-2.5 text-xs'

  return (
    <div ref={ref} className={`relative ${className}`}>
      {label && (
        <label className="font-mono text-[10px] tracking-[0.2em] uppercase text-text-muted block mb-1.5">
          {label}
        </label>
      )}

      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          if (disabled) return
          if (open) close()
          else setOpen(true)
        }}
        onKeyDown={handleKey}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`
          w-full flex items-center justify-between gap-2
          bg-void border rounded-lg ${padding}
          text-text font-mono
          focus:outline-none transition-[border-color] duration-200
          disabled:opacity-40 disabled:cursor-not-allowed
          ${open ? 'border-purple' : 'border-border hover:border-purple/50'}
        `}
      >
        <span className={`truncate ${selected ? 'text-text' : 'text-text-dim'}`}>
          {selected?.label ?? placeholder}
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`text-text-muted shrink-0 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute z-50 top-full mt-1 left-0 right-0 bg-surface border border-border rounded-lg overflow-hidden shadow-xl shadow-black/50"
        >
          {searchable && (
            <div className="p-1.5 border-b border-border">
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setHighlight(0)
                }}
                onKeyDown={handleKey}
                placeholder="Zoeken..."
                className="w-full bg-void border border-border rounded-md px-2.5 py-1.5 text-text text-xs font-mono placeholder-text-dim/60 focus:outline-none focus:border-purple transition-colors"
              />
            </div>
          )}

          <div className="max-h-64 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-3 text-center font-mono text-[10px] text-text-dim">
                {searchable && query ? 'Geen resultaten' : 'Geen opties'}
              </div>
            ) : (
              filtered.map((opt, i) => {
                const isSelected = opt.value === value
                const isHighlighted = i === highlight
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => pickIndex(i)}
                    onMouseEnter={() => setHighlight(i)}
                    className={`
                      w-full flex items-center justify-between gap-2
                      px-3 py-2 text-left font-mono text-xs
                      transition-colors duration-150
                      ${
                        isSelected
                          ? 'bg-purple/20 text-text'
                          : isHighlighted
                            ? 'bg-surface-2 text-text'
                            : 'text-text-muted'
                      }
                    `}
                  >
                    <span className="flex flex-col min-w-0">
                      <span className="truncate">{opt.label}</span>
                      {opt.hint && (
                        <span className="text-[9px] text-text-dim mt-0.5 truncate">
                          {opt.hint}
                        </span>
                      )}
                    </span>
                    {isSelected && (
                      <span className="text-purple text-[10px] shrink-0">✓</span>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
