import { useState, type FormEvent } from 'react'
import { EmptyState } from '../components/empty-state'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Select } from '../components/ui/select'
import { getExpensesForMonth } from '../lib/recurring'
import { cn, defaultDateForMonth, formatCurrency, formatDate, formatMonthLabel } from '../lib/utils'
import { useFinanceStore } from '../store/finance-store'

type ViewMode = 'list' | 'grid' | 'calendar'
type ExpenseAction = 'record_bill' | 'one_off' | 'setup_bill'

const dueDateDays = Array.from({ length: 31 }, (_, index) => String(index + 1))

export function ExpensesPage() {
  const { expenses, expenseTags, monthlyBills, addExpense, deleteExpense, addMonthlyBill, updateMonthlyBill, deleteMonthlyBill, selectedMonth } = useFinanceStore()
  const activeMonth = selectedMonth
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(() => defaultDateForMonth(activeMonth))
  const [tagId, setTagId] = useState(expenseTags[0]?.id ?? '')
  const [billName, setBillName] = useState('')
  const [billAmount, setBillAmount] = useState('')
  const [billDueDay, setBillDueDay] = useState('1')
  const [billTagId, setBillTagId] = useState('tag-bills')
  const [billEndMonth, setBillEndMonth] = useState('')
  const [editingBillId, setEditingBillId] = useState<string | null>(null)
  const [editBillName, setEditBillName] = useState('')
  const [editBillAmount, setEditBillAmount] = useState('')
  const [editBillDueDay, setEditBillDueDay] = useState('')
  const [editBillEndMonth, setEditBillEndMonth] = useState('')
  const [expenseAction, setExpenseAction] = useState<ExpenseAction>('one_off')
  const [formMessage, setFormMessage] = useState('')
  const [search, setSearch] = useState('')
  const [filterTag, setFilterTag] = useState('all')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const activeExpenseDate = date.startsWith(activeMonth) ? date : defaultDateForMonth(activeMonth)

  const monthExpenses = getExpensesForMonth(monthlyBills, expenses, activeMonth)
  const fixedExpenseTotal = monthExpenses.filter((expense) => expense.billId || expense.isGenerated).reduce((sum, expense) => sum + expense.amount, 0)
  const oneOffExpenseTotal = monthExpenses.filter((expense) => !expense.billId && !expense.isGenerated).reduce((sum, expense) => sum + expense.amount, 0)
  const monthExpenseTotal = fixedExpenseTotal + oneOffExpenseTotal
  const filteredExpenses = monthExpenses
    .filter((expense) => expense.title.toLowerCase().includes(search.toLowerCase()))
    .filter((expense) => filterTag === 'all' || expense.tagId === filterTag)
    .sort((a, b) => b.date.localeCompare(a.date))
  const confirmDeleteExpense = (id: string) => {
    const expense = expenses.find((item) => item.id === id)
    if (window.confirm(`Delete ${expense?.title ?? 'this expense'}?`)) deleteExpense(id)
  }

  const submitExpense = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const numericAmount = Number(amount)
    if (!title.trim()) return setFormMessage('Enter an expense description.')
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) return setFormMessage('Enter an amount greater than zero.')
    if (!activeExpenseDate) return setFormMessage('Choose the date of the expense.')
    if (!tagId) return setFormMessage('Choose a category.')

    addExpense({ title: title.trim(), amount: numericAmount, date: activeExpenseDate, tagId })
    setTitle('')
    setAmount('')
    setFormMessage('Expense added.')
  }

  const submitMonthlyBill = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const dueDay = Number(billDueDay)

    const numericAmount = Number(billAmount)
    if (!billName.trim()) return setFormMessage('Enter a name for this recurring bill.')
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) return setFormMessage('Enter an amount greater than zero.')
    if (dueDay < 1 || dueDay > 31) return setFormMessage('Choose a valid due day.')
    if (billEndMonth && billEndMonth < activeMonth) return setFormMessage('The end month cannot be before the start month.')

    addMonthlyBill({
      name: billName.trim(),
      expectedAmount: numericAmount,
      dueDay,
      tagId: billTagId,
      startMonth: activeMonth,
      endMonth: billEndMonth || undefined,
    })
    setBillName('')
    setBillAmount('')
    setBillDueDay('1')
    setBillEndMonth('')
    setFormMessage('Recurring bill added.')
  }

  const startEditBill = (bill: (typeof monthlyBills)[number]) => {
    setEditingBillId(bill.id)
    setEditBillName(bill.name)
    setEditBillAmount(String(bill.expectedAmount))
    setEditBillDueDay(String(bill.dueDay))
    setEditBillEndMonth(bill.endMonth ?? '')
  }

  const saveBillEdit = () => {
    const dueDay = Number(editBillDueDay)

    if (!editingBillId || !editBillName.trim() || Number(editBillAmount) <= 0 || dueDay < 1 || dueDay > 31) return

    updateMonthlyBill(editingBillId, {
      name: editBillName,
      expectedAmount: Number(editBillAmount),
      dueDay,
      endMonth: editBillEndMonth || undefined,
    })
    setEditingBillId(null)
  }

  return (
    <div className="page-shell space-y-4 sm:space-y-6">
      <div className="relative overflow-hidden rounded-[1.5rem] border border-white/70 bg-zinc-950 p-5 text-white shadow-[0_32px_90px_-45px_rgba(15,23,42,0.9)] sm:rounded-[2.25rem] sm:p-6 lg:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-red-400/25 blur-3xl" />
        <div className="pointer-events-none absolute right-32 top-20 h-32 w-32 rounded-full bg-amber-300/20 blur-2xl" />
        <div className="relative grid gap-6 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <Badge className="bg-white/10 text-white ring-white/15">Expense control</Badge>
            <h1 className="display-title mt-4 max-w-3xl font-semibold">Manage spending with a cleaner monthly command center.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-300">Track everyday spending and recurring bills for {formatMonthLabel(activeMonth)}.</p>
          </div>
          <div className="grid gap-3 min-[430px]:grid-cols-3 xl:w-[30rem]">
            <MetricCard label="Month total" value={formatCurrency(monthExpenseTotal)} tone="light" />
            <MetricCard label="Fixed bills" value={formatCurrency(fixedExpenseTotal)} tone="red" />
            <MetricCard label="One-off" value={formatCurrency(oneOffExpenseTotal)} tone="amber" />
          </div>
        </div>
      </div>

      <Card>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">What are you adding?</h2>
            <p className="mt-1 text-sm text-zinc-500">Choose the action and the form below adapts smoothly.</p>
          </div>
          <Badge className="bg-zinc-100 text-zinc-700">{formatMonthLabel(activeMonth)}</Badge>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <ActionChoice
            active={expenseAction === 'record_bill'}
            description="Review, edit, pause, or remove recurring costs."
            label="Manage recurring bills"
            meta="Monthly setup"
            onClick={() => setExpenseAction('record_bill')}
          />
          <ActionChoice
            active={expenseAction === 'one_off'}
            description="Food, transport, leisure, unexpected spending."
            label="Add one-off expense"
            meta="Manual entry"
            onClick={() => setExpenseAction('one_off')}
          />
          <ActionChoice
            active={expenseAction === 'setup_bill'}
            description="Only needed for a new recurring bill."
            label="Set up recurring bill"
            meta="Recurring setup"
            onClick={() => setExpenseAction('setup_bill')}
          />
        </div>
      </Card>

      {expenseAction === 'record_bill' ? (
        <Card className="animate-soft-scale">
          <h2 className="text-lg font-semibold tracking-tight">Recurring bills</h2>
          <p className="mt-1 text-sm text-zinc-500">Active bills are included automatically until their end month.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {monthlyBills.length ? monthlyBills.map((bill) => {
              const tag = expenseTags.find((item) => item.id === bill.tagId)
              return (
                <div key={bill.id} className="interactive-lift group rounded-3xl border border-zinc-100 bg-white/75 p-4 transition duration-300 hover:border-red-200 hover:bg-red-50/60 hover:shadow-xl hover:shadow-red-900/10">
                  {editingBillId === bill.id ? (
                    <div className="grid gap-2">
                      <Input value={editBillName} onChange={(event) => setEditBillName(event.target.value)} />
                       <Input aria-label="Bill amount" type="number" min="0.01" step="0.01" value={editBillAmount} onChange={(event) => setEditBillAmount(event.target.value)} />
                      <Select value={editBillDueDay} onChange={(event) => setEditBillDueDay(event.target.value)}>
                        <option value="">Due date day</option>
                        {dueDateDays.map((day) => <option key={day} value={day}>Day {day}</option>)}
                      </Select>
                      <Input type="month" value={editBillEndMonth} onChange={(event) => setEditBillEndMonth(event.target.value)} />
                      <div className="flex gap-2">
                        <Button type="button" onClick={saveBillEdit}>Save</Button>
                        <Button type="button" variant="ghost" onClick={() => setEditingBillId(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{bill.name}</p>
                          <p className="text-sm text-zinc-500">Due date: day {bill.dueDay}</p>
                        </div>
                        <Badge className={tag?.color}>{bill.cutoff === 'first' ? '1st' : bill.cutoff === 'second' ? '2nd' : tag?.name}</Badge>
                      </div>
                      <p className="mt-4 text-xl font-semibold">{formatCurrency(bill.expectedAmount)}</p>
                      <p className="mt-2 text-sm text-zinc-500">{bill.endMonth ? `Until ${formatMonth(bill.endMonth)}` : 'No end date'}</p>
                       <div className="mt-3 rounded-2xl bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-100">{bill.isActive ? 'Included automatically' : 'Paused'}</div>
                       <div className="mt-3 flex flex-wrap gap-1">
                         <Button className="min-w-0 flex-1 px-2" type="button" variant="ghost" onClick={() => startEditBill(bill)}>Edit</Button>
                         <Button className="min-w-0 flex-1 px-2" type="button" variant="ghost" onClick={() => updateMonthlyBill(bill.id, { isActive: !bill.isActive })}>{bill.isActive ? 'Pause' : 'Resume'}</Button>
                         <Button className="min-w-0 flex-1 px-2" type="button" variant="ghost" onClick={() => window.confirm(`Delete ${bill.name}? Existing recorded expenses will remain.`) && deleteMonthlyBill(bill.id)}>Delete</Button>
                       </div>
                    </>
                  )}
                </div>
              )
            }) : (
              <div className="xl:col-span-4 md:col-span-2">
                <EmptyState
                  title="No monthly bills yet"
                  description="Setup recurring bills like electricity, internet, support, amortization, rent, or subscriptions. They will be auto-added each month."
                  action={<Button type="button" onClick={() => setExpenseAction('setup_bill')}>Setup monthly bill</Button>}
                />
              </div>
            )}
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {expenseAction === 'one_off' ? (
          <Card className="relative animate-soft-scale overflow-hidden lg:col-span-2">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-red-200/60 blur-3xl" />
          <div className="relative">
            <h2 className="text-lg font-semibold tracking-tight">Add expense</h2>
            <p className="mt-1 text-sm text-zinc-500">For spending that is not part of your fixed monthly bills.</p>
            <form className="mt-4 grid gap-3" onSubmit={submitExpense}>
            <label className="text-sm font-semibold" htmlFor="expense-title">Description</label>
            <Input id="expense-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Lunch, fuel, medicine" required />
            <div className="grid gap-3 sm:grid-cols-3">
              <Input aria-label="Expense amount" type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Amount" required />
              <Input aria-label="Expense date" type="date" min={`${activeMonth}-01`} max={`${activeMonth}-31`} value={activeExpenseDate} onChange={(event) => setDate(event.target.value)} required />
              <Select aria-label="Expense category" value={tagId} onChange={(event) => setTagId(event.target.value)}>
                {expenseTags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
              </Select>
            </div>
              {formMessage ? <p className="text-sm font-medium text-zinc-600" role="status">{formMessage}</p> : null}
              <Button className="w-full sm:w-auto" type="submit">Add expense</Button>
            </form>
          </div>
        </Card>
        ) : null}

        {expenseAction === 'setup_bill' ? (
          <Card className="relative animate-soft-scale overflow-hidden lg:col-span-2">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-amber-200/70 blur-3xl" />
          <div className="relative">
            <h2 className="text-lg font-semibold tracking-tight">Set up recurring bill</h2>
            <p className="mt-1 text-sm text-zinc-500">Use this when you have a new recurring obligation.</p>
            <form className="mt-4 grid gap-3" onSubmit={submitMonthlyBill}>
            <label className="text-sm font-semibold" htmlFor="bill-name">Bill name</label>
            <Input id="bill-name" value={billName} onChange={(event) => setBillName(event.target.value)} placeholder="Electricity, internet, subscription" required />
            <div className="grid gap-3 sm:grid-cols-3">
              <Input aria-label="Recurring bill amount" type="number" min="0.01" step="0.01" value={billAmount} onChange={(event) => setBillAmount(event.target.value)} placeholder="Expected amount" required />
              <Select aria-label="Bill due day" value={billDueDay} onChange={(event) => setBillDueDay(event.target.value)}>
                {dueDateDays.map((day) => <option key={day} value={day}>Due every day {day}</option>)}
              </Select>
              <Select aria-label="Bill category" value={billTagId} onChange={(event) => setBillTagId(event.target.value)}>
                {expenseTags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
              </Select>
            </div>
            <label className="text-sm font-semibold" htmlFor="bill-end-month">End month <span className="font-normal text-zinc-500">(optional)</span></label>
            <Input id="bill-end-month" type="month" min={activeMonth} value={billEndMonth} onChange={(event) => setBillEndMonth(event.target.value)} />
              {formMessage ? <p className="text-sm font-medium text-zinc-600" role="status">{formMessage}</p> : null}
              <Button className="w-full sm:w-auto" type="submit">Add recurring bill</Button>
            </form>
          </div>
        </Card>
        ) : null}
      </div>

      {expenseAction !== 'record_bill' ? <Card>
        <h2 className="text-lg font-semibold tracking-tight">Monthly bills</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {monthlyBills.length ? monthlyBills.map((bill) => {
            const tag = expenseTags.find((item) => item.id === bill.tagId)
            return (
              <div key={bill.id} className="interactive-lift group rounded-3xl border border-zinc-100 bg-white/75 p-4 transition duration-300 hover:border-red-200 hover:bg-red-50/60 hover:shadow-xl hover:shadow-red-900/10">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{bill.name}</p>
                    <p className="text-sm text-zinc-500">Due every {bill.dueDay}</p>
                  </div>
                  <Badge className={tag?.color}>{tag?.name}</Badge>
                </div>
                <p className="mt-4 text-xl font-semibold">{formatCurrency(bill.expectedAmount)}</p>
                <p className="mt-2 text-sm text-zinc-500">{bill.endMonth ? `Until ${formatMonth(bill.endMonth)}` : 'No end date'}</p>
              </div>
            )
          }) : (
            <div className="xl:col-span-4 md:col-span-2">
              <EmptyState
                title="No monthly bills yet"
                description="Add a recurring bill and choose the exact due date day. You can also set an end month for loans or amortization."
              />
            </div>
          )}
        </div>
      </Card> : null}

      <Card>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid flex-1 gap-3 sm:grid-cols-2">
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search expenses" />
            <Select value={filterTag} onChange={(event) => setFilterTag(event.target.value)}>
              <option value="all">All tags</option>
              {expenseTags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-3 rounded-2xl border border-zinc-200/80 bg-white/70 p-1 shadow-inner">
            {(['list', 'grid', 'calendar'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                className={cn(
                  'min-h-11 rounded-xl px-3 py-2 text-sm font-medium capitalize text-zinc-600 transition-[background-color,color,box-shadow] duration-300 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300',
                  viewMode === mode && 'bg-zinc-950 text-white shadow-lg shadow-zinc-950/15 hover:text-white',
                )}
                type="button"
                aria-pressed={viewMode === mode}
                onClick={() => setViewMode(mode)}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          {!filteredExpenses.length && monthExpenses.length ? (
            <EmptyState title="No matching expenses" description="Try a different search or category filter." action={<Button variant="secondary" onClick={() => { setSearch(''); setFilterTag('all') }}>Clear filters</Button>} />
          ) : null}
          {viewMode === 'list' && (filteredExpenses.length || !monthExpenses.length) ? <ExpenseList expenses={filteredExpenses} onDelete={confirmDeleteExpense} /> : null}
          {viewMode === 'grid' && (filteredExpenses.length || !monthExpenses.length) ? <ExpenseGrid expenses={filteredExpenses} onDelete={confirmDeleteExpense} /> : null}
          {viewMode === 'calendar' && (filteredExpenses.length || !monthExpenses.length) ? <ExpenseCalendar expenses={filteredExpenses} month={activeMonth} /> : null}
        </div>
      </Card>
    </div>
  )
}

function ActionChoice({
  active,
  description,
  label,
  meta,
  onClick,
}: {
  active: boolean
  description: string
  label: string
  meta: string
  onClick: () => void
}) {
  return (
    <button
      className={`interactive-lift group relative overflow-hidden rounded-3xl border p-4 text-left transition duration-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-zinc-300 ${
        active
          ? 'border-zinc-950 bg-zinc-950 text-white shadow-2xl shadow-zinc-950/20'
          : 'border-zinc-100 bg-white/75 text-zinc-950 hover:border-zinc-300 hover:bg-white hover:shadow-xl hover:shadow-zinc-900/5'
      }`}
      type="button"
      aria-pressed={active}
      onClick={onClick}
    >
      <span className={`absolute right-4 top-4 h-2.5 w-2.5 rounded-full transition ${active ? 'bg-emerald-300 shadow-lg shadow-emerald-300/40' : 'bg-zinc-200 group-hover:bg-zinc-400'}`} />
      <p className={`mb-3 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${active ? 'bg-white/10 text-zinc-200' : 'bg-zinc-100 text-zinc-500'}`}>{meta}</p>
      <p className="font-semibold">{label}</p>
      <p className={`mt-1 text-sm ${active ? 'text-zinc-300' : 'text-zinc-500'}`}>{description}</p>
    </button>
  )
}

function MetricCard({ label, value, tone }: { label: string; value: string; tone: 'light' | 'red' | 'amber' }) {
  return (
    <div
      className={cn(
        'interactive-lift rounded-3xl border p-4 backdrop-blur transition duration-300',
        tone === 'light' && 'border-white/15 bg-white/10',
        tone === 'red' && 'border-red-300/20 bg-red-400/10',
        tone === 'amber' && 'border-amber-300/20 bg-amber-300/10',
      )}
    >
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-400">{label}</p>
      <p className="mt-3 text-lg font-semibold tracking-tight text-white">{value}</p>
    </div>
  )
}

function ExpenseList({ expenses, onDelete }: { expenses: ReturnType<typeof useFinanceStore.getState>['expenses']; onDelete: (id: string) => void }) {
  const tags = useFinanceStore((state) => state.expenseTags)
  const updateExpense = useFinanceStore((state) => state.updateExpense)
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null)
  const [editExpenseTitle, setEditExpenseTitle] = useState('')
  const [editExpenseAmount, setEditExpenseAmount] = useState('')
  const [editExpenseDate, setEditExpenseDate] = useState('')
  const [editExpenseTagId, setEditExpenseTagId] = useState('')

  const startEditExpense = (expense: (typeof expenses)[number]) => {
    setEditingExpenseId(expense.id)
    setEditExpenseTitle(expense.title)
    setEditExpenseAmount(String(expense.amount))
    setEditExpenseDate(expense.date)
    setEditExpenseTagId(expense.tagId)
  }

  const saveExpenseEdit = () => {
    if (!editingExpenseId || !editExpenseTitle.trim() || !Number(editExpenseAmount) || !editExpenseTagId) return

    updateExpense(editingExpenseId, {
      title: editExpenseTitle,
      amount: Number(editExpenseAmount),
      date: editExpenseDate,
      tagId: editExpenseTagId,
    })
    setEditingExpenseId(null)
  }

  return (
    <div className="space-y-3">
      {expenses.length ? expenses.map((expense) => {
        const tag = tags.find((item) => item.id === expense.tagId)
        return (
          <div key={expense.id} className="interactive-lift animate-soft-scale flex flex-col gap-3 rounded-3xl border border-zinc-100 bg-white/75 p-4 transition duration-300 hover:bg-white hover:shadow-xl hover:shadow-zinc-900/5 sm:flex-row sm:items-center sm:justify-between">
            {editingExpenseId === expense.id ? (
                  <div className="grid w-full gap-3 xl:grid-cols-[minmax(10rem,1fr)_9rem_9rem_9rem_auto]">
                <Input value={editExpenseTitle} onChange={(event) => setEditExpenseTitle(event.target.value)} />
                <Input aria-label="Expense amount" type="number" min="0.01" step="0.01" value={editExpenseAmount} onChange={(event) => setEditExpenseAmount(event.target.value)} />
                <Input aria-label="Expense date" type="date" value={editExpenseDate} onChange={(event) => setEditExpenseDate(event.target.value)} required />
                <Select value={editExpenseTagId} onChange={(event) => setEditExpenseTagId(event.target.value)}>
                  {tags.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </Select>
                <div className="flex gap-2">
                  <Button type="button" onClick={saveExpenseEdit}>Save</Button>
                  <Button type="button" variant="ghost" onClick={() => setEditingExpenseId(null)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <p className="font-medium">{expense.title}</p>
                  <p className="text-sm text-zinc-500">{formatDate(expense.date)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  {expense.billId ? <Badge className="bg-zinc-100 text-zinc-700">Bill</Badge> : null}
                  {expense.isGenerated ? <Badge className="bg-zinc-100 text-zinc-700">Auto</Badge> : null}
                  <Badge className={tag?.color}>{tag?.name}</Badge>
                  <p className="min-w-20 text-right text-sm font-semibold">{formatCurrency(expense.amount)}</p>
                  {expense.isGenerated ? null : <Button variant="ghost" onClick={() => startEditExpense(expense)}>Edit</Button>}
                  {expense.isGenerated ? null : <Button variant="ghost" onClick={() => onDelete(expense.id)}>Delete</Button>}
                </div>
              </>
            )}
          </div>
        )
      }) : (
        <EmptyState
          title="No expenses this month"
          description="Monthly bills will appear automatically after setup. One-off spending can be added manually."
        />
      )}
    </div>
  )
}

function formatMonth(month: string) {
  return new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(new Date(`${month}-01T00:00:00`))
}

function ExpenseGrid({ expenses, onDelete }: { expenses: ReturnType<typeof useFinanceStore.getState>['expenses']; onDelete: (id: string) => void }) {
  const tags = useFinanceStore((state) => state.expenseTags)

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {expenses.length ? expenses.map((expense) => {
        const tag = tags.find((item) => item.id === expense.tagId)
        return (
          <div key={expense.id} className="interactive-lift animate-soft-scale rounded-3xl border border-zinc-100 bg-white/75 p-4 transition duration-300 hover:bg-white hover:shadow-xl hover:shadow-zinc-900/5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{expense.title}</p>
                <p className="text-sm text-zinc-500">{formatDate(expense.date)}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                {expense.billId ? <Badge className="bg-zinc-100 text-zinc-700">Bill</Badge> : null}
                {expense.isGenerated ? <Badge className="bg-zinc-100 text-zinc-700">Auto</Badge> : null}
                <Badge className={tag?.color}>{tag?.name}</Badge>
              </div>
            </div>
            <p className="mt-4 text-xl font-semibold">{formatCurrency(expense.amount)}</p>
            {expense.isGenerated ? null : <Button className="mt-3" variant="ghost" onClick={() => onDelete(expense.id)}>Delete</Button>}
          </div>
        )
      }) : (
        <div className="lg:col-span-3 sm:col-span-2">
          <EmptyState
            title="No expenses to show"
            description="Add a one-off expense or setup monthly bills to populate this view."
          />
        </div>
      )}
    </div>
  )
}

function ExpenseCalendar({ expenses, month }: { expenses: ReturnType<typeof useFinanceStore.getState>['expenses']; month: string }) {
  const [year, monthNumber] = month.split('-').map(Number)
  const daysInMonth = new Date(year, monthNumber, 0).getDate()
  const days = Array.from({ length: daysInMonth }, (_, index) => String(index + 1).padStart(2, '0'))

  return (
    <>
      {!expenses.length ? (
        <EmptyState
          title="No calendar expenses"
          description="This calendar will highlight daily spending once expenses or monthly bills exist."
        />
      ) : null}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {days.map((day) => {
          const date = `${month}-${day}`
          const dailyTotal = expenses.filter((expense) => expense.date === date).reduce((sum, expense) => sum + expense.amount, 0)
          return (
            <div key={day} className="interactive-lift min-h-24 rounded-2xl border border-zinc-100 bg-white/75 p-3 transition duration-300 hover:border-red-200 hover:bg-red-50/60 hover:shadow-lg hover:shadow-red-900/5">
              <p className="text-sm font-medium">{Number(day)}</p>
              {dailyTotal ? <p className="mt-3 text-sm font-semibold text-red-600">-{formatCurrency(dailyTotal)}</p> : null}
            </div>
          )
        })}
      </div>
    </>
  )
}
