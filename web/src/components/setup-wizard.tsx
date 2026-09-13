import { PaydayEditor } from './payday-editor'
import { newPayday, validPaydays, type PaydayDraft } from '../lib/payday-drafts'
import { useState, type FormEvent, type ReactNode } from 'react'
import { ArrowLeft, ArrowRight, Check, WalletCards } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Select } from './ui/select'
import { formatCurrency, formatMonthLabel } from '../lib/utils'
import { useFinanceStore } from '../store/finance-store'
import type { NewIncomeSource } from '../types/finance'

type BillDraft = {
  name: string
  amount: number
  dueDay: number
}

export function SetupWizard({ onDone }: { onDone: () => void }) {
  const { saveSetup, completeSetup, isSaving, expenseTags, selectedMonth } = useFinanceStore()
  const [step, setStep] = useState(0)
  const [incomeName, setIncomeName] = useState('')
  const [paydays, setPaydays] = useState<PaydayDraft[]>(() => [newPayday(1)])
  const [billName, setBillName] = useState('')
  const [billAmount, setBillAmount] = useState('')
  const [billDueDay, setBillDueDay] = useState('1')
  const [bills, setBills] = useState<BillDraft[]>([])
  const [error, setError] = useState('')

  const incomeTotal = paydays.reduce((sum, payment) => sum + Number(payment.amount), 0)
  const billTotal = bills.reduce((sum, bill) => sum + bill.amount, 0)

  const continueFromIncome = (event: FormEvent) => {
    event.preventDefault()
    if (incomeName.trim() && (!Number.isFinite(incomeTotal) || incomeTotal <= 0 || !validPaydays(paydays))) {
      setError('Enter an amount greater than zero, or skip income setup for now.')
      return
    }
    setError('')
    setStep(2)
  }

  const addBillDraft = () => {
    const amount = Number(billAmount)
    if (!billName.trim() || amount <= 0) {
      setError('Enter a bill name and an amount greater than zero.')
      return
    }
    setBills((current) => [...current, { name: billName.trim(), amount, dueDay: Number(billDueDay) }])
    setBillName('')
    setBillAmount('')
    setBillDueDay('1')
    setError('')
  }

  const finish = async () => {
    const source: NewIncomeSource | null = incomeName.trim() && incomeTotal > 0 ? {
      name: incomeName.trim(), type: 'salary', mode: 'recurring', schedule: 'cutoff',
      payments: paydays.map(payment => ({ position: payment.position, amount: Number(payment.amount), paymentDay: Number(payment.day) })), startMonth: selectedMonth,
    } : null
    if (!await saveSetup(source, bills.map(bill => ({ name: bill.name, expectedAmount: bill.amount, dueDay: bill.dueDay, tagId: expenseTags[0].id, startMonth: selectedMonth })))) setError('Could not save setup. Your details are preserved; try again.')
    else onDone()
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-zinc-950/70 p-3 backdrop-blur-md sm:p-8" role="dialog" aria-modal="true" aria-labelledby="setup-title">
      <div className="mx-auto flex min-h-full max-w-3xl items-center justify-center">
        <div className="w-full overflow-hidden rounded-[1.5rem] bg-white shadow-2xl sm:rounded-[2rem]">
          <div className="border-b border-zinc-100 px-4 py-4 sm:px-8 sm:py-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-950 text-white"><WalletCards className="h-5 w-5" /></span>
                <div>
                  <p className="font-semibold">Set up your workspace</p>
                  <p className="text-sm text-zinc-500">Step {step + 1} of 4</p>
                </div>
              </div>
              <div className="flex gap-1" aria-label="Setup progress">
                {[0, 1, 2, 3].map((item) => <span key={item} className={`h-2 w-5 rounded-full transition-colors sm:w-8 ${item <= step ? 'bg-zinc-950' : 'bg-zinc-200'}`} />)}
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-8">
            {step === 0 ? (
              <div className="animate-soft-scale py-8 text-center">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">A clearer monthly picture</p>
                <h1 id="setup-title" className="page-title mx-auto mt-4 max-w-xl font-semibold">Start tracking your money.</h1>
                <p className="mx-auto mt-4 max-w-xl leading-7 text-zinc-500">Add income and recurring bills now, then confirm each expected payment when money enters or leaves your account.</p>
                <Button className="mt-8" disabled={isSaving} onClick={async () => { if (await completeSetup()) onDone() }}>Skip setup and record transactions</Button><Button className="mt-3" onClick={() => setStep(1)}>Get started <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </div>
            ) : null}

            {step === 1 ? (
              <form className="animate-soft-scale" onSubmit={continueFromIncome}>
                <h1 id="setup-title" className="text-2xl font-semibold">Add your main income</h1>
                <p className="mt-2 text-sm text-zinc-500">This will appear as expected income from {formatMonthLabel(selectedMonth)} onward.</p>
                <div className="mt-6 grid gap-4">
                  <Field label="Income source" htmlFor="setup-income-name"><Input id="setup-income-name" value={incomeName} onChange={(event) => setIncomeName(event.target.value)} placeholder="Salary, freelance retainer, allowance" /></Field>
                  <p className="text-sm text-zinc-500">Recurring income · add one or more payments that repeat each month.</p>
                  <PaydayEditor month={selectedMonth} payments={paydays} onChange={setPaydays} disabled={isSaving} />
                </div>
                {error ? <p className="mt-4 text-sm font-medium text-red-600" role="alert">{error}</p> : null}
                <WizardActions onBack={() => setStep(0)} skipLabel="Skip for now" onSkip={() => { setIncomeName(''); setStep(2) }} />
              </form>
            ) : null}

            {step === 2 ? (
              <div className="animate-soft-scale">
                <h1 id="setup-title" className="text-2xl font-semibold">Add recurring bills</h1>
                <p className="mt-2 text-sm text-zinc-500">Add as many as you need. You can edit or pause them later.</p>
                {bills.length ? <div className="mt-5 space-y-2">{bills.map((bill, index) => <div key={`${bill.name}-${index}`} className="flex items-center justify-between rounded-2xl bg-zinc-50 px-4 py-3"><span className="font-medium">{bill.name} <span className="text-sm text-zinc-500">· day {bill.dueDay}</span></span><span className="font-semibold">{formatCurrency(bill.amount)}</span></div>)}</div> : null}
                <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_10rem_8rem_auto] sm:items-end">
                  <Field label="Bill name" htmlFor="setup-bill-name"><Input id="setup-bill-name" value={billName} onChange={(event) => setBillName(event.target.value)} placeholder="Internet" /></Field>
                  <Field label="Amount" htmlFor="setup-bill-amount"><Input id="setup-bill-amount" type="number" min="0.01" step="0.01" value={billAmount} onChange={(event) => setBillAmount(event.target.value)} /></Field>
                  <Field label="Due day" htmlFor="setup-bill-day"><Select id="setup-bill-day" value={billDueDay} onChange={(event) => setBillDueDay(event.target.value)}>{Array.from({ length: 31 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}</Select></Field>
                  <Button type="button" variant="secondary" onClick={addBillDraft}>Add</Button>
                </div>
                {error ? <p className="mt-4 text-sm font-medium text-red-600" role="alert">{error}</p> : null}
                <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                  <Button type="button" variant="ghost" onClick={() => setStep(1)}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
                  <Button type="button" onClick={() => { setError(''); setStep(3) }}>{bills.length ? 'Review setup' : 'Skip for now'}<ArrowRight className="ml-2 h-4 w-4" /></Button>
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="animate-soft-scale">
                <h1 id="setup-title" className="text-2xl font-semibold">Your starting monthly picture</h1>
                <p className="mt-2 text-sm text-zinc-500">You can change any of these details later.</p>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <ReviewMetric label="Expected income" value={incomeTotal} tone="income" />
                  <ReviewMetric label="Recurring bills" value={billTotal} tone="expense" />
                  <ReviewMetric label="After bills" value={incomeTotal - billTotal} tone="balance" />
                </div>
                <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                  <Button variant="ghost" onClick={() => setStep(2)}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
                  {error ? <p role="alert" className="text-red-600">{error}</p> : null}<Button onClick={finish} disabled={isSaving}><Check className="mr-2 h-4 w-4" />Open my dashboard</Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ children, htmlFor, label }: { children: ReactNode; htmlFor: string; label: string }) {
  return <div><label className="mb-1.5 block text-sm font-semibold text-zinc-700" htmlFor={htmlFor}>{label}</label>{children}</div>
}

function WizardActions({ onBack, onSkip, skipLabel }: { onBack: () => void; onSkip: () => void; skipLabel: string }) {
  return <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between"><Button className="w-full sm:w-auto" type="button" variant="ghost" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button><div className="grid grid-cols-2 gap-2 sm:flex"><Button type="button" variant="ghost" onClick={onSkip}>{skipLabel}</Button><Button type="submit">Continue<ArrowRight className="ml-2 h-4 w-4" /></Button></div></div>
}

function ReviewMetric({ label, tone, value }: { label: string; tone: 'income' | 'expense' | 'balance'; value: number }) {
  const styles = tone === 'income' ? 'bg-emerald-50 text-emerald-900' : tone === 'expense' ? 'bg-red-50 text-red-900' : 'bg-zinc-950 text-white'
  return <div className={`rounded-3xl p-5 ${styles}`}><p className="text-sm opacity-70">{label}</p><p className="mt-2 text-2xl font-semibold">{formatCurrency(value)}</p></div>
}
