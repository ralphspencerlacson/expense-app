import { BadgeCheck, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { EditDrawer } from './edit-drawer'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { formatCurrency, formatLocalDate } from '../lib/utils'
import { useFinanceStore } from '../store/finance-store'
import type { Expense, IncomeEntry } from '../types/finance'

export function PaymentConfirmation({ record, kind }: { record: Expense | IncomeEntry; kind: 'expense' | 'income' }) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState(String(record.amount))
  const [date, setDate] = useState(formatLocalDate())
  const [note, setNote] = useState(record.note ?? '')
  const [account, setAccount] = useState(record.account ?? '')
  const [message, setMessage] = useState('')
  const { isSaving, confirmPlannedExpense, confirmExpectedIncome, skipOccurrence } = useFinanceStore()
  const close = () => { if (!isSaving) setOpen(false) }
  const save = async () => {
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0 || !date) return setMessage('Enter a positive amount and payment date.')
    const details = { ...record, amount: Number(amount), date, note, account: account.trim() || undefined }
    const saved = kind === 'expense' ? await confirmPlannedExpense(details as Expense) : await confirmExpectedIncome(details as IncomeEntry)
    if (saved) setOpen(false)
    else setMessage('Could not save. Check the error message and retry. If already recorded elsewhere, refresh the page.')
  }
  return <>
    <Button className="h-10 min-h-10 w-10 shrink-0 px-0" aria-label={(kind === 'expense' ? 'Mark paid: ' : 'Mark received: ') + record.title} title={kind === 'expense' ? 'Mark paid' : 'Mark received'} disabled={isSaving} onClick={() => { setAmount(String(record.amount)); setDate(formatLocalDate()); setMessage(''); setOpen(true) }}><BadgeCheck className="h-4 w-4" aria-hidden="true" /></Button>
    <EditDrawer open={open} title={kind === 'expense' ? 'Confirm payment' : 'Confirm income received'} description={record.title + ' · Planned ' + formatCurrency(record.amount)} onClose={close}>
      <form className="grid gap-4" onSubmit={event => { event.preventDefault(); void save() }}>
        <label className="grid gap-2">Actual amount<Input type="number" min="0.01" step="0.01" required value={amount} onChange={event => setAmount(event.target.value)} /></label>
        <label className="grid gap-2">Actual payment date<Input type="date" required value={date} onChange={event => setDate(event.target.value)} /></label>
        <label className="grid gap-2">Account (optional)<Input placeholder="Cash, bank, or card" value={account} onChange={event => setAccount(event.target.value)} /></label>
        <label className="grid gap-2">Notes (optional)<Input value={note} onChange={event => setNote(event.target.value)} /></label>
        {message ? <p role="alert" className="text-sm text-red-700">{message}</p> : null}
        <Button type="submit" disabled={isSaving}>{isSaving ? 'Saving…' : 'Confirm and save'}</Button>
        <Button type="button" variant="ghost" disabled={isSaving} onClick={async () => { if (await skipOccurrence(record.occurrenceKey ?? record.id)) setOpen(false) }}>Skip this occurrence</Button>
      </form>
    </EditDrawer>
  </>
}

export function UndoPaymentConfirmation({ record, kind }: { record: Expense | IncomeEntry; kind: 'expense' | 'income' }) {
  const { isSaving, markExpenseUnpaid, markIncomeUnreceived } = useFinanceStore()
  const linked = record.occurrenceKey || (kind === 'expense' ? (record as Expense).billId : (record as IncomeEntry).sourceId)
  if (!linked || record.isGenerated) return null
  const label = kind === 'expense' ? 'Mark unpaid' : 'Mark not received'
  return <Button className="h-10 min-h-10 w-10 shrink-0 px-0" type="button" variant="ghost" disabled={isSaving} aria-label={label + ': ' + record.title} title={label} onClick={() => {
    if (kind === 'expense') void markExpenseUnpaid(record as Expense)
    else void markIncomeUnreceived(record as IncomeEntry)
  }}><RotateCcw className="h-4 w-4" aria-hidden="true" /></Button>
}
