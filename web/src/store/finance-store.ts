import { getExpensesForMonth, getIncomeEntriesForMonth } from '../lib/recurring'
import { create } from 'zustand'
import { expenseTags } from '../data/mock-data'
import { getLocalMonth } from '../lib/utils'
import { supabase } from '../lib/supabase'
import type { Expense, IncomeEntry, IncomePaymentSchedule, IncomeSource, MonthlyBill, NewExpense, NewIncomeEntry, NewIncomeSource, NewMonthlyBill, SavingsSnapshot, } from '../types/finance'
type FinanceStore = {
  incomeSources: IncomeSource[]
  incomeEntries: IncomeEntry[]
  expenses: Expense[]
  monthlyBills: MonthlyBill[]
  savingsSnapshots: SavingsSnapshot[]
  expenseTags: typeof expenseTags
  selectedMonth: string
  setupComplete: boolean
  isInitialized: boolean
  initializedUserId: string | null
  isLoading: boolean
  error: string
  isSaving: boolean
  legacyAvailable: boolean
  skippedOccurrenceKeys: string[]
  skipOccurrence: (key: string) => Promise<boolean>
  restoreOccurrence: (key: string) => Promise<boolean>
  importBrowserData: () => Promise<boolean>
  saveSetup: (source: NewIncomeSource | null, bills: NewMonthlyBill[]) => Promise<boolean>
  loadFinanceData: () => Promise<void>
  clearFinanceData: () => void
  clearFeedback: () => void
  setSelectedMonth: (month: string) => void
  completeSetup: () => Promise<boolean>
  addIncomeSource: (source: NewIncomeSource) => Promise<boolean>
  updateIncomeSource: (id: string, changes: Partial<IncomeSource>) => Promise<boolean>
  deleteIncomeSource: (id: string) => Promise<boolean>
  addIncomeEntry: (entry: NewIncomeEntry) => Promise<boolean>
  updateIncomeEntry: (id: string, changes: Partial<IncomeEntry>) => Promise<boolean>
  confirmExpectedIncome: (entry: IncomeEntry) => Promise<boolean>
  deleteIncomeEntry: (id: string) => Promise<boolean>
  addExpense: (expense: NewExpense) => Promise<boolean>
  updateExpense: (id: string, changes: Partial<Expense>) => Promise<boolean>
  deleteExpense: (id: string) => Promise<boolean>
  addMonthlyBill: (bill: NewMonthlyBill) => Promise<boolean>
  updateMonthlyBill: (id: string, changes: Partial<MonthlyBill>) => Promise<boolean>
  deleteMonthlyBill: (id: string) => Promise<boolean>
  confirmPlannedExpense: (expense: Expense) => Promise<boolean>
  markExpenseUnpaid: (expense: Expense) => Promise<boolean>
  markIncomeUnreceived: (entry: IncomeEntry) => Promise<boolean>
}
type LegacyState = Pick<FinanceStore, 'incomeSources' | 'incomeEntries' | 'expenses' | 'monthlyBills' | 'savingsSnapshots' | 'selectedMonth' | 'setupComplete'>
type MutationResult = {
  error: {
    message: string
  } | null
}
const createId = (prefix: string) => prefix + '-' + crypto.randomUUID()
const fieldNames: Record<string, string> = {
  sourceId: 'source_id', tagId: 'tag_id', billId: 'bill_id', isGenerated: 'is_generated', occurrenceKey: 'occurrence_key', expectedAmount: 'expected_amount', dueDay: 'due_day', startMonth: 'start_month', endMonth: 'end_month', nextExpectedDate: 'next_expected_date', isActive: 'is_active', grossAmount: 'gross_amount', paymentDay: 'payment_day'
}
const toRow = (item: object, userId: string) => Object.fromEntries([...Object.entries(item).filter(([key]) => !['payments', 'history'].includes(key)).map(([key, value]) => [fieldNames[key] ?? key, value ?? null]), ['user_id', userId]])
const fromRow = <T,>(row: Record<string, unknown>): T => Object.fromEntries(Object.entries(row).filter(([key]) => !['user_id', 'created_at', 'updated_at'].includes(key)).map(([key, value]) => [Object.keys(fieldNames).find(name => fieldNames[name] === key) ?? key, value === null ? undefined : [
    'amount', 'expected_amount', 'gross_amount', 'income', 'expenses', 'savings'
  ].includes(key) ? Number(value) : value])) as T
