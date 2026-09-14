import type { Expense, IncomeEntry, SavingsSnapshot } from '../types/finance'

export function getYearlyCashflow(entries: IncomeEntry[], expenses: Expense[], year: string): SavingsSnapshot[] {
  const monthly = new Map(getMonthlyCashflow(entries, expenses).map(row => [row.month, row]))
  return Array.from({ length: 12 }, (_, index) => {
    const month = `${year}-${String(index + 1).padStart(2, '0')}`
    return monthly.get(month) ?? { id: month, month, income: 0, expenses: 0, savings: 0 }
  })
}

export function getMonthlyCashflow(entries: IncomeEntry[], expenses: Expense[]): SavingsSnapshot[] {
  const months = new Map<string, SavingsSnapshot>()
  const add = (date: string, amount: number, kind: 'income' | 'expenses') => {
    const month = date.slice(0, 7)
    const row = months.get(month) ?? { id: month, month, income: 0, expenses: 0, savings: 0 }
    row[kind] += amount
    row.savings = row.income - row.expenses
    months.set(month, row)
  }
  entries.filter(row => !row.isGenerated).forEach(row => add(row.date, row.amount, 'income'))
  expenses.filter(row => !row.isGenerated).forEach(row => add(row.date, row.amount, 'expenses'))
  return [...months.values()].sort((a,b) => a.month.localeCompare(b.month))
}
