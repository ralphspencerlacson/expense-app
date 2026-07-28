import type { Expense, IncomeEntry, IncomeSource, MonthlyBill } from '../types/finance'

export function getIncomeEntriesForMonth(sources: IncomeSource[], entries: IncomeEntry[], month: string) {
  const currentEntries = entries.filter((entry) => entry.date.startsWith(month))
  const generatedEntries = sources.flatMap<IncomeEntry>((source) => {
    if (!source.isActive || source.mode !== 'recurring' || !isMonthInRange(month, source.startMonth, source.endMonth)) {
      return []
    }

    if (source.schedule === 'cutoff') {
      return [
        createCutoffIncome(source, month, 'first'),
        createCutoffIncome(source, month, 'second'),
      ].filter((entry) => entry !== undefined)
    }

    if (source.schedule === 'monthly' && source.expectedAmount) {
      const day = clampDay(month, source.monthlyDay ?? 15)
      return [
        {
          id: `auto-income-${source.id}-${month}`,
          sourceId: source.id,
          title: source.name,
          amount: source.expectedAmount,
          date: `${month}-${String(day).padStart(2, '0')}`,
          kind: 'source' as const,
          isGenerated: true,
        },
      ]
    }

    return []
  })

  return mergeGeneratedIncome(currentEntries, generatedEntries).sort((a, b) => b.date.localeCompare(a.date))
}

export function getExpensesForMonth(bills: MonthlyBill[], expenses: Expense[], month: string) {
  const currentExpenses = expenses.filter((expense) => expense.date.startsWith(month))
  const generatedExpenses = bills
    .filter((bill) => bill.isActive && isMonthInRange(month, bill.startMonth, bill.endMonth))
    .map((bill) => {
      const day = clampDay(month, bill.dueDay)

      return {
        id: `auto-expense-${bill.id}-${month}`,
        title: bill.name,
        amount: bill.expectedAmount,
        date: `${month}-${String(day).padStart(2, '0')}`,
        tagId: bill.tagId,
        billId: bill.id,
        cutoff: bill.cutoff,
        isGenerated: true,
        note: bill.note,
      } satisfies Expense
    })

  return mergeGeneratedExpenses(currentExpenses, generatedExpenses).sort((a, b) => b.date.localeCompare(a.date))
}

export function isMonthInRange(month: string, startMonth?: string, endMonth?: string) {
  if (startMonth && month < startMonth) {
    return false
  }

  if (endMonth && month > endMonth) {
    return false
  }

  return true
}

function createCutoffIncome(source: IncomeSource, month: string, cutoff: 'first' | 'second'): IncomeEntry | undefined {
  const amount = cutoff === 'first' ? source.firstCutoffAmount : source.secondCutoffAmount
  const day = cutoff === 'first' ? source.firstCutoffDay : source.secondCutoffDay

  if (!amount) {
    return undefined
  }

  const safeDay = clampDay(month, day ?? (cutoff === 'first' ? 15 : 30))

  return {
    id: `auto-income-${source.id}-${cutoff}-${month}`,
    sourceId: source.id,
    title: `${source.name} - ${cutoff} cutoff`,
    amount,
    date: `${month}-${String(safeDay).padStart(2, '0')}`,
    kind: 'source',
    cutoff,
    isGenerated: true,
  } satisfies IncomeEntry
}

function mergeGeneratedIncome(entries: IncomeEntry[], generatedEntries: IncomeEntry[]) {
  return [
    ...entries,
    ...generatedEntries.filter(
      (generated) =>
        !entries.some(
          (entry) =>
            entry.sourceId === generated.sourceId &&
            entry.cutoff === generated.cutoff &&
            entry.date.slice(0, 7) === generated.date.slice(0, 7),
        ),
    ),
  ]
}

function mergeGeneratedExpenses(expenses: Expense[], generatedExpenses: Expense[]) {
  return [
    ...expenses,
    ...generatedExpenses.filter(
      (generated) =>
        !expenses.some(
          (expense) => expense.billId === generated.billId && expense.date.slice(0, 7) === generated.date.slice(0, 7),
        ),
    ),
  ]
}

function clampDay(month: string, day: number) {
  const [year, monthNumber] = month.split('-').map(Number)
  const daysInMonth = new Date(year, monthNumber, 0).getDate()

  return Math.min(Math.max(day, 1), daysInMonth)
}
