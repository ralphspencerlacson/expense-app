import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold leading-4 ring-1 ring-black/5 transition-[transform,box-shadow] duration-300 sm:text-xs hover:-translate-y-0.5 hover:shadow-sm', className)}
      {...props}
    />
  )
}
