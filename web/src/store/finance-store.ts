import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { expenses, expenseTags, incomeEntries, incomeSources, monthlyBills, savingsSnapshots } from '../data/mock-data'
import { formatLocalDate, getLocalMonth } from '../lib/utils'
import type {
  Expense,
  IncomeCutoff,
  IncomeEntry,
  IncomeSource,
  MonthlyBill,
  NewExpense,
  NewIncomeEntry,
  NewIncomeSource,
  NewMonthlyBill,
  SavingsSnapshot,
} from '../types/finance'

type FinanceStore = {
  incomeSources: IncomeSource[]
  incomeEntries: IncomeEntry[]
  expenses: Expense[]
  monthlyBills: MonthlyBill[]
  savingsSnapshots: SavingsSnapshot[]
  expenseTags: typeof expenseTags
  selectedMonth: string
  setupComplete: boolean
  setSelectedMonth: (month: string) => void
  completeSetup: () => void
  addIncomeSource: (source: NewIncomeSource) => void
  updateIncomeSource: (id: string, source: Partial<IncomeSource>) => void
  deleteIncomeSource: (id: string) => void
  addIncomeEntry: (entry: NewIncomeEntry) => void
  updateIncomeEntry: (id: string, entry: Partial<IncomeEntry>) => void
  recordIncomeFromSource: (sourceId: string, cutoff?: IncomeCutoff) => void
  deleteIncomeEntry: (id: string) => void
  addExpense: (expense: NewExpense) => void
  updateExpense: (id: string, expense: Partial<Expense>) => void
  deleteExpense: (id: string) => void
  addMonthlyBill: (bill: NewMonthlyBill) => void
  updateMonthlyBill: (id: string, bill: Partial<MonthlyBill>) => void
  deleteMonthlyBill: (id: string) => void
  recordMonthlyBill: (billId: string) => void
}

const createId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`

export const useFinanceStore = create<FinanceStore>()(persist((set, get) => ({
  incomeSources,
  incomeEntries,
  expenses,
  monthlyBills,
  savingsSnapshots,
  expenseTags,
  selectedMonth: getLocalMonth(),
  setupComplete: false,
  setSelectedMonth: (selectedMonth) => set({ selectedMonth }),
  completeSetup: () => set({ setupComplete: true }),
  addIncomeSource: (source) =>
    set((state) => ({
      incomeSources: [
        {
          ...source,
          id: createId('source'),
          isActive: source.isActive ?? true,
        },
        ...state.incomeSources,
      ],
    })),
  updateIncomeSource: (id, source) =>
    set((state) => ({
      incomeSources: state.incomeSources.map((item) => (item.id === id ? { ...item, ...source } : item)),
    })),
  deleteIncomeSource: (id) =>
    set((state) => ({
      incomeSources: state.incomeSources.filter((source) => source.id !== id),
      incomeEntries: state.incomeEntries.map((entry) =>
        entry.sourceId === id ? { ...entry, sourceId: undefined } : entry,
      ),
    })),
  addIncomeEntry: (entry) =>
    set((state) => ({
      incomeEntries: [{ ...entry, id: createId('income') }, ...state.incomeEntries],
    })),
  updateIncomeEntry: (id, entry) =>
    set((state) => ({
      incomeEntries: state.incomeEntries.map((item) => (item.id === id ? { ...item, ...entry } : item)),
    })),
  recordIncomeFromSource: (sourceId, cutoff) => {
    const source = get().incomeSources.find((item) => item.id === sourceId)

    if (!source) {
      return
    }

    const amount =
      source.schedule === 'cutoff'
        ? cutoff === 'second'
          ? source.secondCutoffAmount ?? 0
          : source.firstCutoffAmount ?? 0
        : source.expectedAmount ?? 0

    set((state) => ({
      incomeEntries: [
        {
          id: createId('income'),
          sourceId: source.id,
          title: cutoff ? `${source.name} - ${cutoff} cutoff` : source.name,
          amount,
          date: formatLocalDate(),
          kind: 'source',
          cutoff,
        },
        ...state.incomeEntries,
      ],
    }))
  },
  deleteIncomeEntry: (id) =>
    set((state) => ({ incomeEntries: state.incomeEntries.filter((entry) => entry.id !== id) })),
  addExpense: (expense) =>
    set((state) => ({ expenses: [{ ...expense, id: createId('expense') }, ...state.expenses] })),
  updateExpense: (id, expense) =>
    set((state) => ({
      expenses: state.expenses.map((item) => (item.id === id ? { ...item, ...expense } : item)),
    })),
  deleteExpense: (id) => set((state) => ({ expenses: state.expenses.filter((expense) => expense.id !== id) })),
  addMonthlyBill: (bill) =>
    set((state) => ({
      monthlyBills: [{ ...bill, id: createId('bill'), isActive: bill.isActive ?? true }, ...state.monthlyBills],
    })),
  updateMonthlyBill: (id, bill) =>
    set((state) => ({
      monthlyBills: state.monthlyBills.map((item) => (item.id === id ? { ...item, ...bill } : item)),
    })),
  deleteMonthlyBill: (id) =>
    set((state) => ({
      monthlyBills: state.monthlyBills.filter((bill) => bill.id !== id),
      expenses: state.expenses.map((expense) => (expense.billId === id ? { ...expense, billId: undefined } : expense)),
    })),
  recordMonthlyBill: (billId) => {
    const bill = get().monthlyBills.find((item) => item.id === billId)

    if (!bill) {
      return
    }

    set((state) => ({
      expenses: [
        {
          id: createId('expense'),
          title: bill.name,
          amount: bill.expectedAmount,
          date: formatLocalDate(),
          tagId: bill.tagId,
          billId: bill.id,
          cutoff: bill.cutoff,
        },
        ...state.expenses,
      ],
    }))
  },
}), {
  name: 'expenses-app-prototype',
  partialize: (state) => ({
    incomeSources: state.incomeSources,
    incomeEntries: state.incomeEntries,
    expenses: state.expenses,
    monthlyBills: state.monthlyBills,
    savingsSnapshots: state.savingsSnapshots,
    selectedMonth: state.selectedMonth,
    setupComplete: state.setupComplete,
  }),
}))
