export type IncomeSourceType = 'allowance' | 'salary' | 'business' | 'freelance' | 'bonus' | 'other'

export type IncomeSchedule = 'monthly' | 'cutoff' | 'irregular'

export type IncomeCutoff = 'first' | 'second'

export type IncomeDeduction = {
  id: string
  label: string
  amount: number
  group: 'contribution' | 'tax'
}

export type IncomeSource = {
  id: string
  name: string
  type: IncomeSourceType
  mode: 'recurring' | 'manual'
  schedule: IncomeSchedule
  expectedAmount?: number
  firstCutoffGrossAmount?: number
  firstCutoffAmount?: number
  firstCutoffDeductions?: IncomeDeduction[]
  firstCutoffDay?: number
  secondCutoffGrossAmount?: number
  secondCutoffAmount?: number
  secondCutoffDeductions?: IncomeDeduction[]
  secondCutoffDay?: number
  monthlyDay?: number
  startMonth?: string
  endMonth?: string
  nextExpectedDate?: string
  isActive: boolean
}

export type IncomeEntry = {
  id: string
  sourceId?: string
  title: string
  amount: number
  date: string
  kind: 'source' | 'one_time'
  category?: IncomeSourceType
  cutoff?: IncomeCutoff
  isGenerated?: boolean
  note?: string
}

export type ExpenseTagGroup = 'bills' | 'grocery' | 'leisure' | 'transport' | 'food' | 'other'

export type ExpenseTag = {
  id: string
  name: string
  group: ExpenseTagGroup
  color: string
}

export type Expense = {
  id: string
  title: string
  amount: number
  date: string
  tagId: string
  billId?: string
  cutoff?: IncomeCutoff
  isGenerated?: boolean
  note?: string
}

export type MonthlyBill = {
  id: string
  name: string
  expectedAmount: number
  dueDay: number
  tagId: string
  cutoff?: IncomeCutoff
  startMonth?: string
  endMonth?: string
  isActive: boolean
  note?: string
}

export type SavingsSnapshot = {
  id: string
  month: string
  income: number
  expenses: number
  savings: number
}

export type NewIncomeSource = Omit<IncomeSource, 'id' | 'isActive'> & {
  isActive?: boolean
}

export type NewIncomeEntry = Omit<IncomeEntry, 'id'>

export type NewExpense = Omit<Expense, 'id'>

export type NewMonthlyBill = Omit<MonthlyBill, 'id' | 'isActive'> & {
  isActive?: boolean
}
