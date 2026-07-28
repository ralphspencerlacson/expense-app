import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { getLocalMonth, moveMonth } from '../lib/utils'
import { useFinanceStore } from '../store/finance-store'
import { Button } from './ui/button'
import { Input } from './ui/input'

export function MonthSwitcher() {
  const selectedMonth = useFinanceStore((state) => state.selectedMonth)
  const setSelectedMonth = useFinanceStore((state) => state.setSelectedMonth)
  const currentMonth = getLocalMonth()

  return (
    <div className="flex w-full min-w-0 items-center gap-0.5 rounded-2xl border border-zinc-200/80 bg-white/90 p-1 shadow-sm sm:w-auto sm:gap-1" aria-label="Selected month">
      <Button className="h-11 min-h-11 w-11 shrink-0 px-0" type="button" variant="ghost" aria-label="Previous month" onClick={() => setSelectedMonth(moveMonth(selectedMonth, -1))}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="relative min-w-0 flex-1 sm:flex-none">
        <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <Input className="h-11 w-full min-w-0 rounded-xl border-0 bg-transparent pl-9 pr-1 font-semibold focus:ring-0 sm:w-40 sm:pr-2" type="month" value={selectedMonth} aria-label="Choose month" onChange={(event) => event.target.value && setSelectedMonth(event.target.value)} />
      </div>
      <Button className="h-11 min-h-11 w-11 shrink-0 px-0" type="button" variant="ghost" aria-label="Next month" onClick={() => setSelectedMonth(moveMonth(selectedMonth, 1))}>
        <ChevronRight className="h-4 w-4" />
      </Button>
      {selectedMonth !== currentMonth ? (
        <Button className="h-11 min-h-11 w-11 shrink-0 px-0 sm:w-auto sm:px-4" type="button" variant="ghost" aria-label="Jump to current month" onClick={() => setSelectedMonth(currentMonth)}>
          <CalendarDays className="h-4 w-4 sm:hidden" /><span className="hidden sm:inline">Today</span>
        </Button>
      ) : null}
    </div>
  )
}
