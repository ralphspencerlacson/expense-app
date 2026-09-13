import { Badge } from '../components/ui/badge'
import { Card } from '../components/ui/card'
import { getExpensesForMonth } from '../lib/recurring'
import { formatCurrency, formatMonthLabel } from '../lib/utils'
import { useFinanceStore } from '../store/finance-store'

export function TagsPage() {
  const skippedKeys = useFinanceStore(state => state.skippedOccurrenceKeys)
  const { expenseTags, expenses, monthlyBills, selectedMonth } = useFinanceStore()
  const monthExpenses = getExpensesForMonth(monthlyBills, expenses, selectedMonth, skippedKeys).filter(expense => !expense.isGenerated)

  return (
    <div className="page-shell space-y-4 sm:space-y-6">
      <div>
        <h1 className="page-title font-semibold">Tags</h1>
        <p className="mt-1 text-sm text-zinc-500">Spending by category for {formatMonthLabel(selectedMonth)}, based on paid expenses.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {expenseTags.map((tag) => {
          const total = monthExpenses.filter((expense) => expense.tagId === tag.id).reduce((sum, expense) => sum + expense.amount, 0)
          return (
            <Card key={tag.id}>
              <div className="flex items-center justify-between gap-3">
                <Badge className={tag.color}>{tag.name}</Badge>
                <p className="text-sm capitalize text-zinc-500">{tag.group}</p>
              </div>
              <p className="metric-value mt-5 font-semibold">{formatCurrency(total)}</p>
              <p className="mt-1 text-sm text-zinc-500">This month</p>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
