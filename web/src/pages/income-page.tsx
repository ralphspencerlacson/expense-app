import { PaydayEditor } from '../components/payday-editor'
import { newPayday, validPaydays, type PaydayDraft } from '../lib/payday-drafts'
import { PaymentConfirmation, UndoPaymentConfirmation } from '../components/payment-confirmation'
import { useState, type FormEvent } from 'react'
import { Check, CirclePlus, Pause, Pencil, Play, Trash2 } from 'lucide-react'
import { EditDrawer } from '../components/edit-drawer'
import { EmptyState } from '../components/empty-state'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Select } from '../components/ui/select'
import { formatPaydayLabel, getIncomeEntriesForMonth } from '../lib/recurring'
import { defaultDateForMonth, formatCurrency, formatDate, formatMonthLabel } from '../lib/utils'
import { useFinanceStore } from '../store/finance-store'
import type { IncomeEntry, IncomePaymentSchedule, IncomeSchedule, IncomeSource, IncomeSourceType } from '../types/finance'

export function IncomePage() {
  const skippedKeys = useFinanceStore(state => state.skippedOccurrenceKeys)
  const { incomeSources, incomeEntries, addIncomeSource, updateIncomeSource, deleteIncomeSource, addIncomeEntry, updateIncomeEntry, deleteIncomeEntry, selectedMonth } = useFinanceStore()
  const isSaving = useFinanceStore(state => state.isSaving)
  const activeMonth = selectedMonth
  const monthIncomeEntries = getIncomeEntriesForMonth(incomeSources, incomeEntries, activeMonth, skippedKeys)
  const ungroupedEntries = monthIncomeEntries.filter(entry => !incomeSources.some(source => source.id === entry.sourceId))
  const expectedIncomeEntries = monthIncomeEntries.filter((entry) => entry.isGenerated)
  const receivedIncomeEntries = monthIncomeEntries.filter((entry) => !entry.isGenerated)
  const expectedIncome = expectedIncomeEntries.reduce((sum, entry) => sum + entry.amount, 0)
  const receivedIncome = receivedIncomeEntries.reduce((sum, entry) => sum + entry.amount, 0)
  const [sourceName, setSourceName] = useState('')
  const [sourceType, setSourceType] = useState<IncomeSourceType>('salary')
  const [schedule, setSchedule] = useState<IncomeSchedule>('irregular')
  const [paydays, setPaydays] = useState<PaydayDraft[]>(() => [newPayday(1)])
  const [editPaydays, setEditPaydays] = useState<PaydayDraft[]>([])
  const [oneTimeTitle, setOneTimeTitle] = useState('')
  const [oneTimeAmount, setOneTimeAmount] = useState('')
  const [oneTimeCategory, setOneTimeCategory] = useState<IncomeSourceType>('other')
  const [oneTimeDate, setOneTimeDate] = useState(() => defaultDateForMonth(activeMonth))
  const [manualSourceId, setManualSourceId] = useState<string | undefined>()
  const [account, setAccount] = useState('')
  const [note, setNote] = useState('')
  const [formMessage, setFormMessage] = useState('')
  const [editingIncomeId, setEditingIncomeId] = useState<string | null>(null)
  const [editIncomeTitle, setEditIncomeTitle] = useState('')
  const [editIncomeAmount, setEditIncomeAmount] = useState('')
  const [editIncomeCategory, setEditIncomeCategory] = useState<IncomeSourceType>('other')
  const [editIncomeDate, setEditIncomeDate] = useState('')
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null)
  const [editSourceName, setEditSourceName] = useState('')
  const activeIncomeDate = oneTimeDate
  const editingSource = incomeSources.find((source) => source.id === editingSourceId)
  const editingIncome = receivedIncomeEntries.find((entry) => entry.id === editingIncomeId)

  const submitSource = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!sourceName.trim()) return setFormMessage('Enter a name for this income source.')
    if (schedule === 'cutoff' && !validPaydays(paydays)) return setFormMessage('Enter a positive amount and a payment day from 1 to 31 for every payment.')

    if (!await addIncomeSource({
      name: sourceName.trim(),
      type: sourceType,
      mode: schedule === 'irregular' ? 'manual' : 'recurring',
      schedule,
      payments: paydays.map(payment => ({ position: payment.position, amount: Number(payment.amount), grossAmount: Number(payment.amount), paymentDay: Number(payment.day) })),
      startMonth: activeMonth,
    })) return
    setSourceName('')
    setPaydays([newPayday(1)])
    setFormMessage('Income source added.')
  }

  const submitOneTime = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const amount = Number(oneTimeAmount)
    if (!oneTimeTitle.trim()) return setFormMessage('Enter an income description.')
    if (!Number.isFinite(amount) || amount <= 0) return setFormMessage('Enter an amount greater than zero.')
    if (!activeIncomeDate) return setFormMessage('Choose the date income was received.')

    if (!await addIncomeEntry({ sourceId: manualSourceId, title: oneTimeTitle.trim(), amount, date: activeIncomeDate, kind: manualSourceId ? 'source' : 'one_time', category: oneTimeCategory, account: account.trim() || undefined, note: note.trim() || undefined })) return
    setOneTimeTitle('')
    setNote('')
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

  const saveIncomeEdit = async () => {
    if (!editingIncomeId || !editIncomeTitle.trim() || Number(editIncomeAmount) <= 0 || !editIncomeDate) return

    if (!await updateIncomeEntry(editingIncomeId, {
      title: editIncomeTitle,
      amount: Number(editIncomeAmount),
      category: editIncomeCategory,
      date: editIncomeDate,
    })) return
    setEditingIncomeId(null)
  }

  const startEditSource = (source: IncomeSource) => {
    setEditingSourceId(source.id)
    setEditSourceName(source.name)
    setEditPaydays(source.payments.map(payment => ({ id: payment.id, position: payment.position, amount: String(payment.amount), day: String(payment.paymentDay), original: payment })))
  }

  const saveSourceEdit = async (source: IncomeSource) => {
    if (!editingSourceId || !editSourceName.trim()) return

    if (source.mode === 'recurring' && !validPaydays(editPaydays)) return
    if (!await updateIncomeSource(editingSourceId, {
      name: editSourceName,
      payments: source.mode === 'recurring' ? editPaydays.map(payment => ({ ...payment.original, id: payment.id, position: payment.position, amount: Number(payment.amount), paymentDay: Number(payment.day) })) : source.payments,
    })) return
    setEditingSourceId(null)
  }

  const recordManualIncome = (source: IncomeSource) => {
    setManualSourceId(source.id)
    setOneTimeTitle(source.name)
    setOneTimeCategory(source.type)
    setOneTimeAmount('')
    setSchedule('irregular')
    setFormMessage(`Enter the amount received from ${source.name}.`)
  }

  const submitIncome = async (event: FormEvent<HTMLFormElement>) => {
    if (schedule === 'irregular') submitOneTime(event)
    else submitSource(event)
  }

  return (
    <div key={activeMonth} className="month-change page-shell space-y-4 sm:space-y-6">
      <div className="hero-motion relative overflow-hidden rounded-[2rem] border border-white/70 bg-emerald-950 p-5 text-white shadow-2xl shadow-emerald-950/20 sm:p-7">
        <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-emerald-300/20 blur-3xl" />
        <div className="relative grid w-full gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div>
            <Badge className="bg-white/10 text-emerald-100 ring-white/15">{formatMonthLabel(activeMonth)}</Badge>
            <h1 className="page-title mt-2 font-semibold">Income cashflow</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-emerald-100/70">Expected income stays separate until you confirm that the money was received.</p>
          </div>
          <div className="grid gap-3 min-[430px]:grid-cols-3 lg:w-[32rem]">
            <IncomeMetric label="Received" value={receivedIncome} />
            <IncomeMetric label="Expected" value={expectedIncome} muted />
            <IncomeMetric label="Forecast" value={receivedIncome + expectedIncome} />
          </div>
        </div>
      </div>

      <Card className="relative animate-soft-scale overflow-hidden">
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-200/60 blur-3xl" />
        <form className="relative grid gap-4" onSubmit={submitIncome}>
          {schedule === 'irregular' ? <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-2 text-sm font-semibold">Account (optional)<Input value={account} onChange={event => setAccount(event.target.value)} placeholder="Cash, bank, or card" /></label><label className="grid gap-2 text-sm font-semibold">Notes (optional)<Input value={note} onChange={event => setNote(event.target.value)} /></label></div> : null}
          <div><h2 className="font-semibold">Income details</h2><p className="mt-1 text-sm text-zinc-500">Use one-time income or set up one or more payments that repeat each month.</p></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold">Income type<Select value={schedule} onChange={(event) => { setSchedule(event.target.value as IncomeSchedule); setManualSourceId(undefined); setFormMessage('') }}><option value="irregular">One-time income</option><option value="cutoff">Recurring income</option></Select></label>
            <label className="grid gap-2 text-sm font-semibold">Category<Select value={schedule === 'irregular' ? oneTimeCategory : sourceType} onChange={(event) => schedule === 'irregular' ? setOneTimeCategory(event.target.value as IncomeSourceType) : setSourceType(event.target.value as IncomeSourceType)}><option value="salary">Salary</option><option value="allowance">Allowance</option><option value="business">Business</option><option value="freelance">Freelance</option><option value="bonus">Bonus</option><option value="other">Other</option></Select></label>
          </div>
          <label className="grid gap-2 text-sm font-semibold">{schedule === 'irregular' ? 'Description' : 'Source name'}<Input value={schedule === 'irregular' ? oneTimeTitle : sourceName} onChange={(event) => schedule === 'irregular' ? setOneTimeTitle(event.target.value) : setSourceName(event.target.value)} placeholder={schedule === 'irregular' ? 'Project payment, sale, bonus' : 'Salary, allowance, retainer'} required /></label>
          {schedule === 'irregular' ? <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-2 text-sm font-semibold">Amount<Input type="number" min="0.01" step="0.01" value={oneTimeAmount} onChange={(event) => setOneTimeAmount(event.target.value)} required /></label><label className="grid gap-2 text-sm font-semibold">Date received<Input type="date" value={activeIncomeDate} onChange={(event) => setOneTimeDate(event.target.value)} required /></label></div> : null}
          {schedule === 'cutoff' ? <PaydayEditor month={selectedMonth} payments={paydays} onChange={setPaydays} disabled={isSaving} /> : null}
          {formMessage ? <p className="text-sm font-medium text-zinc-600" role="status">{formMessage}</p> : null}
          <Button className="w-full" type="submit" disabled={isSaving}><CirclePlus className="h-4 w-4" />{schedule === 'irregular' ? 'Record income' : 'Create income schedule'}</Button>
        </form>
      </Card>

      <Card>
        <h2 className="font-semibold">Monthly income</h2>
        <p className="mt-1 text-sm text-zinc-500">Each payment appears once. Confirm it when the money arrives.</p>
        <div className="mt-4 space-y-4">
          {incomeSources.map(source => {
            const entries = monthIncomeEntries.filter(entry => entry.sourceId === source.id).sort((a, b) => paymentPosition(a) - paymentPosition(b) || a.date.localeCompare(b.date))
            return <section key={source.id} className="overflow-hidden rounded-2xl border border-zinc-200/70 bg-white/70" aria-label={source.name}>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 p-4">
                <div><h3 className="font-semibold">{source.name}</h3><p className="text-sm text-zinc-500">{getSourceDescription(source)}{source.isActive ? '' : ' · paused'}</p></div>
                  <div className="flex gap-1">
                    <Button className="h-10 min-h-10 w-10 px-0" variant="secondary" aria-label={`Edit ${source.name}`} title="Edit source" onClick={() => startEditSource(source)}><Pencil className="h-4 w-4" /></Button>
                    <Button className="h-10 min-h-10 w-10 px-0" variant="ghost" aria-label={`${source.isActive ? 'Pause' : 'Resume'} ${source.name}`} title={source.isActive ? 'Pause' : 'Resume'} onClick={() => updateIncomeSource(source.id, { isActive: !source.isActive })}>{source.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</Button>
                    <Button className="h-10 min-h-10 w-10 px-0" variant="ghost" aria-label={`Delete ${source.name}`} title="Delete" onClick={() => window.confirm(`Delete ${source.name}? Existing recorded income will remain.`) && deleteIncomeSource(source.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              <div className="divide-y divide-zinc-100">{entries.map(entry => <IncomePaymentRow key={entry.occurrenceKey ?? entry.id} entry={entry} source={source} isSaving={isSaving} onEdit={startEditIncome} onDelete={deleteIncomeEntry} />)}</div>
              {!entries.length ? <p className="px-4 py-3 text-sm text-zinc-500">No payments for this month.</p> : null}
              {source.payments.length ? <div className="p-3"><IncomeDeductionDetails source={source} /></div> : null}
              {source.mode === 'manual' ? <div className="p-3"><Button variant="secondary" onClick={() => recordManualIncome(source)}>Record income</Button></div> : null}
            </section>
          })}
          {ungroupedEntries.length ? <section className="overflow-hidden rounded-2xl border border-zinc-200/70 bg-white/70" aria-label="Other income">
            <h3 className="border-b border-zinc-100 p-4 font-semibold">Other income</h3>
            <div className="divide-y divide-zinc-100">{ungroupedEntries.map(entry => <IncomePaymentRow key={entry.id} entry={entry} isSaving={isSaving} onEdit={startEditIncome} onDelete={deleteIncomeEntry} />)}</div>
          </section> : null}
          {!incomeSources.length && !ungroupedEntries.length ? <EmptyState title="No income yet" description="Record income or create a recurring schedule using the form above." /> : null}
        </div>
      </Card>
      <EditDrawer open={Boolean(editingSource)} title="Edit income source" description="Update the source and each payment on its own row." onClose={() => setEditingSourceId(null)}>
        {editingSource ? <div className="grid gap-5">
          <label className="grid gap-2 text-sm font-semibold">Source name<Input value={editSourceName} onChange={(event) => setEditSourceName(event.target.value)} /></label>
          {editingSource.mode === 'recurring' ? <PaydayEditor month={selectedMonth} key={editingSource.id} nextPosition={Math.max(0, ...editingSource.payments.map(payment => payment.position), ...(editingSource.history ?? []).flatMap(version => version.value.payments.map(payment => payment.position))) + 1} payments={editPaydays} onChange={setEditPaydays} disabled={isSaving} /> : null}
          <Button type="button" onClick={() => saveSourceEdit(editingSource)}><Check className="h-4 w-4" />Save changes</Button>
        </div> : null}
      </EditDrawer>
      <EditDrawer open={Boolean(editingIncome)} title="Edit received income" description="Changes apply only to this transaction." onClose={() => setEditingIncomeId(null)}>
        {editingIncome ? <div className="grid gap-4">
          <label className="grid gap-2 text-sm font-semibold">Description<Input value={editIncomeTitle} onChange={(event) => setEditIncomeTitle(event.target.value)} /></label>
          <label className="grid gap-2 text-sm font-semibold">Amount<Input type="number" min="0.01" step="0.01" value={editIncomeAmount} onChange={(event) => setEditIncomeAmount(event.target.value)} /></label>
          <label className="grid gap-2 text-sm font-semibold">Category<Select value={editIncomeCategory} onChange={(event) => setEditIncomeCategory(event.target.value as IncomeSourceType)}><option value="bonus">Bonus</option><option value="business">Business</option><option value="freelance">Freelance</option><option value="allowance">Allowance</option><option value="other">Other</option></Select></label>
          <label className="grid gap-2 text-sm font-semibold">Date received<Input type="date" value={editIncomeDate} onChange={(event) => setEditIncomeDate(event.target.value)} required /></label>
          <Button type="button" onClick={saveIncomeEdit}><Check className="h-4 w-4" />Save changes</Button>
        </div> : null}
      </EditDrawer>
    </div>
  )
}

function IncomeMetric({ label, value, muted = false }: { label: string; value: number; muted?: boolean }) {
  return (
    <div className={`rounded-3xl border p-4 backdrop-blur ${muted ? 'border-amber-200/20 bg-amber-200/10' : 'border-white/10 bg-white/10'}`}>
      <p className="text-xs font-medium text-emerald-100/70">{label}</p>
      <p className="mt-2 text-xl font-semibold tracking-tight">{formatCurrency(value)}</p>
    </div>
  )
}

function paymentPosition(entry: IncomeEntry) {
  const occurrence = entry.occurrenceKey ?? entry.id
  const extraPosition = occurrence.match(/-payment-([0-9]+)-[0-9]{4}-[0-9]{2}$/)?.[1]
  return extraPosition ? Number(extraPosition) : entry.cutoff === 'first' ? 1 : entry.cutoff === 'second' ? 2 : 0
}

function IncomePaymentRow({ entry, source, isSaving, onEdit, onDelete }: { entry: IncomeEntry; source?: IncomeSource; isSaving: boolean; onEdit: (entry: IncomeEntry) => void; onDelete: (id: string) => Promise<boolean> }) {
  const occurrence = entry.occurrenceKey ?? (entry.isGenerated ? entry.id : '')
  const extraPosition = occurrence.match(/-payment-([0-9]+)-[0-9]{4}-[0-9]{2}$/)?.[1]
  const title = source && occurrence
    ? extraPosition ? formatPaydayLabel(Number(extraPosition)) : entry.cutoff ? formatPaydayLabel(entry.cutoff === 'first' ? 1 : 2) : source.schedule === 'monthly' ? 'Monthly payment' : entry.title
    : entry.title
  return <div className={'grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center ' + (entry.isGenerated ? 'bg-amber-50/50' : '')}>
    <div className="min-w-0"><p className="font-medium">{title}</p><p className="mt-1 text-sm text-zinc-500">{formatDate(entry.date)}</p></div>
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm font-semibold tabular-nums">{formatCurrency(entry.amount)}</span>
      <Badge className={entry.isGenerated ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700'}>{entry.isGenerated ? 'Expected' : 'Received'}</Badge>
      <div className="flex shrink-0 items-center gap-1">
        {entry.isGenerated ? <PaymentConfirmation record={entry} kind="income" /> : <>
          <UndoPaymentConfirmation record={entry} kind="income" />
          <Button className="h-10 min-h-10 w-10 px-0" disabled={isSaving} variant="ghost" aria-label={'Edit ' + entry.title} title="Edit payment" onClick={() => onEdit(entry)}><Pencil className="h-4 w-4" /></Button>
          <Button className="h-10 min-h-10 w-10 px-0" disabled={isSaving} variant="ghost" aria-label={'Delete ' + entry.title} title="Delete payment" onClick={() => { if (window.confirm('Delete ' + entry.title + '?')) void onDelete(entry.id) }}><Trash2 className="h-4 w-4" /></Button>
        </>}
      </div>
    </div>
  </div>
}

function getSourceDescription(source: IncomeSource) {
  if (source.schedule === 'cutoff') {
    return `${source.payments.length} scheduled payments per month`
  }

  if (source.schedule === 'monthly') {
    return 'Paid monthly'
  }

  return 'irregular/manual'
}

function IncomeDeductionDetails({ source }: { source: IncomeSource }) {
  return (
    <details className="rounded-2xl border border-zinc-100 bg-white/60 px-3 py-2.5">
      <summary className="cursor-pointer text-sm font-medium text-zinc-600">Schedule and deductions</summary>
      <div className="mt-3 space-y-3">
        {source.payments.map(payment => <PaydayDeductionDetails key={payment.id} payment={payment} monthly={source.schedule === 'monthly'} />)}
      </div>
    </details>
  )
}

function PaydayDeductionDetails({ payment, monthly }: { payment: IncomePaymentSchedule; monthly: boolean }) {
  const gross = payment.grossAmount ?? payment.amount
  const deductions = payment.deductions ?? []
  const totalDeductions = deductions.reduce((sum, deduction) => sum + deduction.amount, 0)
  const label = monthly ? 'Monthly payment' : formatPaydayLabel(payment.position)

  return (
    <div className="rounded-xl bg-zinc-50 p-3">
      <p className="text-sm font-semibold">{label} · day {payment.paymentDay}</p>
      <dl className="mt-2 grid grid-cols-2 gap-3 text-sm">
        <div><dt className="text-xs text-zinc-500">Gross</dt><dd className="mt-1 font-medium">{formatCurrency(gross)}</dd></div>
        <div><dt className="text-xs text-zinc-500">Deductions</dt><dd className="mt-1 font-medium">{totalDeductions ? formatCurrency(totalDeductions) + ' · ' + formatPercent(totalDeductions, gross) : 'None'}</dd></div>
      </dl>
      {deductions.length ? <ul className="mt-2 space-y-1 text-xs text-zinc-500">{deductions.map(deduction => <li key={deduction.id}>{deduction.label} · {formatCurrency(deduction.amount)}</li>)}</ul> : null}
    </div>
  )
}

function formatPercent(amount: number, base: number) {
  if (!base) {
    return '0%'
  }

  return `${((amount / base) * 100).toFixed(2)}%`
}
