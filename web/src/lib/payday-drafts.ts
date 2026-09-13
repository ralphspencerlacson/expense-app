import type { IncomePaymentSchedule } from '../types/finance'

export type PaydayDraft = {
  id: string
  position: number
  amount: string
  day: string
  original?: IncomePaymentSchedule
}

export function newPayday(position: number): PaydayDraft {
  return { id: crypto.randomUUID(), position, amount: '', day: String(Math.min(position * 7, 28)) }
}

export function validPaydays(paydays: PaydayDraft[]) {
  return paydays.length > 0 && paydays.every(payment => Number.isFinite(Number(payment.amount)) && Number(payment.amount) > 0 && Number.isInteger(Number(payment.day)) && Number(payment.day) >= 1 && Number(payment.day) <= 31)
}

