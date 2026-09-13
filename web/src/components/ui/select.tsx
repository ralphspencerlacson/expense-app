import { Children, isValidElement, useEffect, useId, useRef, useState, type SelectHTMLAttributes, type ReactElement } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '../../lib/utils'

type OptionProps = { value?: string | number; children?: React.ReactNode; disabled?: boolean }

export function Select({ className, children, value, defaultValue, disabled, id, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  const generatedId = useId()
  const listId = generatedId + '-options'
  const native = useRef<HTMLSelectElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [localValue, setLocalValue] = useState(defaultValue)
  const [position, setPosition] = useState({ left: 0, top: 0, width: 0, maxHeight: 280 })
  const options = Children.toArray(children).filter((child): child is ReactElement<OptionProps> => isValidElement<OptionProps>(child) && child.type === 'option')
  const selected = options.findIndex(option => String(option.props.value ?? option.props.children) === String(value ?? localValue))
  const selectedIndex = selected < 0 ? 0 : selected

  const show = () => {
    if (disabled || !trigger.current) return
    const rect = trigger.current.getBoundingClientRect()
    const below = window.innerHeight - rect.bottom - 12
    const height = Math.min(280, options.length * 44 + 12)
    const above = below < height && rect.top > below
    setPosition({ left: rect.left, width: rect.width, top: above ? Math.max(8, rect.top - height - 6) : rect.bottom + 6, maxHeight: above ? Math.min(height, rect.top - 14) : Math.min(height, below) })
    setActive(selectedIndex)
    setOpen(true)
  }
  const choose = (index: number) => {
    const option = options[index]
    if (!option || option.props.disabled || !native.current) return
    native.current.value = String(option.props.value ?? option.props.children)
    setLocalValue(native.current.value)
    native.current.dispatchEvent(new Event('change', { bubbles: true }))
    setOpen(false)
    trigger.current?.focus()
  }

  useEffect(() => {
    if (!open) return
    const closeOutside = (event: PointerEvent) => {
      if (!trigger.current?.contains(event.target as Node) && !menu.current?.contains(event.target as Node)) setOpen(false)
    }
    const close = (event: Event) => {
      if (event.target instanceof Node && menu.current?.contains(event.target)) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', closeOutside)
    window.addEventListener('resize', close)
    window.addEventListener('scroll', close, true)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', close, true)
    }
  }, [open])

  useEffect(() => {
    if (open) menu.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [open, active])

  return <>
    <button ref={trigger} id={id} type="button" role="combobox" aria-label={props['aria-label']} aria-labelledby={props['aria-labelledby']} aria-expanded={open} aria-controls={open ? listId : undefined} aria-haspopup="listbox" aria-activedescendant={open ? listId + '-' + active : undefined} disabled={disabled}
      className={cn('flex h-12 w-full items-center justify-between gap-3 rounded-2xl border border-zinc-200/80 bg-white/90 px-4 text-left text-base font-normal text-zinc-900 outline-none transition hover:border-zinc-300 focus-visible:border-zinc-400 focus-visible:ring-4 focus-visible:ring-zinc-200/60 disabled:cursor-not-allowed disabled:opacity-50 sm:h-11 sm:text-sm', open && 'border-zinc-400 ring-4 ring-zinc-200/60', className)}
      onClick={() => open ? setOpen(false) : show()}
      onBlur={() => setOpen(false)}
      onKeyDown={event => {
        if (event.key === 'Escape' || event.key === 'Tab') { setOpen(false); return }
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
          event.preventDefault()
          if (!open) { show(); return }
          const direction = event.key === 'ArrowUp' || event.key === 'End' ? -1 : 1
          let next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : active + direction
          while (next >= 0 && next < options.length && options[next].props.disabled) next += direction
          if (next >= 0 && next < options.length) setActive(next)
        } else if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          if (open) choose(active); else show()
        } else if (event.key.length === 1) {
          const next = options.findIndex((option, index) => index > active && !option.props.disabled && String(option.props.children).toLowerCase().startsWith(event.key.toLowerCase()))
          const match = next >= 0 ? next : options.findIndex(option => !option.props.disabled && String(option.props.children).toLowerCase().startsWith(event.key.toLowerCase()))
          if (match >= 0) { event.preventDefault(); if (!open) show(); setActive(match) }
        }
      }}>
      <span className="truncate">{options[selectedIndex]?.props.children}</span><ChevronDown className={cn('h-4 w-4 shrink-0 text-zinc-500 transition-transform', open && 'rotate-180')} />
    </button>
    <select {...props} ref={native} value={value} defaultValue={defaultValue} disabled={disabled} aria-hidden="true" tabIndex={-1} className="sr-only" onInvalid={() => trigger.current?.focus()}>{children}</select>
    {open && createPortal(<div ref={menu} id={listId} role="listbox" aria-label={props['aria-label'] ?? 'Options'} style={position} className="fixed z-[200] overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-xl shadow-zinc-950/15" onScroll={event => event.stopPropagation()}>
      {options.map((option, index) => <div key={index} id={listId + '-' + index} role="option" aria-selected={index === selectedIndex} aria-disabled={option.props.disabled} data-active={index === active}
        className={cn('flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm font-medium text-zinc-700', index === active && 'bg-zinc-100 text-zinc-950', index === selectedIndex && 'bg-zinc-950 text-white', option.props.disabled && 'cursor-not-allowed opacity-40')}
        onPointerDown={event => event.preventDefault()} onPointerMove={() => !option.props.disabled && setActive(index)} onClick={() => choose(index)}>
        <span>{option.props.children}</span>{index === selectedIndex && <Check className="h-4 w-4 shrink-0" />}
      </div>)}
    </div>, document.body)}
  </>
}