const sourceToRow = (source: IncomeSource, userId: string) => toRow({
  id: source.id, name: source.name, type: source.type, mode: source.mode, schedule: source.schedule, startMonth: source.startMonth, endMonth: source.endMonth, nextExpectedDate: source.nextExpectedDate, isActive: source.isActive
}, userId)
const paymentToRow = (payment: IncomePaymentSchedule, sourceId: string, userId: string) => toRow({
  ...payment, sourceId
}, userId)
const entryToRow = (entry: IncomeEntry, userId: string) => toRow(entry, userId)
const expenseToRow = (expense: Expense, userId: string) => toRow(expense, userId)
const billToRow = (bill: MonthlyBill, userId: string) => toRow(bill, userId)
const snapshotToRow = (snapshot: SavingsSnapshot, userId: string) => toRow(snapshot, userId)
export const readLegacyState = (): LegacyState | null => {
  try {
    const raw = localStorage.getItem('expenses-app-prototype')
    const state = raw ? JSON.parse(raw).state : null
    return state && [
      'incomeSources', 'incomeEntries', 'expenses', 'monthlyBills', 'savingsSnapshots'
    ].every(key => Array.isArray(state[key])) ? state : null
  }
  catch {
    return null
  }
}
const materializePayments = (source: NewIncomeSource | IncomeSource): IncomePaymentSchedule[] => {
  if (source.payments?.length)
    return source.payments.map(payment => ({
      ...payment, id: 'id' in payment ? String(payment.id) : createId('schedule')
    }))
  const legacy = source as unknown as Record<string, unknown>
  if (source.schedule === 'monthly' && legacy.expectedAmount)
    return [{
        id: createId('schedule'), position: 1, amount: Number(legacy.expectedAmount), paymentDay: Number(legacy.monthlyDay ?? 15)
      }]
  if (source.schedule === 'cutoff')
    return ['first', 'second'].flatMap((prefix, index) => legacy[prefix + 'CutoffAmount'] ? [{
        id: createId('schedule'), position: index + 1, amount: Number(legacy[prefix + 'CutoffAmount']), grossAmount: Number(legacy[prefix + 'CutoffGrossAmount'] ?? legacy[prefix + 'CutoffAmount']), paymentDay: Number(legacy[prefix + 'CutoffDay'] ?? (index === 0 ? 15 : 30)), deductions: legacy[prefix + 'CutoffDeductions'] as IncomePaymentSchedule['deductions']
      }] : [])
  return []
}
const initialData = {
  skippedOccurrenceKeys: [] as string[], incomeSources: [] as IncomeSource[], incomeEntries: [] as IncomeEntry[], expenses: [] as Expense[], monthlyBills: [] as MonthlyBill[], savingsSnapshots: [] as SavingsSnapshot[], selectedMonth: getLocalMonth(), setupComplete: false
}
const getUserId = async () => { const { data } = await supabase.auth.getSession(); if (!data.session)
  throw new Error('Sign in again to continue.'); return data.session.user.id; }
