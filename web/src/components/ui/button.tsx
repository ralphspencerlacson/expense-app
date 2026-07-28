import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
}

export function Button({ className, variant = 'primary', ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'interactive-lift inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold transition-[transform,background-color,border-color,box-shadow,color] duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-zinc-300 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:transform-none disabled:opacity-50',
        variant === 'primary' && 'bg-zinc-950 text-white shadow-lg shadow-zinc-900/15 hover:bg-zinc-800 hover:shadow-xl hover:shadow-zinc-900/20',
        variant === 'secondary' && 'border border-zinc-200/80 bg-white/90 text-zinc-900 shadow-sm hover:border-zinc-300 hover:bg-white',
        variant === 'ghost' && 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950',
        variant === 'danger' && 'bg-red-600 text-white shadow-lg shadow-red-600/20 hover:bg-red-700',
        className,
      )}
      {...props}
    />
  )
}
