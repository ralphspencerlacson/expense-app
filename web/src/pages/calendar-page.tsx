import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { PaymentConfirmation, UndoPaymentConfirmation } from '../components/payment-confirmation'
import { Badge } from '../components/ui/badge'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { EmptyState } from '../components/empty-state'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { getExpensesForMonth, getIncomeEntriesForMonth } from '../lib/recurring'
import { cn, formatCurrency, formatDate, formatLocalDate, moveMonth } from '../lib/utils'
import { useFinanceStore } from '../store/finance-store'

export function CalendarPage() {
  const today = formatLocalDate()
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const popover = useRef<HTMLDivElement>(null)
  const anchor = useRef<HTMLButtonElement | null>(null)
  const [placement, setPlacement] = useState({ left: 0, top: 0, width: 360, maxHeight: 360, above: false })
  const selectDay = (date: string, button: HTMLButtonElement) => {
    if (date === selectedDate) { setSelectedDate(null); return }
    anchor.current = button
    const rect = button.getBoundingClientRect()
    const width = Math.min(360, window.innerWidth - 24)
    const below = window.innerHeight - rect.bottom - 20
    const above = below < 300 && rect.top > below
    setPlacement({ left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)), top: above ? rect.top - 8 : rect.bottom + 8, width, maxHeight: Math.max(120, Math.min(400, above ? rect.top - 20 : below)), above })
    setSelectedDate(date)
    requestAnimationFrame(() => popover.current?.focus({ preventScroll: true }))
  }
  useEffect(() => {
    if (!selectedDate) return
    const dismiss = (event: Event) => {
      const target = event.target as Element | null
      if (target && (popover.current?.contains(target) || anchor.current?.contains(target) || target.closest?.('[aria-modal="true"]'))) return
      setSelectedDate(null)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || document.querySelector('[aria-modal="true"]')) return
      setSelectedDate(null)
      anchor.current?.focus({ preventScroll: true })
    }
    document.addEventListener('pointerdown', dismiss)
    window.addEventListener('scroll', dismiss, true)
    window.addEventListener('resize', dismiss)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', dismiss)
      window.removeEventListener('scroll', dismiss, true)
      window.removeEventListener('resize', dismiss)
      document.removeEventListener('keydown', escape)
    }
  }, [selectedDate])
  const skippedKeys = useFinanceStore(state => state.skippedOccurrenceKeys)
  const { incomeEntries, incomeSources, expenses, monthlyBills, selectedMonth: visibleMonth, setSelectedMonth } = useFinanceStore()
  const monthDate = new Date(`${visibleMonth}-01T00:00:00`)
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate()
  const firstDay = monthDate.getDay()
  const calendarCells = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ]
  const visibleMonthLabel = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(monthDate)
  const visibleIncomeEntries = getIncomeEntriesForMonth(incomeSources, incomeEntries, visibleMonth, skippedKeys)
  const visibleExpenses = getExpensesForMonth(monthlyBills, expenses, visibleMonth, skippedKeys)
  const monthIncome = visibleIncomeEntries.filter((entry) => !entry.isGenerated).reduce((sum, entry) => sum + entry.amount, 0)
  const expectedIncome = visibleIncomeEntries.filter((entry) => entry.isGenerated).reduce((sum, entry) => sum + entry.amount, 0)
  const monthExpenses = visibleExpenses.filter((expense) => !expense.isGenerated).reduce((sum, expense) => sum + expense.amount, 0)
  const dueExpenses = visibleExpenses.filter((expense) => expense.isGenerated).reduce((sum, expense) => sum + expense.amount, 0)

  const selectedIncome = visibleIncomeEntries.filter(entry => entry.date === selectedDate)
  const selectedExpenses = visibleExpenses.filter(entry => entry.date === selectedDate)
  const overdue = visibleExpenses.filter(entry => entry.isGenerated && entry.date < today)

  return (
    <div key={visibleMonth} className="month-change page-shell space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="page-title font-semibold">Calendar</h1>
          <p className="mt-1 text-sm text-zinc-500">Navigate months and see income, recorded expenses, and planned monthly bills.</p>
        </div>
        <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-start">
<Button variant="secondary" onClick={() => { setSelectedMonth(today.slice(0, 7)); setSelectedDate(null) }}>Today</Button>
          <Button variant="secondary" aria-label="Previous month" onClick={() => setSelectedMonth(moveMonth(visibleMonth, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1 rounded-2xl border border-white/70 bg-white/80 px-3 py-2.5 text-center text-sm font-semibold shadow-lg shadow-zinc-900/5 sm:min-w-44 sm:flex-none sm:px-4 sm:text-base">
            {visibleMonthLabel}
          </div>
          <Button variant="secondary" aria-label="Next month" onClick={() => setSelectedMonth(moveMonth(visibleMonth, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-sm font-medium text-zinc-500">Income received</p>
          <p className="metric-value mt-2 font-semibold text-emerald-700">{formatCurrency(monthIncome)}</p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-zinc-500">Expenses paid</p>
          <p className="metric-value mt-2 font-semibold text-red-700">{formatCurrency(monthExpenses)}</p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-zinc-500">Income expected</p>
          <p className="metric-value mt-2 font-semibold text-amber-700">{formatCurrency(expectedIncome)}</p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-zinc-500">Bills due</p>
          <p className="metric-value mt-2 font-semibold text-amber-700">{formatCurrency(dueExpenses)}</p>
        </Card>
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><p className="text-sm text-zinc-500">Select a day to review payments and update their status.</p>{overdue.length ? <Badge className="bg-red-100 text-red-700">{overdue.length} overdue · {formatCurrency(overdue.reduce((sum, item) => sum + item.amount, 0))}</Badge> : null}</div>
        {!visibleIncomeEntries.length && !visibleExpenses.length ? (
          <div className="mb-4">
            <EmptyState
              title="No activity this month"
              description="Setup recurring income, monthly bills, or add one-off transactions to populate the calendar."
            />
          </div>
        ) : null}
        <div className="mb-3 hidden grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-wide text-zinc-400 lg:grid">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <span key={day}>{day}</span>)}
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-7">
          {calendarCells.map((day, index) => {
            if (!day) {
              return <div key={`blank-${index}`} className="hidden min-h-32 rounded-3xl border border-transparent lg:block" />
            }

            const date = `${visibleMonth}-${String(day).padStart(2, '0')}`
            const weekday = new Intl.DateTimeFormat('en', { weekday: 'short' }).format(new Date(`${date}T00:00:00`))
            const dayIncome = visibleIncomeEntries.filter((entry) => entry.date === date)
            const dayExpenses = visibleExpenses.filter((expense) => expense.date === date)
            const items = [...dayIncome.map(entry => ({ ...entry, kind: 'income' })), ...dayExpenses.map(entry => ({ ...entry, kind: 'expense' }))]
            const overdueCount = dayExpenses.filter(entry => entry.isGenerated && date < today).length

            return (
              <button type="button" key={day} onClick={event => selectDay(date, event.currentTarget)} aria-haspopup="dialog" aria-expanded={selectedDate === date} aria-controls={selectedDate === date ? "calendar-day-details" : undefined} className={cn('min-h-32 min-w-0 rounded-2xl border bg-white/70 p-3 text-left transition hover:bg-white hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600', selectedDate === date ? 'border-emerald-500 ring-2 ring-emerald-100' : 'border-zinc-100', date === today && 'bg-emerald-50/60')} aria-label={weekday + ', ' + formatDate(date) + ', ' + items.length + ' payments'} aria-pressed={selectedDate === date} aria-current={date === today ? 'date' : undefined}>
                <span className="flex items-center justify-between gap-2"><span className={cn('flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold', date === today ? 'bg-emerald-600 text-white' : 'text-zinc-700')}>{day}</span><span className="text-xs text-zinc-500">{date === today ? 'Today' : weekday}</span></span>
                <span className="mt-2 block space-y-1">
                  {items.slice(0, 2).map(item => <span key={item.kind + item.id} className={cn('block rounded-lg px-2 py-1 text-xs', item.kind === 'income' ? 'bg-emerald-50 text-emerald-800' : item.isGenerated && date < today ? 'bg-red-50 text-red-700' : item.isGenerated ? 'bg-amber-50 text-amber-800' : 'bg-zinc-100 text-zinc-700')}><span className="block truncate font-medium">{item.title}</span><span className="block truncate">{item.kind === 'income' ? '+' : '−'}{formatCurrency(item.amount)} · {item.isGenerated ? item.kind === 'income' ? 'Expected' : date < today ? 'Overdue' : 'Due' : item.kind === 'income' ? 'Received' : 'Paid'}</span></span>)}
                  {items.length > 2 ? <span className="block text-xs font-medium text-zinc-500">+{items.length - 2} more</span> : null}
                  {overdueCount ? <span className="block text-xs font-medium text-red-700">{overdueCount} overdue</span> : null}
                </span>
              </button>
            )
          })}
        </div>
      </Card>
      {selectedDate?.startsWith(visibleMonth) ? createPortal(
        <div ref={popover} id="calendar-day-details" role="dialog" aria-labelledby="calendar-day-title" tabIndex={-1} style={{ left: placement.left, top: placement.top, width: placement.width, maxHeight: placement.maxHeight, transform: placement.above ? 'translateY(-100%)' : undefined }} className="quiet-scrollbar fixed z-50 overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-4 shadow-xl shadow-zinc-950/15 outline-none">
          <div className="flex items-center justify-between gap-3"><h2 id="calendar-day-title" className="font-semibold">{formatDate(selectedDate)}</h2><Button type="button" variant="ghost" className="h-8 min-h-8 w-8 px-0" aria-label="Close day details" onClick={() => { setSelectedDate(null); anchor.current?.focus({ preventScroll: true }) }}><X className="h-4 w-4" /></Button></div>
          <p className="mt-1 text-sm text-zinc-500">{selectedIncome.length + selectedExpenses.length} {selectedIncome.length + selectedExpenses.length === 1 ? 'payment' : 'payments'} · Received {formatCurrency(selectedIncome.filter(item => !item.isGenerated).reduce((sum, item) => sum + item.amount, 0))} · Paid {formatCurrency(selectedExpenses.filter(item => !item.isGenerated).reduce((sum, item) => sum + item.amount, 0))}</p>
          <div className="mt-4 divide-y divide-zinc-100">
            {selectedIncome.map(entry => <div key={entry.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-medium">{entry.title}</p><p className="text-sm text-emerald-700">+{formatCurrency(entry.amount)} · {entry.isGenerated ? 'Expected income' : 'Received'}</p></div>{entry.isGenerated ? <PaymentConfirmation record={entry} kind="income" /> : <UndoPaymentConfirmation record={entry} kind="income" />}</div>)}
            {selectedExpenses.map(entry => <div key={entry.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-medium">{entry.title}</p><p className={cn('text-sm', entry.isGenerated && entry.date < today ? 'text-red-700' : 'text-zinc-600')}>−{formatCurrency(entry.amount)} · {entry.isGenerated ? entry.date < today ? 'Overdue' : 'Due' : 'Paid'}</p></div>{entry.isGenerated ? <PaymentConfirmation record={entry} kind="expense" /> : <UndoPaymentConfirmation record={entry} kind="expense" />}</div>)}
          </div>
          {!selectedIncome.length && !selectedExpenses.length ? <p className="py-6 text-sm text-zinc-500">No payments scheduled or recorded for this day.</p> : null}
        </div>
      , document.body) : null}
    </div>
  )
}
