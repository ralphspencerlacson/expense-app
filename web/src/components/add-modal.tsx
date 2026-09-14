import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { Button } from './ui/button'

export function AddModal({ open, onClose, title, busy = false, children }: { open: boolean; onClose: () => void; title: string; busy?: boolean; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const element = dialog.current
    if (!element) return
    if (open) {
      element.dataset.closing = 'false'
      if (!element.open) element.showModal()
      const previous = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = previous }
    }
    if (element.open) {
      element.dataset.closing = 'true'
      const timer = window.setTimeout(() => element.close(), window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 180)
      return () => window.clearTimeout(timer)
    }
  }, [open])
  return createPortal(<dialog ref={dialog} aria-labelledby={titleId} className="add-modal m-auto max-h-[90dvh] w-[calc(100%_-_1.5rem)] max-w-2xl overflow-visible rounded-[2rem] border border-white/80 bg-slate-50 p-0 text-zinc-950 shadow-2xl" onCancel={event => { event.preventDefault(); if (!busy) onClose() }} onClick={event => { if (event.target === event.currentTarget && !busy) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose() } }}>
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4 sm:px-6"><h2 id={titleId} className="text-xl font-semibold">{title}</h2><Button type="button" variant="ghost" className="h-10 w-10 px-0" aria-label="Close" disabled={busy} onClick={onClose}><X className="h-4 w-4" /></Button></div>
    <div className="quiet-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-5 sm:p-6">{children}</div>
  </dialog>, document.body)
}
