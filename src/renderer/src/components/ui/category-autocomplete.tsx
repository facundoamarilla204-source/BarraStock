import { useState, useRef, useEffect } from 'react'
import { Input } from './input'

interface CategoryAutocompleteProps {
  value: string
  onChange: (val: string) => void
  existingCategories: string[]
}

export function CategoryAutocomplete({ value, onChange, existingCategories }: CategoryAutocompleteProps) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const normalizedValue = (value || '').trim().toLowerCase()

  const filtered = existingCategories.filter(cat => 
    cat.toLowerCase().includes(normalizedValue)
  )

  const exactMatch = existingCategories.find(cat => cat.toLowerCase() === normalizedValue)

  return (
    <div className="relative" ref={wrapperRef}>
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          // If the typed value matches an existing category case-insensitively, correct it to the exact existing casing.
          // We wait a bit to let onMouseDown events (like clicking a suggestion) fire first.
          setTimeout(() => {
            if (exactMatch && exactMatch !== value) {
              onChange(exactMatch)
            } else {
              onChange(value.trim())
            }
          }, 150)
        }}
        placeholder="Ej: Snacks, Bebidas..."
      />
      
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground border rounded-md shadow-md max-h-60 overflow-auto">
          {filtered.map(cat => (
            <div
              key={cat}
              className="px-2 py-1.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground"
              onMouseDown={(e) => {
                // Use onMouseDown to fire before input onBlur
                e.preventDefault()
                onChange(cat)
                setOpen(false)
              }}
            >
              {cat}
            </div>
          ))}
          {!exactMatch && (value || '').trim() !== '' && (
            <div
              className="px-2 py-1.5 text-sm cursor-pointer text-blue-500 hover:bg-accent flex items-center gap-2"
              onMouseDown={(e) => {
                e.preventDefault()
                onChange(value.trim())
                setOpen(false)
              }}
            >
              <span>Crear nueva categoría: <b>"{value.trim()}"</b></span>
            </div>
          )}
          {filtered.length === 0 && (value || '').trim() === '' && (
            <div className="px-2 py-1.5 text-sm text-muted-foreground italic">
              Escribe para buscar o crear...
            </div>
          )}
        </div>
      )}
    </div>
  )
}
