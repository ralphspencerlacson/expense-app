import type { Expense, ExpenseTag, IncomeEntry, IncomeSource, MonthlyBill, SavingsSnapshot } from '../types/finance'

export const expenseTags: ExpenseTag[] = [
  { id: 'tag-bills', name: 'Bills', group: 'bills', color: 'bg-red-100 text-red-700' },
  { id: 'tag-grocery', name: 'Grocery', group: 'grocery', color: 'bg-emerald-100 text-emerald-700' },
  { id: 'tag-leisure', name: 'Leisure', group: 'leisure', color: 'bg-violet-100 text-violet-700' },
  { id: 'tag-transport', name: 'Transport', group: 'transport', color: 'bg-sky-100 text-sky-700' },
  { id: 'tag-food', name: 'Food', group: 'food', color: 'bg-amber-100 text-amber-700' },
  { id: 'tag-family', name: 'Family', group: 'other', color: 'bg-pink-100 text-pink-700' },
  { id: 'tag-health', name: 'Health', group: 'other', color: 'bg-lime-100 text-lime-700' },
  { id: 'tag-property', name: 'Property', group: 'other', color: 'bg-indigo-100 text-indigo-700' },
  { id: 'tag-other', name: 'Other', group: 'other', color: 'bg-zinc-100 text-zinc-700' },
]

export const incomeSources: IncomeSource[] = [
]

export const incomeEntries: IncomeEntry[] = []

export const expenses: Expense[] = []

export const monthlyBills: MonthlyBill[] = [
]

export const savingsSnapshots: SavingsSnapshot[] = [
]
