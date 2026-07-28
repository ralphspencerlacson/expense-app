import type { SelectHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'h-12 w-full rounded-2xl border border-zinc-200/80 bg-white/90 px-4 text-base outline-none transition-[border-color,background-color,box-shadow] focus:border-zinc-400 focus:bg-white focus:ring-4 focus:ring-zinc-200/60 sm:h-11 sm:text-sm',
        className,
      )}
      {...props}
    />
  )
}
