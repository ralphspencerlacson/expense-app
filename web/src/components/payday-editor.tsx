import { Plus, Trash2 } from 'lucide-react'
import { useRef } from 'react'
import { formatPaydayLabel } from '../lib/recurring'
import { newPayday, type PaydayDraft } from '../lib/payday-drafts'
import { Button } from './ui/button'
import { Input } from './ui/input'

export function PaydayEditor({ payments, onChange, month, disabled = false, nextPosition = 1 }: { payments: PaydayDraft[]; onChange: (payments: PaydayDraft[]) => void; month: string; disabled?: boolean; nextPosition?: number }) {
  const highestPosition = useRef(0)
  const [year, monthNumber] = month.split('-').map(Number)
  const lastDay = new Date(year, monthNumber, 0).getDate()
  const update = (id: string, change: Partial<PaydayDraft>) => onChange(payments.map(payment => payment.id === id ? { ...payment, ...change } : payment))
  return <div className="grid gap-3">
    {payments.map(payment => <fieldset key={payment.id} disabled={disabled} className="min-w-0 rounded-2xl border border-zinc-200 p-4">
      <legend className="px-2 text-sm font-semibold">{formatPaydayLabel(payment.position)}</legend>
      <div className="grid min-w-0 gap-3 sm:grid-cols-2">
      <label className="grid min-w-0 gap-2 text-sm">Amount<Input type="number" min="0.01" step="0.01" required value={payment.amount} onChange={event => update(payment.id, { amount: event.target.value })} /></label>
      <label className="grid min-w-0 gap-2 text-sm">Payment date<Input className="min-w-0" type="date" min={month + '-01'} max={month + '-' + lastDay} required value={payment.day ? month + '-' + String(Math.min(Number(payment.day), lastDay)).padStart(2, '0') : ''} onChange={event => update(payment.id, { day: event.target.value ? String(Number(event.target.value.slice(-2))) : '' })} /></label>
      </div>
      <div className="mt-2 flex items-center justify-between gap-3">
      <p className="text-xs text-zinc-500">{payment.day ? 'Repeats on day ' + payment.day + ' each month; uses the last day in shorter months.' : 'Choose a payment date.'}</p>
      <Button className="h-10 w-10 self-end px-0" variant="ghost" type="button" disabled={disabled || payments.length === 1} aria-label={'Remove ' + formatPaydayLabel(payment.position)} title="Remove payment" onClick={() => {
        highestPosition.current = Math.max(highestPosition.current, ...payments.map(item => item.position))
        onChange(payments.filter(item => item.id !== payment.id))
      }}><Trash2 className="h-4 w-4" /></Button>
      </div>
    </fieldset>)}
    <Button type="button" variant="secondary" disabled={disabled} onClick={() => {
      const position = Math.max(nextPosition - 1, highestPosition.current, ...payments.map(payment => payment.position)) + 1
      highestPosition.current = position
      onChange([...payments, newPayday(position)])
    }}><Plus className="h-4 w-4" />Add payment</Button>
  </div>
}
