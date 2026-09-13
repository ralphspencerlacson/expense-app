import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
}

export function Button({ className, variant = 'primary', ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'interactive-lift inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold transition-[transform,background-color,border-color,box-shadow,color] duration-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-zinc-300 active:translate-y-0 active:scale-[0.97] disabled:cursor-not-allowed disabled:transform-none disabled:opacity-50',
        variant === 'primary' && 'action-button relative isolate overflow-hidden border border-white/10 bg-gradient-to-br from-zinc-700 via-zinc-900 to-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_12px_25px_-14px_rgba(9,9,11,0.85)] hover:from-zinc-600 hover:via-zinc-800 hover:to-zinc-950 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_16px_32px_-14px_rgba(9,9,11,0.9)]',
        variant === 'secondary' && 'border border-white/80 bg-white/60 text-zinc-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_10px_24px_-18px_rgba(15,23,42,0.5)] backdrop-blur-xl hover:border-white hover:bg-white/90',
        variant === 'ghost' && 'text-zinc-600 hover:bg-white/65 hover:text-zinc-950 hover:shadow-sm',
        variant === 'danger' && 'border border-red-400/30 bg-gradient-to-br from-red-500 to-red-700 text-white shadow-lg shadow-red-600/20 hover:from-red-600 hover:to-red-800',
        className,
      )}
      {...props}
    />
  )
}
