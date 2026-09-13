import type { Expense, IncomeEntry, IncomeSource, MonthlyBill } from '../types/finance'

export function getIncomeEntriesForMonth(sources: IncomeSource[], entries: IncomeEntry[], month: string, skippedKeys: string[] = []) {
  const currentEntries = entries.filter((entry) => entry.date.startsWith(month) && !(entry.isGenerated && skippedKeys.includes(entry.occurrenceKey ?? entry.id)))
  const generatedEntries = sources.flatMap<IncomeEntry>((current) => {
    const source = current.history?.find(version => month < version.until)?.value ?? current
    if (!source.isActive || source.mode !== 'recurring' || !isMonthInRange(month, source.startMonth, source.endMonth)) {
      return []
    }

    if (source.schedule === 'cutoff') {
      return source.payments.map((payment) => createScheduledIncome(source, payment.position, payment.amount, payment.paymentDay, month))
    }

    const payment = source.payments[0]
    if (source.schedule === 'monthly' && payment) {
      const day = clampDay(month, payment.paymentDay)
      return [
        {
          id: `auto-income-${source.id}-${month}`,
          sourceId: source.id,
          title: source.name,
          amount: payment.amount,
          date: `${month}-${String(day).padStart(2, '0')}`,
          kind: 'source' as const,
          isGenerated: true,
        },
        ...source.payments.slice(1).map(payment => createScheduledIncome(source, payment.position, payment.amount, payment.paymentDay, month)),
      ]
    }

    return []
  })

  return mergeGeneratedIncome(currentEntries, generatedEntries.filter(generated => !skippedKeys.includes(generated.id) && !entries.some(entry => entry.occurrenceKey === generated.id))).sort((a, b) => b.date.localeCompare(a.date))
}

export function getExpensesForMonth(bills: MonthlyBill[], expenses: Expense[], month: string, skippedKeys: string[] = []) {
  const currentExpenses = expenses.filter((expense) => expense.date.startsWith(month) && !(expense.isGenerated && skippedKeys.includes(expense.occurrenceKey ?? expense.id)))
  const generatedExpenses = bills.map(current => current.history?.find(version => month < version.until)?.value ?? current)
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

  return mergeGeneratedExpenses(currentExpenses, generatedExpenses.filter(generated => !skippedKeys.includes(generated.id) && !expenses.some(expense => expense.occurrenceKey === generated.id))).sort((a, b) => b.date.localeCompare(a.date))
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

function createScheduledIncome(source: IncomeSource, position: number, amount: number, paymentDay: number, month: string): IncomeEntry {
  const cutoff = position === 1 ? 'first' : position === 2 ? 'second' : undefined
  const occurrencePart = cutoff ?? 'payment-' + position
  const safeDay = clampDay(month, paymentDay)

  return {
    id: `auto-income-${source.id}-${occurrencePart}-${month}`,
    sourceId: source.id,
    title: `${source.name} · ${formatPaydayLabel(position)}`,
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
            !entry.occurrenceKey && !generated.id.includes('-payment-') && entry.sourceId === generated.sourceId &&
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
          (expense) => !expense.occurrenceKey && expense.billId === generated.billId && expense.date.slice(0, 7) === generated.date.slice(0, 7),
        ),
    ),
  ]
}

function clampDay(month: string, day: number) {
  const [year, monthNumber] = month.split('-').map(Number)
  const daysInMonth = new Date(year, monthNumber, 0).getDate()

  return Math.min(Math.max(day, 1), daysInMonth)
}

export function formatPaydayLabel(position: number) {
  const lastTwo = position % 100
  const suffix = lastTwo >= 11 && lastTwo <= 13 ? 'th' : position % 10 === 1 ? 'st' : position % 10 === 2 ? 'nd' : position % 10 === 3 ? 'rd' : 'th'
  return `${position}${suffix} payment`
}
