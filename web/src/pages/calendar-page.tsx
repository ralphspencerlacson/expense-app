import { ChevronLeft, ChevronRight } from 'lucide-react'
import { EmptyState } from '../components/empty-state'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { getExpensesForMonth, getIncomeEntriesForMonth } from '../lib/recurring'
import { formatCurrency, moveMonth } from '../lib/utils'
import { useFinanceStore } from '../store/finance-store'

export function CalendarPage() {
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

  return (
    <div key={visibleMonth} className="month-change page-shell space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="page-title font-semibold">Calendar</h1>
          <p className="mt-1 text-sm text-zinc-500">Navigate months and see income, recorded expenses, and planned monthly bills.</p>
        </div>
        <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-start">
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
            const incomeTotal = dayIncome.filter((entry) => !entry.isGenerated).reduce((sum, entry) => sum + entry.amount, 0)
            const expectedIncomeTotal = dayIncome.filter((entry) => entry.isGenerated).reduce((sum, entry) => sum + entry.amount, 0)
            const expenseTotal = dayExpenses.filter((expense) => !expense.isGenerated).reduce((sum, expense) => sum + expense.amount, 0)
            const dueExpenseTotal = dayExpenses.filter((expense) => expense.isGenerated).reduce((sum, expense) => sum + expense.amount, 0)
            const plannedCount = dayIncome.filter((entry) => entry.isGenerated).length + dayExpenses.filter((expense) => expense.isGenerated).length

            return (
              <div key={day} className="interactive-lift min-h-32 rounded-3xl border border-zinc-100 bg-white/70 p-3 transition hover:bg-white hover:shadow-lg hover:shadow-zinc-900/5" aria-label={`${weekday}, ${visibleMonthLabel} ${day}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-2 text-sm font-semibold"><span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-zinc-950 text-white">{day}</span><span className="text-zinc-500 lg:hidden">{weekday}</span></p>
                  {plannedCount ? <span className="rounded-full bg-amber-100 px-2 py-1 text-[0.65rem] font-semibold text-amber-800">{plannedCount} expected</span> : null}
                </div>
                <div className="mt-3 space-y-1 text-xs">
                  {incomeTotal ? <p className="font-semibold text-emerald-600">+{formatCurrency(incomeTotal)}</p> : null}
                  {expenseTotal ? <p className="font-semibold text-red-600">-{formatCurrency(expenseTotal)}</p> : null}
                  {expectedIncomeTotal ? <p className="truncate rounded-full bg-amber-50 px-2 py-1 font-medium text-amber-800">Expected +{formatCurrency(expectedIncomeTotal)}</p> : null}
                  {dueExpenseTotal ? <p className="truncate rounded-full bg-amber-50 px-2 py-1 font-medium text-amber-800">Due -{formatCurrency(dueExpenseTotal)}</p> : null}
                </div>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
