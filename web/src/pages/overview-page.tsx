import { getMonthlyCashflow } from '../lib/reporting'
import { ArrowDownRight, ArrowUpRight, CalendarClock, CirclePlus, ReceiptText, Sparkles, Wallet } from 'lucide-react'
import { Link } from 'react-router'
import { CashflowBarChart } from '../components/charts/cashflow-bar-chart'
import { ExpenseDonutChart } from '../components/charts/expense-donut-chart'
import { SavingsLineChart } from '../components/charts/savings-line-chart'
import { EmptyState } from '../components/empty-state'
import { Badge } from '../components/ui/badge'
import { Card } from '../components/ui/card'
import { getExpensesForMonth, getIncomeEntriesForMonth } from '../lib/recurring'
import { cn, formatCurrency, formatDate, formatMonthLabel } from '../lib/utils'
import { useFinanceStore } from '../store/finance-store'

export function OverviewPage() {
  const skippedKeys = useFinanceStore(state => state.skippedOccurrenceKeys)
  const { incomeEntries, incomeSources, expenses, expenseTags, monthlyBills } = useFinanceStore()
  const savingsSnapshots = getMonthlyCashflow(incomeEntries, expenses)
  const activeMonth = useFinanceStore((state) => state.selectedMonth)
  const monthIncomeEntries = getIncomeEntriesForMonth(incomeSources, incomeEntries, activeMonth, skippedKeys)
  const monthExpenses = getExpensesForMonth(monthlyBills, expenses, activeMonth, skippedKeys)
  const receivedIncomeEntries = monthIncomeEntries.filter((entry) => !entry.isGenerated)
  const expectedIncomeEntries = monthIncomeEntries.filter((entry) => entry.isGenerated)
  const paidExpenses = monthExpenses.filter((expense) => !expense.isGenerated)
  const dueExpenses = monthExpenses.filter((expense) => expense.isGenerated)
  const totalIncome = receivedIncomeEntries.reduce((sum, entry) => sum + entry.amount, 0)
  const expectedIncome = expectedIncomeEntries.reduce((sum, entry) => sum + entry.amount, 0)
  const totalExpenses = paidExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  const expectedExpenses = dueExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  const remaining = totalIncome - totalExpenses
  const forecastRemaining = totalIncome + expectedIncome - totalExpenses - expectedExpenses
  const currentMonthSavings = savingsSnapshots.find((snapshot) => snapshot.month === activeMonth)?.savings ?? remaining
  const recentIncome = [...receivedIncomeEntries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4)
  const recentExpenses = [...paidExpenses].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4)
  const upcomingIncome = [...expectedIncomeEntries].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3)
  const firstCutoffIncome = receivedIncomeEntries.filter((entry) => entry.cutoff === 'first').reduce((sum, entry) => sum + entry.amount, 0)
  const secondCutoffIncome = monthIncomeEntries.filter((entry) => entry.cutoff === 'second').reduce((sum, entry) => sum + entry.amount, 0)
  const firstCutoffExpenses = paidExpenses.filter((expense) => expense.cutoff === 'first').reduce((sum, expense) => sum + expense.amount, 0)
  const secondCutoffExpenses = monthExpenses.filter((expense) => expense.cutoff === 'second').reduce((sum, expense) => sum + expense.amount, 0)
  const plannedFirstIncome = monthIncomeEntries.filter(entry => entry.cutoff === 'first').reduce((sum, entry) => sum + entry.amount, 0)
  const plannedSecondIncome = monthIncomeEntries.filter(entry => entry.cutoff === 'second').reduce((sum, entry) => sum + entry.amount, 0)
  const plannedFirstExpenses = monthExpenses.filter(entry => entry.cutoff === 'first').reduce((sum, entry) => sum + entry.amount, 0)
  const plannedSecondExpenses = monthExpenses.filter(entry => entry.cutoff === 'second').reduce((sum, entry) => sum + entry.amount, 0)
  const topTag = expenseTags
    .map((tag) => ({
      tag,
      total: paidExpenses.filter((expense) => expense.tagId === tag.id).reduce((sum, expense) => sum + expense.amount, 0),
    }))
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total)[0]
  const spendingRate = totalIncome > 0 ? Math.min((totalExpenses / totalIncome) * 100, 100) : 0
  const expenseChartItems = expenseTags
    .map((tag) => ({
      label: tag.name,
      value: paidExpenses.filter((expense) => expense.tagId === tag.id).reduce((sum, expense) => sum + expense.amount, 0),
      color: getChartColor(tag.id),
    }))
    .filter((item) => item.value > 0)

  return (
    <div key={activeMonth} className="month-change page-shell space-y-4 sm:space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="hero-motion relative overflow-hidden rounded-[1.5rem] bg-zinc-950 p-5 text-white shadow-2xl shadow-zinc-950/20 sm:rounded-[2rem] sm:p-6">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-400/25 blur-3xl" />
          <div className="absolute -bottom-20 left-24 h-52 w-52 rounded-full bg-sky-400/20 blur-3xl" />
          <div className="relative">
            <Badge className="bg-white/10 text-white ring-white/15">{formatMonthLabel(activeMonth)}</Badge>
            <h1 className="page-title mt-3 max-w-2xl font-semibold">Your month, at a glance.</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-300">Actual cashflow is separated from expected income and bills, so you always know what has really happened.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link className="interactive-lift inline-flex min-h-11 items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-zinc-950 shadow-xl shadow-black/20 transition hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30" to="/income"><CirclePlus className="h-4 w-4" />Add income</Link>
              <Link className="interactive-lift inline-flex min-h-11 items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white shadow-lg backdrop-blur transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30" to="/expenses"><ReceiptText className="h-4 w-4" />Add expense</Link>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <HeroMetric label="Monthly net cashflow" value={formatCurrency(remaining)} />
              <HeroMetric label="Still due" value={formatCurrency(expectedExpenses)} />
              <HeroMetric label="Projected net cashflow" value={formatCurrency(forecastRemaining)} />
            </div>
          </div>
        </div>

        <Card className="flex flex-col justify-between bg-white/75">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-zinc-500">Cashflow health</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight">{remaining >= 0 ? 'On track' : 'Overspent'}</p>
            </div>
            <span className="flex h-14 w-14 items-center justify-center rounded-3xl bg-emerald-100 text-emerald-700">
              <Sparkles className="h-6 w-6" />
            </span>
          </div>
          <div className="mt-8">
            <div className="mb-2 flex justify-between text-xs font-medium text-zinc-500">
              <span>Expenses used</span>
              <span>{Math.round(spendingRate)}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-zinc-100">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-zinc-950" style={{ width: `${spendingRate}%` }} />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-3 min-[430px]:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <SummaryCard icon={ArrowUpRight} label="Income received" value={formatCurrency(totalIncome)} detail={`${formatCurrency(expectedIncome)} expected`} tone="emerald" />
        <SummaryCard icon={ArrowDownRight} label="Expenses paid" value={formatCurrency(totalExpenses)} detail={`${formatCurrency(expectedExpenses)} due`} tone="red" />
        <SummaryCard icon={Wallet} label="Monthly net cashflow" value={formatCurrency(remaining)} tone="zinc" />
        <SummaryCard icon={CalendarClock} label="Top expense tag" value={topTag?.tag.name ?? 'None'} detail={topTag ? formatCurrency(topTag.total) : undefined} tone="sky" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold">Monthly net cashflow</h2>
              <p className="mt-1 text-sm text-zinc-500">Income received minus expenses paid, calculated from your records.</p>
            </div>
            <Badge className="bg-emerald-100 text-emerald-700">Latest {formatCurrency(currentMonthSavings)}</Badge>
          </div>
          {savingsSnapshots.length ? (
            <SavingsLineChart snapshots={savingsSnapshots} />
          ) : (
            <EmptyState
              title="No transaction history yet"
              description="Record income or expenses to build your monthly cashflow history."
            />
          )}
        </Card>

        <Card>
          <div className="mb-6">
            <h2 className="font-semibold">Payment cashflow</h2>
            <p className="mt-1 text-sm text-zinc-500">Compare confirmed income and spending across both pay periods.</p>
          </div>
          <CashflowBarChart
            items={[
              { label: '1st payment', income: firstCutoffIncome, expenses: firstCutoffExpenses },
              { label: '2nd payment', income: secondCutoffIncome, expenses: secondCutoffExpenses },
            ]}
          />
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <div className="mb-6">
            <h2 className="font-semibold">Expense breakdown</h2>
            <p className="mt-1 text-sm text-zinc-500">Shows where the monthly expense pressure is coming from.</p>
          </div>
          {expenseChartItems.length ? (
            <ExpenseDonutChart items={expenseChartItems} />
          ) : (
            <EmptyState
              title="No expense breakdown yet"
              description="Setup monthly bills or add expenses to see where your money goes."
            />
          )}
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Your monthly setup</h2>
              <p className="mt-1 text-sm text-zinc-500">Expected cash flow for {formatMonthLabel(activeMonth)}.</p>
            </div>
            <Badge className="bg-zinc-950 text-white">Projected {formatCurrency(forecastRemaining)}</Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <SetupCard label="1st payment income" value={formatCurrency(plannedFirstIncome)} tone="income" />
            <SetupCard label="2nd payment income" value={formatCurrency(plannedSecondIncome)} tone="income" />
            <SetupCard label="1st pay-period spending" value={formatCurrency(plannedFirstExpenses)} tone="expense" />
            <SetupCard label="2nd pay-period spending" value={formatCurrency(plannedSecondExpenses)} tone="expense" />
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <Card className="lg:col-span-1">
          <h2 className="font-semibold">Expected income</h2>
          <div className="mt-4 space-y-3">
            {upcomingIncome.length ? upcomingIncome.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between gap-3 rounded-2xl border border-amber-100 bg-amber-50/60 p-3">
                <div>
                  <p className="text-sm font-medium">{entry.title}</p>
                  <p className="text-xs text-zinc-500">Expected {formatDate(entry.date)}</p>
                </div>
                <p className="text-sm font-semibold">{formatCurrency(entry.amount)}</p>
              </div>
            )) : (
              <EmptyState
                title="No income sources"
                  description="All expected income for this month has been received, or no recurring source is configured."
              />
            )}
          </div>
        </Card>

        <Card>
            <h2 className="font-semibold">Bills still due</h2>
          <div className="mt-4 space-y-3">
            {dueExpenses.length ? dueExpenses
              .sort((a, b) => a.date.localeCompare(b.date))
              .slice(0, 4)
              .map((expense) => (
                <div key={expense.id} className="flex items-center justify-between gap-3 rounded-2xl p-2 transition hover:bg-red-50/70">
                  <div>
                    <p className="text-sm font-medium">{expense.title}</p>
                    <p className="text-xs text-zinc-500">Due {formatDate(expense.date)}</p>
                  </div>
                  <Badge className="bg-red-100 text-red-700">{formatCurrency(expense.amount)}</Badge>
                </div>
              )) : (
                <EmptyState
                  title="No monthly bills"
                  description="All recurring bills are paid, or no bills are configured."
                />
              )}
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold">Recent income</h2>
          <div className="mt-4 space-y-3">
            {recentIncome.length ? recentIncome.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between gap-3 rounded-2xl p-2 transition hover:bg-emerald-50/70">
                <div>
                  <p className="text-sm font-medium">{entry.title}</p>
                  <p className="text-xs text-zinc-500">{formatDate(entry.date)}</p>
                </div>
                <Badge className="bg-emerald-100 text-emerald-700">+{formatCurrency(entry.amount)}</Badge>
              </div>
            )) : (
              <EmptyState
                title="No recent income"
                description="Confirmed and manually added income will appear here."
              />
            )}
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold">Recent expenses</h2>
          <div className="mt-4 space-y-3">
            {recentExpenses.length ? recentExpenses.map((expense) => {
              const tag = expenseTags.find((item) => item.id === expense.tagId)
              return (
                <div key={expense.id} className="flex items-center justify-between gap-3 rounded-2xl p-2 transition hover:bg-zinc-50">
                  <div>
                    <p className="text-sm font-medium">{expense.title}</p>
                    <p className="text-xs text-zinc-500">{formatDate(expense.date)}</p>
                  </div>
                  <Badge className={tag?.color}>{formatCurrency(expense.amount)}</Badge>
                </div>
              )
            }) : (
              <EmptyState
                title="No recent expenses"
                description="Paid bills and one-off expenses will appear here."
              />
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

function SetupCard({ label, value, tone }: { label: string; value: string; tone: 'income' | 'expense' }) {
  return (
    <div className={cn('rounded-3xl p-4 ring-1', tone === 'income' ? 'bg-emerald-50 text-emerald-950 ring-emerald-100' : 'bg-red-50 text-red-950 ring-red-100')}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="metric-value mt-2 font-semibold">{value}</p>
    </div>
  )
}

function getChartColor(tagId: string) {
  const colors: Record<string, string> = {
    'tag-bills': '#ef4444',
    'tag-family': '#ec4899',
    'tag-health': '#84cc16',
    'tag-property': '#6366f1',
    'tag-grocery': '#10b981',
    'tag-food': '#f59e0b',
    'tag-leisure': '#8b5cf6',
    'tag-transport': '#0ea5e9',
  }

  return colors[tagId] ?? '#71717a'
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur">
      <p className="text-xs font-medium text-zinc-300">{label}</p>
      <p className="mt-2 text-xl font-semibold tracking-tight">{value}</p>
    </div>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: typeof Wallet
  label: string
  value: string
  detail?: string
  tone: 'emerald' | 'red' | 'zinc' | 'sky'
}) {
  return (
    <Card className="group relative overflow-hidden">
      <div
        className={cn(
          'absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl transition group-hover:scale-125',
          tone === 'emerald' && 'bg-emerald-200/70',
          tone === 'red' && 'bg-red-200/70',
          tone === 'zinc' && 'bg-zinc-300/70',
          tone === 'sky' && 'bg-sky-200/70',
        )}
      />
      <div className="relative flex items-start justify-between gap-4">
        <p className="text-sm font-medium text-zinc-500">{label}</p>
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-950 text-white shadow-lg shadow-zinc-950/15">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="metric-value mt-2 font-semibold">{value}</p>
      {detail ? <p className="mt-1 text-sm text-zinc-500">{detail}</p> : null}
    </Card>
  )
}