const commitRows = (rows: Record<string, unknown>): PromiseLike<MutationResult> => supabase.rpc('commit_finance', {
  payload: {
    ...rows, effective_month: useFinanceStore.getState().selectedMonth
  }
})
let sessionGeneration = 0
const runMutation = async (work: (userId: string) => PromiseLike<MutationResult>): Promise<boolean> => {
  if (useFinanceStore.getState().isSaving)
    return false
  const generation = sessionGeneration
  const expectedUserId = useFinanceStore.getState().initializedUserId
  useFinanceStore.setState({
    isSaving: true, error: ''
  })
  try {
    const userId = await getUserId()
    if (generation !== sessionGeneration || userId !== expectedUserId) return false
    const { error } = await work(userId)
    if (error)
      throw new Error(error.message)
    if (generation !== sessionGeneration)
      return false
    await useFinanceStore.getState().loadFinanceData()
    if (generation !== sessionGeneration) return false
    if (useFinanceStore.getState().error)
      useFinanceStore.setState({
        error: 'Changes were saved, but refreshing failed. Reload the page before making more changes.'
      })
    return true
  }
  catch (error) {
    if (generation === sessionGeneration)
      useFinanceStore.setState({
        error: error instanceof Error ? error.message : 'Could not save changes.'
      })
    return false
  }
  finally {
    if (generation === sessionGeneration)
      useFinanceStore.setState({
        isSaving: false
      })
  }
}
export const useFinanceStore = create<FinanceStore>((set, get) => ({
  ...initialData, expenseTags, isInitialized: false, initializedUserId: null, isLoading: false, isSaving: false, error: '', legacyAvailable: Boolean(readLegacyState()),
  loadFinanceData: async () => {
    const generation = sessionGeneration
    set({
      isLoading: true, error: ''
    })
    try {
      const userId = await getUserId()
      const fetchRows = async (table: string) => {
        const rows: Array<Record<string, unknown> & {
          id: string
          source_id: string
          position: number
          entity_type: string
          entity_id: string
          effective_until: string
          value: Record<string, unknown> & {
            payments?: Record<string, unknown>[]
          }
          selected_month: string
          setup_complete: boolean
        }> = []
        for (let offset = 0;; offset += 500) {
          const result = await supabase.from(table).select('*').eq('user_id', userId).order(table === 'finance_profiles' ? 'user_id' : 'id').range(offset, offset + 499)
          if (result.error)
            throw new Error(result.error.message)
          rows.push(...result.data as typeof rows)
          if (result.data.length < 500)
            return {
              data: rows
            }
          if (generation !== sessionGeneration)
            throw new Error('Session changed.')
        }
      }
      const results = await Promise.all([
        'finance_profiles', 'income_sources', 'income_schedules', 'income_entries', 'expenses', 'monthly_bills', 'savings_snapshots', 'schedule_history', 'skipped_occurrences'
      ].map(fetchRows))
      if (generation !== sessionGeneration)
        return
      const [profiles, sources, payments, entries, expenses, bills, snapshots, history, skipped] = results
      const profile = profiles.data?.[0]
      if (!profile) {
        const { error } = await supabase.from('finance_profiles').upsert({
          user_id: userId, selected_month: getLocalMonth(), setup_complete: Boolean(sources.data?.length || entries.data?.length || expenses.data?.length || bills.data?.length)
        }, {
          onConflict: 'user_id', ignoreDuplicates: true
        })
        if (error)
          throw new Error(error.message)
      }
      if (generation !== sessionGeneration)
        return
      const withHistory = <T extends IncomeSource | MonthlyBill>(items: T[], entityType: string): T[] => {
        const grouped = new Map<string, {
          until: string
          value: T
        }[]>()
        for (const row of history.data ?? []) {
          if (row.entity_type !== entityType)
            continue
          const value = fromRow<T>(row.value)
          if ('payments' in value)
            value.payments = (row.value.payments ?? []).map((payment: Record<string, unknown>) => fromRow<IncomePaymentSchedule>(payment))
          grouped.set(row.entity_id, [...(grouped.get(row.entity_id) ?? []), {
              until: row.effective_until, value
            }])
        }
        for (const [id, versions] of grouped) {
          versions.sort((a, b) => a.until.localeCompare(b.until))
          const current = items.find(item => item.id === id)
          if (current)
            items[items.indexOf(current)] = {
              ...current, history: versions
            } as T
          else
            items.push({
              ...versions[versions.length - 1].value, isActive: false, history: versions
            })
        }
        return items
      }
      set({
        skippedOccurrenceKeys: (skipped.data ?? []).map(row => row.id), incomeSources: withHistory((sources.data ?? []).map(row => ({
          ...fromRow<IncomeSource>(row), payments: (payments.data ?? []).filter(payment => payment.source_id === row.id).sort((a, b) => a.position - b.position).map(row => fromRow<IncomePaymentSchedule>(row))
        })), 'income_sources'), incomeEntries: (entries.data ?? []).map(row => fromRow<IncomeEntry>(row)), expenses: (expenses.data ?? []).map(row => fromRow<Expense>(row)), monthlyBills: withHistory((bills.data ?? []).map(row => fromRow<MonthlyBill>(row)), 'monthly_bills'), savingsSnapshots: (snapshots.data ?? []).map(row => fromRow<SavingsSnapshot>(row)).sort((a, b) => a.month.localeCompare(b.month)), selectedMonth: get().initializedUserId === userId ? get().selectedMonth : getLocalMonth(), setupComplete: Boolean(profile?.setup_complete || sources.data?.length || entries.data?.length || expenses.data?.length || bills.data?.length), initializedUserId: userId, isInitialized: true, isLoading: false
      })
    }
    catch (error) {
      if (generation === sessionGeneration)
        set({
          error: error instanceof Error ? error.message : 'Could not load data.', isLoading: false
        })
    }
  },
  clearFinanceData: () => { sessionGeneration++; set({
    ...initialData, isInitialized: false, initializedUserId: null, isLoading: false, isSaving: false, error: ''
  }); },
  clearFeedback: () => set({
    error: ''
  }),
  setSelectedMonth: (month) => { if (get().isSaving || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month))
    return; set({
    selectedMonth: month
  }); },
  skipOccurrence: (key) => runMutation(async (userId) => supabase.from('skipped_occurrences').insert({
    id: key, user_id: userId
  })),
  restoreOccurrence: (key) => runMutation(() => supabase.from('skipped_occurrences').delete().eq('id', key).select('id').single()),
  completeSetup: () => runMutation(async (userId) => supabase.from('finance_profiles').update({
    setup_complete: true
  }).eq('user_id', userId).select('user_id').single()),
  saveSetup: (source, bills) => runMutation(async (userId) => {
    const item = source ? {
      ...source, id: createId('source'), isActive: true, payments: materializePayments(source)
    } : null
    return commitRows({
      finance_profiles: [{
          user_id: userId, selected_month: get().selectedMonth, setup_complete: true
        }], income_sources: item ? [sourceToRow(item, userId)] : [], income_schedules: item ? item.payments.map(payment => paymentToRow(payment, item.id, userId)) : [], monthly_bills: bills.map(bill => billToRow({
        ...bill, id: createId('bill'), isActive: true
      }, userId))
    })
  }),
  importBrowserData: () => runMutation(async (userId) => {
    const legacy = readLegacyState()
    if (!legacy)
      throw new Error('No browser data is available.')
    const result = await commitRows({
      import: true, finance_profiles: [{
          user_id: userId, selected_month: get().selectedMonth, setup_complete: true
        }], income_sources: (legacy.incomeSources ?? []).map(item => sourceToRow(item, userId)), income_schedules: (legacy.incomeSources ?? []).flatMap(source => materializePayments(source).map(payment => paymentToRow({
        ...payment, id: `${source.id}-legacy-${payment.position}`
      }, source.id, userId))), monthly_bills: (legacy.monthlyBills ?? []).map(item => billToRow(item, userId)), income_entries: (legacy.incomeEntries ?? []).map(item => entryToRow(item, userId)), expenses: (legacy.expenses ?? []).map(item => expenseToRow(item, userId)), savings_snapshots: (legacy.savingsSnapshots ?? []).map(item => snapshotToRow(item, userId))
    })
    if (!result.error)
      set({
        legacyAvailable: false
      })
    return result
  }),
  addIncomeSource: (source) => runMutation(async (userId) => {
    const item = {
      ...source, id: createId('source'), isActive: source.isActive ?? true, payments: materializePayments(source)
    }
    return commitRows({
      income_sources: [sourceToRow(item, userId)], income_schedules: item.payments.map(payment => paymentToRow(payment, item.id, userId))
    })
  }),
  updateIncomeSource: (id, changes) => runMutation(async (userId) => {
    const current = get().incomeSources.find(item => item.id === id)
    if (!current)
      throw new Error('Income source no longer exists.')
    const item = {
      ...current, ...changes, id
    }
    return commitRows({
      income_sources: [sourceToRow(item, userId)], income_schedules: item.payments.map(payment => paymentToRow(payment, id, userId)), replace_schedules: id
    })
  }),
  deleteIncomeSource: (id) => runMutation(() => commitRows({
    delete_income_source: id
  })),
  addIncomeEntry: (entry) => runMutation(async (userId) => supabase.from('income_entries').insert(entryToRow({
    ...entry, id: createId('income')
  }, userId))),
  updateIncomeEntry: (id, changes) => runMutation(async (userId) => {
    const current = get().incomeEntries.find(item => item.id === id)
    if (!current)
      throw new Error('Income no longer exists.')
    return supabase.from('income_entries').update(entryToRow({
      ...current, ...changes, id
    }, userId)).eq('id', id).select('id').single()
  }),
  confirmExpectedIncome: (entry) => entry.isGenerated ? (get().incomeEntries.some(item => item.id === entry.id) ? get().updateIncomeEntry(entry.id, { ...entry, isGenerated: false }) : get().addIncomeEntry({
    ...entry, isGenerated: false, occurrenceKey: entry.occurrenceKey ?? entry.id
  })) : Promise.resolve(false),
  deleteIncomeEntry: (id) => runMutation(() => supabase.from('income_entries').delete().eq('id', id).select('id').single()),
  addExpense: (expense) => runMutation(async (userId) => supabase.from('expenses').insert(expenseToRow({
    ...expense, id: createId('expense')
  }, userId))),
  updateExpense: (id, changes) => runMutation(async (userId) => {
    const current = get().expenses.find(item => item.id === id)
    if (!current)
      throw new Error('Expense no longer exists.')
    return supabase.from('expenses').update(expenseToRow({
      ...current, ...changes, id
    }, userId)).eq('id', id).select('id').single()
  }),
  deleteExpense: (id) => runMutation(() => supabase.from('expenses').delete().eq('id', id).select('id').single()),
  addMonthlyBill: (bill) => runMutation(async (userId) => supabase.from('monthly_bills').insert(billToRow({
    ...bill, id: createId('bill'), isActive: bill.isActive ?? true
  }, userId))),
  updateMonthlyBill: (id, changes) => runMutation(async (userId) => {
    const current = get().monthlyBills.find(item => item.id === id)
    if (!current)
      throw new Error('Bill no longer exists.')
    return commitRows({
      monthly_bills: [billToRow({
          ...current, ...changes, id
        }, userId)]
    })
  }),
  deleteMonthlyBill: (id) => runMutation(() => commitRows({
    delete_bill: id
  })),
  confirmPlannedExpense: (expense) => expense.isGenerated ? (get().expenses.some(item => item.id === expense.id) ? get().updateExpense(expense.id, { ...expense, isGenerated: false }) : get().addExpense({
    ...expense, isGenerated: false, occurrenceKey: expense.occurrenceKey ?? expense.id
  })) : Promise.resolve(false),
  markExpenseUnpaid: (expense) => {
    if (expense.isGenerated || (!expense.billId && !expense.occurrenceKey)) return Promise.resolve(false)
    const month = expense.occurrenceKey?.slice(-7) ?? expense.date.slice(0, 7)
    const planned = getExpensesForMonth(get().monthlyBills, [], month).find(item => item.id === expense.occurrenceKey || item.billId === expense.billId)
    return get().updateExpense(expense.id, { ...expense, ...planned, note: expense.note, account: expense.account, id: expense.id, isGenerated: true, occurrenceKey: expense.occurrenceKey ?? planned?.id })
  },
  markIncomeUnreceived: (entry) => {
    if (entry.isGenerated || (!entry.sourceId && !entry.occurrenceKey)) return Promise.resolve(false)
    const month = entry.occurrenceKey?.slice(-7) ?? entry.date.slice(0, 7)
    const planned = getIncomeEntriesForMonth(get().incomeSources, [], month).find(item => entry.occurrenceKey ? item.id === entry.occurrenceKey : (item.sourceId === entry.sourceId && item.cutoff === entry.cutoff))
    return get().updateIncomeEntry(entry.id, { ...entry, ...planned, note: entry.note, account: entry.account, id: entry.id, isGenerated: true, occurrenceKey: entry.occurrenceKey ?? planned?.id })
  },
}))
