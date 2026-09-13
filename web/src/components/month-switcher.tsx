import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatMonthLabel, getLocalMonth, moveMonth } from '../lib/utils'
import { useFinanceStore } from '../store/finance-store'
import { Button } from './ui/button'

export function MonthSwitcher() {
  const selectedMonth = useFinanceStore((state) => state.selectedMonth)
  const setSelectedMonth = useFinanceStore((state) => state.setSelectedMonth)
  const isSaving = useFinanceStore(state => state.isSaving)
  const currentMonth = getLocalMonth()

  return (
    <div className="flex min-w-0 flex-1 items-center gap-0.5 rounded-2xl border border-white/80 bg-white/45 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_12px_30px_-20px_rgba(15,23,42,0.45)] backdrop-blur-2xl sm:w-auto sm:flex-none sm:gap-1" aria-label="Selected month">
      <Button className="h-10 min-h-10 w-10 shrink-0 px-0 sm:h-11 sm:min-h-11 sm:w-11" type="button" disabled={isSaving} variant="ghost" aria-label="Previous month" onClick={() => setSelectedMonth(moveMonth(selectedMonth, -1))}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="relative flex h-10 min-w-[8.5rem] flex-1 items-center justify-center gap-2 rounded-xl px-2 font-semibold text-zinc-800 transition focus-within:bg-white/70 focus-within:ring-4 focus-within:ring-white/80 sm:h-11 sm:w-48 sm:flex-none">
        <CalendarDays className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden="true" />
        <span key={selectedMonth} className="month-change whitespace-nowrap text-sm">{formatMonthLabel(selectedMonth)}</span>
        <input className="absolute inset-0 cursor-pointer opacity-0" type="month" disabled={isSaving} value={selectedMonth} aria-label="Choose month" onChange={(event) => event.target.value && setSelectedMonth(event.target.value)} />
      </div>
      <Button className="h-10 min-h-10 w-10 shrink-0 px-0 sm:h-11 sm:min-h-11 sm:w-11" type="button" disabled={isSaving} variant="ghost" aria-label="Next month" onClick={() => setSelectedMonth(moveMonth(selectedMonth, 1))}>
        <ChevronRight className="h-4 w-4" />
      </Button>
      {selectedMonth !== currentMonth ? (
        <Button className="today-enter h-10 min-h-10 w-10 shrink-0 px-0 sm:h-11 sm:min-h-11 sm:w-auto sm:px-4" type="button" disabled={isSaving} variant="ghost" aria-label="Jump to current month" onClick={() => setSelectedMonth(currentMonth)}>
          <CalendarDays className="h-4 w-4 sm:hidden" /><span className="hidden sm:inline">Today</span>
        </Button>
      ) : null}
    </div>
  )
}
