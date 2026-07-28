import { useState, type FormEvent } from 'react'
import { EmptyState } from '../components/empty-state'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Select } from '../components/ui/select'
import { getIncomeEntriesForMonth } from '../lib/recurring'
import { defaultDateForMonth, formatCurrency, formatDate, formatMonthLabel } from '../lib/utils'
import { useFinanceStore } from '../store/finance-store'
import type { IncomeCutoff, IncomeSchedule, IncomeSource, IncomeSourceType } from '../types/finance'

type IncomeAction = 'record_salary' | 'one_time' | 'source_setup'

export function IncomePage() {
  const { incomeSources, incomeEntries, addIncomeSource, updateIncomeSource, deleteIncomeSource, addIncomeEntry, updateIncomeEntry, deleteIncomeEntry, selectedMonth } = useFinanceStore()
  const salarySource = incomeSources.find((source) => source.type === 'salary' && source.schedule === 'cutoff')
  const activeMonth = selectedMonth
  const monthIncomeEntries = getIncomeEntriesForMonth(incomeSources, incomeEntries, activeMonth)
  const [incomeAction, setIncomeAction] = useState<IncomeAction>('one_time')
  const [sourceName, setSourceName] = useState('')
  const [sourceType, setSourceType] = useState<IncomeSourceType>('salary')
  const [schedule, setSchedule] = useState<IncomeSchedule>('monthly')
  const [expectedAmount, setExpectedAmount] = useState('')
  const [firstCutoffAmount, setFirstCutoffAmount] = useState('')
  const [secondCutoffAmount, setSecondCutoffAmount] = useState('')
  const [oneTimeTitle, setOneTimeTitle] = useState('')
  const [oneTimeAmount, setOneTimeAmount] = useState('')
  const [oneTimeCategory, setOneTimeCategory] = useState<IncomeSourceType>('other')
  const [oneTimeDate, setOneTimeDate] = useState(() => defaultDateForMonth(activeMonth))
  const [manualSourceId, setManualSourceId] = useState<string | undefined>()
  const [formMessage, setFormMessage] = useState('')
  const [editingIncomeId, setEditingIncomeId] = useState<string | null>(null)
  const [editIncomeTitle, setEditIncomeTitle] = useState('')
  const [editIncomeAmount, setEditIncomeAmount] = useState('')
  const [editIncomeCategory, setEditIncomeCategory] = useState<IncomeSourceType>('other')
  const [editIncomeDate, setEditIncomeDate] = useState('')
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null)
  const [editSourceName, setEditSourceName] = useState('')
  const [editExpectedAmount, setEditExpectedAmount] = useState('')
  const [editFirstCutoffAmount, setEditFirstCutoffAmount] = useState('')
  const [editSecondCutoffAmount, setEditSecondCutoffAmount] = useState('')
  const activeIncomeDate = oneTimeDate.startsWith(activeMonth) ? oneTimeDate : defaultDateForMonth(activeMonth)

  const submitSource = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const monthlyValue = Number(expectedAmount)
    const firstValue = Number(firstCutoffAmount)
    const secondValue = Number(secondCutoffAmount)
    if (!sourceName.trim()) return setFormMessage('Enter a name for this income source.')
    if (schedule === 'monthly' && monthlyValue <= 0) return setFormMessage('Enter a monthly amount greater than zero.')
    if (schedule === 'cutoff' && firstValue <= 0 && secondValue <= 0) return setFormMessage('Enter at least one cutoff amount greater than zero.')

    addIncomeSource({
      name: sourceName.trim(),
      type: sourceType,
      mode: schedule === 'irregular' ? 'manual' : 'recurring',
      schedule,
      expectedAmount: schedule === 'monthly' ? monthlyValue : undefined,
      monthlyDay: schedule === 'monthly' ? 15 : undefined,
      firstCutoffAmount: schedule === 'cutoff' ? firstValue || undefined : undefined,
      firstCutoffDay: schedule === 'cutoff' ? 15 : undefined,
      secondCutoffAmount: schedule === 'cutoff' ? secondValue || undefined : undefined,
      secondCutoffDay: schedule === 'cutoff' ? 30 : undefined,
      startMonth: activeMonth,
    })
    setSourceName('')
    setExpectedAmount('')
    setFirstCutoffAmount('')
    setSecondCutoffAmount('')
    setFormMessage('Income source added.')
  }

  const submitOneTime = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const amount = Number(oneTimeAmount)
    if (!oneTimeTitle.trim()) return setFormMessage('Enter an income description.')
    if (!Number.isFinite(amount) || amount <= 0) return setFormMessage('Enter an amount greater than zero.')
    if (!activeIncomeDate) return setFormMessage('Choose the date income was received.')

    addIncomeEntry({ sourceId: manualSourceId, title: oneTimeTitle.trim(), amount, date: activeIncomeDate, kind: manualSourceId ? 'source' : 'one_time', category: oneTimeCategory })
    setOneTimeTitle('')
    setOneTimeAmount('')
    setOneTimeCategory('other')
    setManualSourceId(undefined)
    setFormMessage('Income added.')
  }

  const startEditIncome = (entry: (typeof monthIncomeEntries)[number]) => {
    setEditingIncomeId(entry.id)
    setEditIncomeTitle(entry.title)
    setEditIncomeAmount(String(entry.amount))
    setEditIncomeCategory(entry.category ?? 'other')
    setEditIncomeDate(entry.date)
  }

  const saveIncomeEdit = () => {
    if (!editingIncomeId || !editIncomeTitle.trim() || Number(editIncomeAmount) <= 0 || !editIncomeDate) return

    updateIncomeEntry(editingIncomeId, {
      title: editIncomeTitle,
      amount: Number(editIncomeAmount),
      category: editIncomeCategory,
      date: editIncomeDate,
    })
    setEditingIncomeId(null)
  }

  const startEditSource = (source: IncomeSource) => {
    setEditingSourceId(source.id)
    setEditSourceName(source.name)
    setEditExpectedAmount(String(source.expectedAmount ?? ''))
    setEditFirstCutoffAmount(String(source.firstCutoffAmount ?? ''))
    setEditSecondCutoffAmount(String(source.secondCutoffAmount ?? ''))
  }

  const saveSourceEdit = (source: IncomeSource) => {
    if (!editingSourceId || !editSourceName.trim()) return

    updateIncomeSource(editingSourceId, {
      name: editSourceName,
      expectedAmount: source.schedule === 'monthly' ? Number(editExpectedAmount) || undefined : source.expectedAmount,
      firstCutoffAmount: source.schedule === 'cutoff' ? Number(editFirstCutoffAmount) || undefined : source.firstCutoffAmount,
      secondCutoffAmount: source.schedule === 'cutoff' ? Number(editSecondCutoffAmount) || undefined : source.secondCutoffAmount,
    })
    setEditingSourceId(null)
  }

  const recordManualIncome = (source: IncomeSource) => {
    setManualSourceId(source.id)
    setOneTimeTitle(source.name)
    setOneTimeCategory(source.type)
    setOneTimeAmount('')
    setIncomeAction('one_time')
    setFormMessage(`Enter the amount received from ${source.name}.`)
  }

  return (
    <div className="page-shell space-y-4 sm:space-y-6">
      <div>
        <Badge className="bg-emerald-100 text-emerald-700">Income setup</Badge>
        <h1 className="page-title mt-3 font-semibold">Income</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">Income for {formatMonthLabel(activeMonth)}. Recurring sources are included automatically.</p>
      </div>

      {salarySource ? <SalaryDeductionPanel source={salarySource} /> : null}

      <Card>
        <h2 className="font-semibold">What are you adding?</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <ActionChoice
            active={incomeAction === 'record_salary'}
            description="Review your twice-monthly salary setup."
            label="Cutoff salary"
            onClick={() => setIncomeAction('record_salary')}
          />
          <ActionChoice
            active={incomeAction === 'one_time'}
            description="Salary received, sale, side project, bonus."
            label="Add income"
            onClick={() => setIncomeAction('one_time')}
          />
          <ActionChoice
            active={incomeAction === 'source_setup'}
            description="Salary, allowance, or regular freelance work."
            label="Set up recurring income"
            onClick={() => setIncomeAction('source_setup')}
          />
        </div>
      </Card>

      {incomeAction === 'record_salary' && salarySource ? (
        <Card className="animate-soft-scale">
          <h2 className="font-semibold">Salary is auto-added monthly</h2>
          <p className="mt-1 text-sm text-zinc-500">Recurring cutoff salary is generated for the month automatically. No manual recording needed.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <RecordSalaryCard cutoff="first" source={salarySource} />
            <RecordSalaryCard cutoff="second" source={salarySource} />
          </div>
        </Card>
      ) : null}
      {incomeAction === 'record_salary' && !salarySource ? (
        <EmptyState title="No cutoff salary configured" description="Set up a salary paid twice a month before reviewing cutoff details." action={<Button onClick={() => setIncomeAction('source_setup')}>Set up salary</Button>} />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {incomeAction === 'source_setup' ? (
          <Card className="relative animate-soft-scale overflow-hidden lg:col-span-2">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-200/60 blur-3xl" />
          <div className="relative">
            <h2 className="font-semibold">Set up recurring income</h2>
            <p className="mt-1 text-sm text-zinc-500">Use this for another salary source, allowance, freelance income, business income, or bonus setup.</p>
            <form className="mt-4 grid gap-3" onSubmit={submitSource}>
            <label className="text-sm font-semibold" htmlFor="source-name">Source name</label>
            <Input id="source-name" value={sourceName} onChange={(event) => setSourceName(event.target.value)} placeholder="Salary" required />
            <div className="grid gap-3 sm:grid-cols-2">
              <Select aria-label="Income type" value={sourceType} onChange={(event) => setSourceType(event.target.value as IncomeSourceType)}>
                <option value="salary">Salary</option>
                <option value="allowance">Allowance</option>
                <option value="business">Business</option>
                <option value="freelance">Freelance</option>
                <option value="bonus">Bonus</option>
                <option value="other">Other</option>
              </Select>
              <Select aria-label="Payment schedule" value={schedule} onChange={(event) => setSchedule(event.target.value as IncomeSchedule)}>
                <option value="monthly">Monthly</option>
                <option value="cutoff">Per cutoff</option>
                <option value="irregular">Irregular/manual</option>
              </Select>
            </div>
            {schedule === 'monthly' ? (
              <Input type="number" min="0.01" step="0.01" value={expectedAmount} onChange={(event) => setExpectedAmount(event.target.value)} placeholder="Monthly expected amount" />
            ) : null}
            {schedule === 'cutoff' ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Input type="number" min="0.01" step="0.01" value={firstCutoffAmount} onChange={(event) => setFirstCutoffAmount(event.target.value)} placeholder="1st cutoff amount" />
                <Input type="number" min="0.01" step="0.01" value={secondCutoffAmount} onChange={(event) => setSecondCutoffAmount(event.target.value)} placeholder="2nd cutoff amount" />
              </div>
            ) : null}
              {formMessage ? <p className="text-sm font-medium text-zinc-600" role="status">{formMessage}</p> : null}
              <Button className="w-full sm:w-auto" type="submit">Add recurring source</Button>
            </form>
          </div>
        </Card>
        ) : null}

        {incomeAction === 'one_time' ? (
          <Card className="relative animate-soft-scale overflow-hidden lg:col-span-2">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-sky-200/70 blur-3xl" />
          <div className="relative">
            <h2 className="font-semibold">{manualSourceId ? 'Record income from source' : 'Add income'}</h2>
            <p className="mt-1 text-sm text-zinc-500">Record the amount and date the money was received.</p>
            <form className="mt-4 grid gap-3" onSubmit={submitOneTime}>
            <label className="text-sm font-semibold" htmlFor="income-title">Description</label>
            <Input id="income-title" value={oneTimeTitle} onChange={(event) => setOneTimeTitle(event.target.value)} placeholder="Salary, sold used phone, project payment" required />
            <div className="grid gap-3 sm:grid-cols-3">
              <Input aria-label="Income amount" type="number" min="0.01" step="0.01" value={oneTimeAmount} onChange={(event) => setOneTimeAmount(event.target.value)} placeholder="Amount" required />
              <Select aria-label="Income category" value={oneTimeCategory} onChange={(event) => setOneTimeCategory(event.target.value as IncomeSourceType)}>
                <option value="bonus">Bonus</option>
                <option value="business">Business</option>
                <option value="freelance">Freelance</option>
                <option value="allowance">Allowance</option>
                <option value="other">Other</option>
              </Select>
              <Input aria-label="Date received" type="date" min={`${activeMonth}-01`} max={`${activeMonth}-31`} value={activeIncomeDate} onChange={(event) => setOneTimeDate(event.target.value)} required />
            </div>
              {formMessage ? <p className="text-sm font-medium text-zinc-600" role="status">{formMessage}</p> : null}
              <Button className="w-full sm:w-auto" type="submit">Add income</Button>
            </form>
          </div>
        </Card>
        ) : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <h2 className="font-semibold">Sources</h2>
          <div className="mt-4 space-y-3">
            {incomeSources.length ? incomeSources.map((source) => (
              <div key={source.id} className="interactive-lift group flex flex-col gap-3 rounded-3xl border border-zinc-100 bg-white/70 p-4 transition-[transform,border-color,background-color,box-shadow] hover:border-emerald-200 hover:bg-emerald-50/60 hover:shadow-lg hover:shadow-emerald-900/5">
                {editingSourceId === source.id ? (
                  <div className="grid w-full gap-3 xl:grid-cols-[minmax(10rem,1fr)_10rem_10rem_auto]">
                    <Input value={editSourceName} onChange={(event) => setEditSourceName(event.target.value)} />
                    {source.schedule === 'monthly' ? (
                      <Input type="number" min="0.01" step="0.01" value={editExpectedAmount} onChange={(event) => setEditExpectedAmount(event.target.value)} placeholder="Monthly amount" />
                    ) : null}
                    {source.schedule === 'cutoff' ? (
                      <>
                        <Input type="number" min="0.01" step="0.01" value={editFirstCutoffAmount} onChange={(event) => setEditFirstCutoffAmount(event.target.value)} placeholder="1st amount" />
                        <Input type="number" min="0.01" step="0.01" value={editSecondCutoffAmount} onChange={(event) => setEditSecondCutoffAmount(event.target.value)} placeholder="2nd amount" />
                      </>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" onClick={() => saveSourceEdit(source)}>Save</Button>
                      <Button type="button" variant="ghost" onClick={() => setEditingSourceId(null)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <p className="font-semibold">{source.name}</p>
                      <p className="text-sm text-zinc-500">{getSourceDescription(source)}{source.isActive ? '' : ' · paused'}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" onClick={() => startEditSource(source)}>Edit source</Button>
                      {source.mode === 'manual' ? <Button variant="secondary" onClick={() => recordManualIncome(source)}>Record income</Button> : null}
                      <Button variant="ghost" onClick={() => updateIncomeSource(source.id, { isActive: !source.isActive })}>{source.isActive ? 'Pause' : 'Resume'}</Button>
                      <Button variant="ghost" onClick={() => window.confirm(`Delete ${source.name}? Existing recorded income will remain.`) && deleteIncomeSource(source.id)}>Delete</Button>
                    </div>
                  </>
                )}
              </div>
            )) : (
              <EmptyState
                title="No income sources yet"
                description="Add your salary, allowance, freelance, business, or bonus income source to start generating monthly income."
                action={<Button type="button" onClick={() => setIncomeAction('source_setup')}>Setup income source</Button>}
              />
            )}
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold">Income history</h2>
          <div className="mt-4 space-y-3">
            {monthIncomeEntries.length ? monthIncomeEntries.map((entry) => (
              <div key={entry.id} className="flex flex-col gap-3 rounded-3xl border border-zinc-100 bg-white/70 p-4 transition-colors hover:bg-emerald-50/50 sm:flex-row sm:items-center sm:justify-between xl:flex-col xl:items-stretch 2xl:flex-row 2xl:items-center">
                {editingIncomeId === entry.id ? (
                  <div className="grid w-full gap-3 xl:grid-cols-[minmax(10rem,1fr)_9rem_9rem_10rem_auto]">
                    <Input value={editIncomeTitle} onChange={(event) => setEditIncomeTitle(event.target.value)} />
                    <Input aria-label="Income amount" type="number" min="0.01" step="0.01" value={editIncomeAmount} onChange={(event) => setEditIncomeAmount(event.target.value)} />
                    <Select value={editIncomeCategory} onChange={(event) => setEditIncomeCategory(event.target.value as IncomeSourceType)}>
                      <option value="bonus">Bonus</option>
                      <option value="business">Business</option>
                      <option value="freelance">Freelance</option>
                      <option value="allowance">Allowance</option>
                      <option value="other">Other</option>
                    </Select>
                    <Input aria-label="Income date" type="date" value={editIncomeDate} onChange={(event) => setEditIncomeDate(event.target.value)} required />
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" onClick={saveIncomeEdit}>Save</Button>
                      <Button type="button" variant="ghost" onClick={() => setEditingIncomeId(null)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <p className="font-semibold">{entry.title}</p>
                      <p className="text-sm text-zinc-500">{formatDate(entry.date)}{entry.category ? ` · ${entry.category}` : ''}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      <Badge className="bg-emerald-100 text-emerald-700">{formatCurrency(entry.amount)}</Badge>
                      {entry.isGenerated ? <Badge className="bg-zinc-100 text-zinc-700">Auto</Badge> : <Button variant="ghost" onClick={() => startEditIncome(entry)}>Edit</Button>}
                      {entry.isGenerated ? null : <Button variant="ghost" onClick={() => window.confirm(`Delete ${entry.title}?`) && deleteIncomeEntry(entry.id)}>Delete</Button>}
                    </div>
                  </>
                )}
              </div>
            )) : (
              <EmptyState
                title="No income entries this month"
                description="Recurring income will appear automatically after you setup a salary or monthly source. One-time income can be added manually."
                action={<Button type="button" variant="secondary" onClick={() => setIncomeAction('one_time')}>Add one-time income</Button>}
              />
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

function ActionChoice({
  active,
  description,
  label,
  onClick,
}: {
  active: boolean
  description: string
  label: string
  onClick: () => void
}) {
  return (
    <button
      className={`rounded-3xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-zinc-300 ${
        active
          ? 'border-zinc-950 bg-zinc-950 text-white shadow-xl shadow-zinc-950/15'
          : 'border-zinc-100 bg-white/70 text-zinc-950 hover:border-zinc-300 hover:bg-white'
      }`}
      type="button"
      aria-pressed={active}
      onClick={onClick}
    >
      <p className="font-semibold">{label}</p>
      <p className={`mt-1 text-sm ${active ? 'text-zinc-300' : 'text-zinc-500'}`}>{description}</p>
    </button>
  )
}

function RecordSalaryCard({ cutoff, source }: { cutoff: IncomeCutoff; source: IncomeSource }) {
  const net = cutoff === 'first' ? source.firstCutoffAmount ?? 0 : source.secondCutoffAmount ?? 0
  const gross = cutoff === 'first' ? source.firstCutoffGrossAmount ?? net : source.secondCutoffGrossAmount ?? net
  const deductions = cutoff === 'first' ? source.firstCutoffDeductions ?? [] : source.secondCutoffDeductions ?? []
  const totalDeductions = deductions.reduce((sum, deduction) => sum + deduction.amount, 0)

  return (
    <div className="rounded-3xl border border-zinc-100 bg-white/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold capitalize">{cutoff} cutoff</p>
          <p className="mt-1 text-sm text-zinc-500">Gross {formatCurrency(gross)}</p>
        </div>
        <Badge className="bg-emerald-100 text-emerald-700">Net {formatCurrency(net)}</Badge>
      </div>
      <div className="mt-4 rounded-2xl bg-zinc-50 p-3 text-sm">
        <div className="flex justify-between">
          <span className="text-zinc-500">Deductions</span>
          <span className="font-semibold">{formatCurrency(totalDeductions)} · {formatPercent(totalDeductions, gross)}</span>
        </div>
      </div>
      <div className="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm font-medium text-emerald-700">Auto-added every month</div>
    </div>
  )
}

function getSourceDescription(source: IncomeSource) {
  if (source.schedule === 'cutoff') {
    return `per cutoff · gross ${formatCurrency(source.firstCutoffGrossAmount ?? 0)} each · net 1st ${formatCurrency(source.firstCutoffAmount ?? 0)} · net 2nd ${formatCurrency(source.secondCutoffAmount ?? 0)}`
  }

  if (source.schedule === 'monthly') {
    return `monthly · ${formatCurrency(source.expectedAmount ?? 0)}`
  }

  return 'irregular/manual'
}

function SalaryDeductionPanel({ source }: { source: IncomeSource }) {
  return (
    <Card className="relative overflow-hidden bg-zinc-950 text-white">
      <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-400/25 blur-3xl" />
      <div className="relative">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <Badge className="bg-white/10 text-white ring-white/15">Cutoff salary</Badge>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">{source.name}</h2>
            <p className="mt-1 text-sm text-zinc-300">Each configured payment is included automatically in monthly cash flow.</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/10 p-4 text-right">
              <p className="text-xs font-medium text-zinc-300">Monthly income</p>
              <p className="mt-1 text-2xl font-semibold">{formatCurrency((source.firstCutoffAmount ?? 0) + (source.secondCutoffAmount ?? 0))}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <CutoffDeductionCard cutoff="first" source={source} />
          <CutoffDeductionCard cutoff="second" source={source} />
        </div>
      </div>
    </Card>
  )
}

function CutoffDeductionCard({ cutoff, source }: { cutoff: IncomeCutoff; source: IncomeSource }) {
  const gross = cutoff === 'first' ? source.firstCutoffGrossAmount ?? 0 : source.secondCutoffGrossAmount ?? 0
  const net = cutoff === 'first' ? source.firstCutoffAmount ?? 0 : source.secondCutoffAmount ?? 0
  const deductions = cutoff === 'first' ? source.firstCutoffDeductions ?? [] : source.secondCutoffDeductions ?? []
  const totalDeductions = deductions.reduce((sum, deduction) => sum + deduction.amount, 0)
  const contributions = deductions.filter((deduction) => deduction.group === 'contribution')
  const tax = deductions.filter((deduction) => deduction.group === 'tax')

  return (
    <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold capitalize">{cutoff} cutoff</p>
          <p className="mt-1 text-xs text-zinc-300">Gross {formatCurrency(gross)}</p>
        </div>
        <Badge className="bg-emerald-400/15 text-emerald-200 ring-emerald-300/20">Net {formatCurrency(net)}</Badge>
      </div>

      <div className="mt-4 space-y-2">
        {contributions.length ? <DeductionGroup title="Government contributions" deductions={contributions} gross={gross} /> : null}
        {tax.length ? <DeductionGroup title="Tax" deductions={tax} gross={gross} /> : null}
      </div>

      <div className="mt-4 rounded-2xl bg-white/10 p-3">
        <div className="flex justify-between text-sm">
          <span className="text-zinc-300">Total deductions</span>
          <span className="font-semibold">{formatCurrency(totalDeductions)} · {formatPercent(totalDeductions, gross)}</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-red-400 to-amber-300" style={{ width: formatPercent(totalDeductions, gross) }} />
        </div>
      </div>
    </div>
  )
}

function DeductionGroup({
  title,
  deductions,
  gross,
}: {
  title: string
  deductions: NonNullable<IncomeSource['firstCutoffDeductions']>
  gross: number
}) {
  const total = deductions.reduce((sum, deduction) => sum + deduction.amount, 0)

  return (
    <div className="rounded-2xl bg-white/10 p-3">
      <div className="mb-2 flex justify-between text-xs font-semibold uppercase tracking-wide text-zinc-300">
        <span>{title}</span>
        <span>{formatCurrency(total)} · {formatPercent(total, gross)}</span>
      </div>
      <div className="space-y-2">
        {deductions.map((deduction) => (
          <div key={deduction.id} className="flex items-center justify-between gap-3 text-sm">
            <span className="text-zinc-300">{deduction.label}</span>
            <span className="font-medium">{formatCurrency(deduction.amount)} · {formatPercent(deduction.amount, gross)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function formatPercent(amount: number, base: number) {
  if (!base) {
    return '0%'
  }

  return `${((amount / base) * 100).toFixed(2)}%`
}
