import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'interactive-lift rounded-[1.5rem] border border-white/75 bg-white/80 p-4 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.65)] backdrop-blur-xl transition-[transform,border-color,background-color,box-shadow] duration-300 sm:rounded-[2rem] sm:p-5 hover:border-white hover:shadow-[0_32px_90px_-52px_rgba(15,23,42,0.75)]',
        className,
      )}
      {...props}
    />
  )
}
