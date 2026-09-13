import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Pencil, X } from 'lucide-react'
import { Button } from './ui/button'

export function EditDrawer({ children, description, onClose, open, title }: { children: ReactNode; description?: string; onClose: () => void; open: boolean; title: string }) {
  useEffect(() => {
    if (!open) return
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [onClose, open])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-labelledby="edit-drawer-title">
      <button className="drawer-backdrop absolute inset-0 cursor-default bg-zinc-950/45 backdrop-blur-[3px]" type="button" aria-label="Close editor" onClick={onClose} />
      <aside className="drawer-enter absolute inset-x-2 bottom-2 flex max-h-[92dvh] flex-col overflow-hidden rounded-[2rem] border border-white/80 bg-slate-50/95 shadow-[0_30px_100px_-30px_rgba(15,23,42,0.75)] backdrop-blur-2xl sm:inset-y-4 sm:left-auto sm:right-4 sm:max-h-none sm:w-[30rem] sm:max-w-[calc(100vw-2rem)]">
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-zinc-300 sm:hidden" aria-hidden="true" />
        <div className="relative overflow-hidden bg-zinc-950 px-5 py-5 text-white sm:px-6 sm:py-6">
          <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-emerald-400/25 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-emerald-200"><Pencil className="h-4 w-4" /></span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">Edit details</p>
                <h2 id="edit-drawer-title" className="mt-1 text-xl font-semibold tracking-tight">{title}</h2>
                {description ? <p className="mt-1 text-sm leading-6 text-zinc-400">{description}</p> : null}
              </div>
            </div>
            <Button className="h-10 min-h-10 w-10 shrink-0 bg-white/10 px-0 text-white hover:bg-white/20 hover:text-white" type="button" variant="ghost" aria-label="Close editor" title="Close" onClick={onClose}><X className="h-4 w-4" /></Button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">{children}</div>
      </aside>
    </div>,
    document.body,
  )
}
