import { AddModal } from '../components/add-modal'
import { PaymentConfirmation, UndoPaymentConfirmation } from '../components/payment-confirmation'
import { useState, type FormEvent } from 'react'
import { CalendarDays, Check, CirclePlus, Grid2X2, LayoutList, Pause, Pencil, Play, Trash2, X } from 'lucide-react'
import { EditDrawer } from '../components/edit-drawer'
import { EmptyState } from '../components/empty-state'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Select } from '../components/ui/select'
import { getExpensesForMonth } from '../lib/recurring'
import { cn, defaultDateForMonth, formatCurrency, formatDate, formatLocalDate, formatMonthLabel } from '../lib/utils'
import { useFinanceStore } from '../store/finance-store'

type ViewMode = 'list' | 'grid' | 'calendar'
type ExpenseAction = 'one_off' | 'setup_bill'

const dueDateDays = Array.from({ length: 31 }, (_, index) => String(index + 1))
const viewModes = [
  { value: 'list', label: 'Table', icon: LayoutList },
  { value: 'grid', label: 'Cards', icon: Grid2X2 },
  { value: 'calendar', label: 'Calendar', icon: CalendarDays },
] satisfies { value: ViewMode; label: string; icon: typeof LayoutList }[]

export function ExpensesPage() {
  const skippedKeys = useFinanceStore(state => state.skippedOccurrenceKeys)
  const { expenses, expenseTags, monthlyBills, addExpense, deleteExpense, addMonthlyBill, updateMonthlyBill, deleteMonthlyBill, selectedMonth } = useFinanceStore()
  const isSaving = useFinanceStore(state => state.isSaving)
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
  const [account, setAccount] = useState('')
  const [note, setNote] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [formMessage, setFormMessage] = useState('')
  const [search, setSearch] = useState('')
  const [filterTag, setFilterTag] = useState('all')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const editingBill = monthlyBills.find(bill => bill.id === editingBillId)
  const openSchedule = (id: string) => { const bill = monthlyBills.find(item => item.id === id); if (bill) startEditBill(bill) }
  const activeExpenseDate = date

  const monthExpenses = getExpensesForMonth(monthlyBills, expenses, activeMonth, skippedKeys)
  const paidExpenseTotal = monthExpenses.filter((expense) => !expense.isGenerated).reduce((sum, expense) => sum + expense.amount, 0)
  const dueExpenseTotal = monthExpenses.filter((expense) => expense.isGenerated).reduce((sum, expense) => sum + expense.amount, 0)
  const forecastExpenseTotal = paidExpenseTotal + dueExpenseTotal
  const filteredExpenses = monthExpenses
    .filter((expense) => expense.title.toLowerCase().includes(search.toLowerCase()))
    .filter((expense) => filterTag === 'all' || expense.tagId === filterTag)
    .sort((a, b) => b.date.localeCompare(a.date))
  const confirmDeleteExpense = (id: string) => {
    const expense = expenses.find((item) => item.id === id)
    if (window.confirm(`Delete ${expense?.title ?? 'this expense'}?`)) deleteExpense(id)
  }

  const submitExpense = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const numericAmount = Number(amount)
    if (!title.trim()) return setFormMessage('Enter an expense description.')
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) return setFormMessage('Enter an amount greater than zero.')
    if (!activeExpenseDate) return setFormMessage('Choose the date of the expense.')
    if (!tagId) return setFormMessage('Choose a category.')

    if (!await addExpense({ title: title.trim(), amount: numericAmount, date: activeExpenseDate, tagId, account: account.trim() || undefined, note: note.trim() || undefined })) return
    setTitle('')
    setNote('')
    setAmount('')
    setFormMessage('Expense added.')
    setShowAddForm(false)
  }

  const submitMonthlyBill = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const dueDay = Number(billDueDay)

    const numericAmount = Number(billAmount)
    if (!billName.trim()) return setFormMessage('Enter a name for this recurring bill.')
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) return setFormMessage('Enter an amount greater than zero.')
    if (dueDay < 1 || dueDay > 31) return setFormMessage('Choose a valid due day.')
    if (billEndMonth && billEndMonth < activeMonth) return setFormMessage('The end month cannot be before the start month.')

    if (!await addMonthlyBill({
      name: billName.trim(),
      expectedAmount: numericAmount,
      dueDay,
      tagId: billTagId,
      startMonth: activeMonth,
      endMonth: billEndMonth || undefined,
    })) return
    setBillName('')
    setBillAmount('')
    setBillDueDay('1')
    setBillEndMonth('')
    setFormMessage('Recurring expense added.')
    setShowAddForm(false)
  }

  const startEditBill = (bill: (typeof monthlyBills)[number]) => {
    setEditingBillId(bill.id)
    setEditBillName(bill.name)
    setEditBillAmount(String(bill.expectedAmount))
    setEditBillDueDay(String(bill.dueDay))
    setEditBillEndMonth(bill.endMonth ?? '')
  }

  const saveBillEdit = async () => {
    const dueDay = Number(editBillDueDay)

    if (!editingBillId || !editBillName.trim() || Number(editBillAmount) <= 0 || dueDay < 1 || dueDay > 31) return

    if (!await updateMonthlyBill(editingBillId, {
      name: editBillName,
      expectedAmount: Number(editBillAmount),
      dueDay,
      endMonth: editBillEndMonth || undefined,
    })) return
    setEditingBillId(null)
  }

  return (
    <div key={activeMonth} className="month-change page-shell space-y-4 sm:space-y-6">
      <div className="hero-motion relative overflow-hidden rounded-[1.5rem] border border-white/70 bg-zinc-950 p-5 text-white shadow-[0_32px_90px_-45px_rgba(15,23,42,0.9)] sm:rounded-[2.25rem] sm:p-6 lg:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-red-400/25 blur-3xl" />
        <div className="pointer-events-none absolute right-32 top-20 h-32 w-32 rounded-full bg-amber-300/20 blur-2xl" />
        <div className="relative grid w-full gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div>
            <Badge className="bg-white/10 text-white ring-white/15">Expense control</Badge>
            <h1 className="page-title mt-2 max-w-3xl font-semibold">Expense cashflow</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-300">Paid expenses and upcoming obligations stay clearly separated for {formatMonthLabel(activeMonth)}.</p>
          </div>
          <div className="grid gap-3 min-[430px]:grid-cols-3 lg:w-[28rem]">
            <MetricCard label="Paid" value={formatCurrency(paidExpenseTotal)} tone="light" />
            <MetricCard label="Due" value={formatCurrency(dueExpenseTotal)} tone="red" />
            <MetricCard label="Forecast" value={formatCurrency(forecastExpenseTotal)} tone="amber" />
          </div>
        </div>
      </div>

      {!showAddForm && formMessage ? <p role="status" className="text-sm text-zinc-600">{formMessage}</p> : null}
      <AddModal open={showAddForm} onClose={() => setShowAddForm(false)} title="Add expense" busy={isSaving}>
      <div className="space-y-4">
        
        <p className="mt-1 text-sm text-zinc-500">Record a payment or set up an expense that repeats each month.</p>
        <label className="mt-4 grid gap-2 text-sm font-semibold">Expense type
          <Select value={expenseAction} onChange={(event) => { setExpenseAction(event.target.value as ExpenseAction); setFormMessage('') }}>
            <option value="one_off">One-time expense</option>
            <option value="setup_bill">Recurring expense</option>
          </Select>
        </label>
      </div>

      <div className="grid w-full gap-4">
        {expenseAction === 'one_off' ? (
          <div className="space-y-4">
                    <div className="relative">
            <form className="mt-4 grid gap-3" onSubmit={submitExpense}>
            <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-2 text-sm font-semibold">Account (optional)<Input value={account} onChange={event => setAccount(event.target.value)} placeholder="Cash, bank, or card" /></label><label className="grid gap-2 text-sm font-semibold">Notes (optional)<Input value={note} onChange={event => setNote(event.target.value)} /></label></div>
            <label className="text-sm font-semibold" htmlFor="expense-title">Description</label>
            <Input id="expense-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Lunch, fuel, medicine" required />
            <div className="grid gap-3 sm:grid-cols-3">
              <Input aria-label="Expense amount" type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Amount" required />
              <Input aria-label="Expense date" type="date" value={activeExpenseDate} onChange={(event) => setDate(event.target.value)} required />
              <Select aria-label="Expense category" value={tagId} onChange={(event) => setTagId(event.target.value)}>
                {expenseTags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
              </Select>
            </div>
              {formMessage ? <p className="text-sm font-medium text-zinc-600" role="status">{formMessage}</p> : null}
              <Button className="w-full sm:w-auto" type="submit" disabled={isSaving}><CirclePlus className="h-4 w-4" />Add expense</Button>
            </form>
          </div>
        </div>
        ) : null}

        {expenseAction === 'setup_bill' ? (
          <div className="space-y-4">
                    <div className="relative">
            <form className="mt-4 grid gap-3" onSubmit={submitMonthlyBill}>
            <label className="text-sm font-semibold" htmlFor="bill-name">Expense name</label>
            <Input id="bill-name" value={billName} onChange={(event) => setBillName(event.target.value)} placeholder="Electricity, internet, subscription" required />
            <div className="grid gap-3 sm:grid-cols-3">
              <Input aria-label="Recurring bill amount" type="number" min="0.01" step="0.01" value={billAmount} onChange={(event) => setBillAmount(event.target.value)} placeholder="Expected amount" required />
              <Select aria-label="Payment day of month" value={billDueDay} onChange={(event) => setBillDueDay(event.target.value)}>
                {dueDateDays.map((day) => <option key={day} value={day}>{day === '31' ? 'Last day of the month' : 'Day ' + day + ' of each month'}</option>)}
              </Select>
              <Select aria-label="Bill category" value={billTagId} onChange={(event) => setBillTagId(event.target.value)}>
                {expenseTags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
              </Select>
            </div>
            <p className="text-xs text-zinc-500">Dates that fall beyond a month’s length use its last day.</p>
            <label className="text-sm font-semibold" htmlFor="bill-end-month">End month <span className="font-normal text-zinc-500">(optional)</span></label>
            <Input id="bill-end-month" type="month" min={activeMonth} value={billEndMonth} onChange={(event) => setBillEndMonth(event.target.value)} />
              {formMessage ? <p className="text-sm font-medium text-zinc-600" role="status">{formMessage}</p> : null}
              <Button className="w-full sm:w-auto" type="submit" disabled={isSaving}><CirclePlus className="h-4 w-4" />Add recurring expense</Button>
            </form>
          </div>
        </div>
        ) : null}
      </div>

      </AddModal>

      <EditDrawer open={Boolean(editingBill)} onClose={() => setEditingBillId(null)} title={editingBill ? 'Edit ' + editingBill.name : 'Edit recurring expense'} description="Changes apply to the recurring schedule from the selected month.">
        {editingBill ? <div className="space-y-4"><div className="grid gap-2">
                      <Input aria-label="Expense name" value={editBillName} onChange={(event) => setEditBillName(event.target.value)} />
                       <Input aria-label="Bill amount" type="number" min="0.01" step="0.01" value={editBillAmount} onChange={(event) => setEditBillAmount(event.target.value)} />
                      <Select aria-label="Payment day" value={editBillDueDay} onChange={(event) => setEditBillDueDay(event.target.value)}>
                        <option value="">Due date day</option>
                        {dueDateDays.map((day) => <option key={day} value={day}>{day === '31' ? 'Last day of the month' : 'Day ' + day}</option>)}
                      </Select>
                      <p className="text-xs text-zinc-500">Dates that fall beyond a month’s length use its last day.</p>
                      <Input aria-label="End month (optional)" type="month" value={editBillEndMonth} onChange={(event) => setEditBillEndMonth(event.target.value)} />
                      <div className="flex gap-2">
                        <Button className="h-10 min-h-10 w-10 px-0" type="button" aria-label="Save bill" title="Save" onClick={saveBillEdit}><Check className="h-4 w-4" /></Button>
                        <Button className="h-10 min-h-10 w-10 px-0" type="button" variant="ghost" aria-label="Cancel editing" title="Cancel" onClick={() => setEditingBillId(null)}><X className="h-4 w-4" /></Button>
                      </div>
                    </div>
          <div className="flex flex-wrap gap-2 border-t border-zinc-200 pt-4">
            <Button type="button" variant="secondary" disabled={isSaving} onClick={async () => { if (await updateMonthlyBill(editingBill.id, { isActive: !editingBill.isActive })) setEditingBillId(null) }}>{editingBill.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{editingBill.isActive ? 'Pause schedule' : 'Resume schedule'}</Button>
            <Button type="button" variant="ghost" disabled={isSaving} onClick={async () => { if (window.confirm('Delete ' + editingBill.name + '? Existing recorded expenses will remain.') && await deleteMonthlyBill(editingBill.id)) setEditingBillId(null) }}><Trash2 className="h-4 w-4" />Delete schedule</Button>
          </div>
        </div> : null}
      </EditDrawer>

      <Card>
            <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold tracking-tight">Monthly expenses</h2><Button type="button" onClick={() => { setFormMessage(''); setShowAddForm(true) }}><CirclePlus className="h-4 w-4" />Add expense</Button></div>
            <p className="mt-1 text-sm text-zinc-500">Mark recurring bills paid when money leaves your account.</p>
        <div className="mt-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search expenses" />
              <Select value={filterTag} onChange={(event) => setFilterTag(event.target.value)}>
                <option value="all">All tags</option>
                {expenseTags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 rounded-2xl border border-zinc-200/80 bg-white/70 p-1 shadow-inner">
            {viewModes.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                className={cn(
                  'min-h-11 rounded-xl px-3 py-2 text-sm font-medium capitalize text-zinc-600 transition-[background-color,color,box-shadow] duration-300 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300',
                  viewMode === value && 'bg-zinc-950 text-white shadow-lg shadow-zinc-950/15 hover:text-white',
                )}
                type="button"
                aria-pressed={viewMode === value}
                onClick={() => setViewMode(value)}
              >
                <span className="flex items-center justify-center gap-2"><Icon className="h-4 w-4" /><span className="hidden sm:inline">{label}</span></span>
              </button>
            ))}
          </div>
        </div>

        </div>
        {monthlyBills.some(bill => !monthExpenses.some(expense => expense.billId === bill.id)) ? <details className="mt-4 rounded-2xl border border-zinc-200 p-3">
          <summary className="cursor-pointer text-sm text-zinc-600">Schedules without a payment this month</summary>
          <div className="mt-2 divide-y divide-zinc-100">{monthlyBills.filter(bill => !monthExpenses.some(expense => expense.billId === bill.id)).map(bill => <div key={bill.id} className="flex items-center justify-between gap-3 py-2"><div><p className="text-sm font-medium">{bill.name}</p><p className="text-xs text-zinc-500">{bill.isActive ? 'No payment due this month' : 'Paused'}</p></div><Button className="h-10 w-10 px-0" variant="ghost" aria-label={'Edit schedule for ' + bill.name} title="Edit schedule" onClick={() => startEditBill(bill)}><Pencil className="h-4 w-4" /></Button></div>)}</div>
        </details> : null}

        <div className="mt-5">
          {!filteredExpenses.length && monthExpenses.length ? (
            <EmptyState title="No matching expenses" description="Try a different search or category filter." action={<Button variant="secondary" onClick={() => { setSearch(''); setFilterTag('all') }}>Clear filters</Button>} />
          ) : null}
          {viewMode === 'list' && (filteredExpenses.length || !monthExpenses.length) ? <ExpenseList expenses={filteredExpenses} onDelete={confirmDeleteExpense} onEditSchedule={openSchedule} /> : null}
          {viewMode === 'grid' && (filteredExpenses.length || !monthExpenses.length) ? <ExpenseGrid expenses={filteredExpenses} onDelete={confirmDeleteExpense} onEditSchedule={openSchedule} /> : null}
          {viewMode === 'calendar' && (filteredExpenses.length || !monthExpenses.length) ? <ExpenseCalendar expenses={filteredExpenses} month={activeMonth} /> : null}
        </div>
      </Card>
    </div>
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

function ExpenseList({ expenses, onDelete, onEditSchedule }: { expenses: ReturnType<typeof useFinanceStore.getState>['expenses']; onDelete: (id: string) => void; onEditSchedule: (id: string) => void }) {
  const tags = useFinanceStore((state) => state.expenseTags)
  const updateExpense = useFinanceStore((state) => state.updateExpense)
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null)
  const [editExpenseTitle, setEditExpenseTitle] = useState('')
  const [editExpenseAmount, setEditExpenseAmount] = useState('')
  const [editExpenseDate, setEditExpenseDate] = useState('')
  const [editExpenseTagId, setEditExpenseTagId] = useState('')
  const editingExpense = expenses.find((expense) => expense.id === editingExpenseId)

  const startEditExpense = (expense: (typeof expenses)[number]) => {
    setEditingExpenseId(expense.id)
    setEditExpenseTitle(expense.title)
    setEditExpenseAmount(String(expense.amount))
    setEditExpenseDate(expense.date)
    setEditExpenseTagId(expense.tagId)
  }

  const saveExpenseEdit = async () => {
    if (!editingExpenseId || !editExpenseTitle.trim() || !Number(editExpenseAmount) || !editExpenseTagId) return

    if (!await updateExpense(editingExpenseId, {
      title: editExpenseTitle,
      amount: Number(editExpenseAmount),
      date: editExpenseDate,
      tagId: editExpenseTagId,
    })) return
    setEditingExpenseId(null)
  }

  return (
    <>
    <div className="overflow-x-auto rounded-2xl border border-zinc-200/70">
      {expenses.length ? <table className="w-full min-w-[720px] text-left text-sm" aria-label="Monthly expenses">
        <thead className="bg-zinc-50 text-zinc-500"><tr>{['Description', 'Date', 'Category', 'Status', 'Amount', 'Actions'].map(label => <th key={label} scope="col" className={cn('px-4 py-3 font-medium', (label === 'Amount' || label === 'Actions') && 'text-right')}>{label}</th>)}</tr></thead>
        <tbody className="divide-y divide-zinc-100 bg-white/60">{expenses.map(expense => {
          const tag = tags.find(item => item.id === expense.tagId)
          return <tr key={expense.id} className="hover:bg-white/90">
            <th scope="row" className="px-4 py-3 font-medium">{expense.title}</th>
            <td className="whitespace-nowrap px-4 py-3 text-zinc-500">{formatDate(expense.date)}</td>
            <td className="px-4 py-3"><Badge className={tag?.color}>{tag?.name ?? 'Uncategorized'}</Badge></td>
            <td className="px-4 py-3">{expense.isGenerated ? <Badge className="bg-amber-100 text-amber-800">{expense.date < formatLocalDate() ? 'Overdue' : 'Due'}</Badge> : <Badge className="bg-emerald-100 text-emerald-700">Paid</Badge>}</td>
            <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums">{formatCurrency(expense.amount)}</td>
            <td className="px-4 py-3"><div className="flex justify-end gap-1">              {expense.isGenerated ? <>{expense.billId ? <Button className="h-10 min-h-10 w-10 px-0" variant="ghost" aria-label={"Edit schedule for " + expense.title} title="Edit schedule" onClick={() => onEditSchedule(expense.billId!)}><Pencil className="h-4 w-4" /></Button> : null}<PaymentConfirmation record={expense} kind="expense" /></> : <Button className="h-10 min-h-10 w-10 px-0" variant="ghost" aria-label={`Edit ${expense.title}`} title="Edit" onClick={() => startEditExpense(expense)}><Pencil className="h-4 w-4" /></Button>}
              {expense.isGenerated ? null : <UndoPaymentConfirmation record={expense} kind="expense" />}
              {expense.isGenerated ? null : <Button className="h-10 min-h-10 w-10 px-0" variant="ghost" aria-label={`Delete ${expense.title}`} title="Delete" onClick={() => onDelete(expense.id)}><Trash2 className="h-4 w-4" /></Button>}
</div></td>
          </tr>
        })}</tbody>
      </table> : <EmptyState title="No expenses this month" description="Monthly bills will appear automatically after setup. One-time spending can be added manually." />}
    </div>
    <EditDrawer open={Boolean(editingExpense)} title="Edit expense" description="Update this transaction without crowding the monthly list." onClose={() => setEditingExpenseId(null)}>
      {editingExpense ? <div className="grid gap-4">
        <label className="grid gap-2 text-sm font-semibold">Description<Input value={editExpenseTitle} onChange={(event) => setEditExpenseTitle(event.target.value)} /></label>
        <label className="grid gap-2 text-sm font-semibold">Amount<Input type="number" min="0.01" step="0.01" value={editExpenseAmount} onChange={(event) => setEditExpenseAmount(event.target.value)} /></label>
        <label className="grid gap-2 text-sm font-semibold">Date paid<Input type="date" value={editExpenseDate} onChange={(event) => setEditExpenseDate(event.target.value)} required /></label>
        <label className="grid gap-2 text-sm font-semibold">Category<Select value={editExpenseTagId} onChange={(event) => setEditExpenseTagId(event.target.value)}>{tags.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></label>
        {editingExpense.billId ? <Button type="button" variant="secondary" onClick={() => { setEditingExpenseId(null); onEditSchedule(editingExpense.billId!) }}>Edit recurring schedule</Button> : null}
        <Button type="button" onClick={saveExpenseEdit}><Check className="h-4 w-4" />Save changes</Button>
      </div> : null}
    </EditDrawer>
    </>
  )
}

function ExpenseGrid({ expenses, onDelete, onEditSchedule }: { expenses: ReturnType<typeof useFinanceStore.getState>['expenses']; onDelete: (id: string) => void; onEditSchedule: (id: string) => void }) {
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
                {expense.isGenerated ? <Badge className="bg-amber-100 text-amber-800">{expense.date < formatLocalDate() ? 'Overdue' : 'Due'}</Badge> : <Badge className="bg-emerald-100 text-emerald-700">Paid</Badge>}
                <Badge className={tag?.color}>{tag?.name}</Badge>
              </div>
            </div>
            <p className="mt-4 text-xl font-semibold">{formatCurrency(expense.amount)}</p>
            {!expense.isGenerated ? <UndoPaymentConfirmation record={expense} kind="expense" /> : null}
            {expense.isGenerated ? <>{expense.billId ? <Button className="h-10 min-h-10 w-10 px-0" variant="ghost" aria-label={"Edit schedule for " + expense.title} title="Edit schedule" onClick={() => onEditSchedule(expense.billId!)}><Pencil className="h-4 w-4" /></Button> : null}<PaymentConfirmation record={expense} kind="expense" /></> : <Button className="mt-3 h-10 min-h-10 w-10 px-0" variant="ghost" aria-label={`Delete ${expense.title}`} title="Delete" onClick={() => onDelete(expense.id)}><Trash2 className="h-4 w-4" /></Button>}
          </div>
        )
      }) : (
        <div className="lg:col-span-3 sm:col-span-2">
          <EmptyState
            title="No expenses to show"
            description="Add a one-time expense or setup monthly bills to populate this view."
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
