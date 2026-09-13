import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

const tick = () => new Promise(resolve => setImmediate(resolve))
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done }); return { promise, resolve } }
let moduleId = 0
async function financeStore() {
  const storage = new Map()
  globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) }
  const mock = { userId: 'user-a', failWrites: false, failReads: false, readGate: null, writeGate: null, writes: 0, tables: { finance_profiles: [{ user_id: 'user-a', selected_month: '2026-09', setup_complete: true }], expenses: [] } }
  mock.auth = { getSession: async () => ({ data: { session: { user: { id: mock.userId } } } }) }
  mock.from = table => {
    let mutation = null, input = null, single = false, range = [0, Infinity]
    const filters = []
    const builder = new Proxy({}, { get: (_target, name) => {
      if (name === 'then') return (resolve, reject) => (async () => {
        if (mutation) {
          mock.writes++
          if (mock.writeGate) await mock.writeGate
          if (mock.failWrites) return { error: { message: 'Connection failed' }, data: null }
          mock.tables[table] ??= []
          if (mutation === 'update') {
            const row = mock.tables[table].find(row => filters.every(([key, value]) => row[key] === value))
            if (!row) return { error: { message: 'Record no longer exists' }, data: null }
            Object.assign(row, structuredClone(input))
          } else mock.tables[table].push(structuredClone(input))
          return { error: null, data: single ? input : [input] }
        }
        if (mock.readGate) await mock.readGate
        if (mock.failReads) return { error: { message: 'Refresh failed' }, data: null }
        const rows = structuredClone(mock.tables[table] ?? []).filter(row => filters.every(([key,value]) => row[key] === value)).slice(range[0], range[1] + 1)
        return { error: null, data: single ? rows[0] : rows }
      })().then(resolve, reject)
      return (...args) => {
        if (['insert','upsert','update'].includes(name)) { mutation = name; input = args[0] }
        if (name === 'eq') filters.push(args)
        if (name === 'range') range = args
        if (name === 'single') single = true
        return builder
      }
    } })
    return builder
  }
  mock.rpc = async (_name, args) => { mock.payload = args.payload; return { error: mock.failWrites ? { message: 'Import failed' } : null } }
  globalThis.__financeMock = mock
  const recurringCode = ts.transpileModule(await readFile(new URL('../src/lib/recurring.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 } }).outputText
  const recurringUrl = 'data:text/javascript;base64,' + Buffer.from(recurringCode).toString('base64')
  let code = ts.transpileModule(await readFile(new URL('../src/store/finance-store.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 } }).outputText
  code = code.replace(/import \{ getExpensesForMonth, getIncomeEntriesForMonth \} from '[^']+';?/, 'import { getExpensesForMonth, getIncomeEntriesForMonth } from ' + JSON.stringify(recurringUrl))
    .replace(/import \{ create \} from 'zustand';?/, 'import { create } from ' + JSON.stringify(new URL('../node_modules/zustand/esm/index.mjs', import.meta.url).href))
    .replace(/import \{ expenseTags \} from '[^']+';?/, 'const expenseTags = []')
    .replace(/import \{ getLocalMonth \} from '[^']+';?/, 'const getLocalMonth = () => "2026-09"')
    .replace(/import \{ supabase \} from '[^']+';?/, 'const supabase = globalThis.__financeMock')
  const module = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64') + '#store-' + moduleId++)
  const store = module.useFinanceStore
  await store.getState().loadFinanceData()
  return { store, mock, storage }
}

test('failed saves retain existing records and successful saves retain cents, account and notes', async () => {
  const { store, mock } = await financeStore()
  const gate = deferred()
  mock.writeGate = gate.promise
  mock.failWrites = true
  const draft = { title: 'Lunch', amount: 12.75, date: '2026-09-12', tagId: 'food', account: 'Cash', note: 'Receipt saved' }
  const saving = store.getState().addExpense(draft)
  assert.equal(store.getState().isSaving, true)
  assert.equal(await store.getState().addExpense(draft), false)
  await tick()
  assert.equal(store.getState().expenses.length, 0)
  gate.resolve()
  assert.equal(await saving, false)
  assert.match(store.getState().error, /Connection failed/)
  assert.equal(store.getState().isSaving, false)
  mock.failWrites = false
  assert.equal(await store.getState().addExpense(draft), true)
  assert.equal(store.getState().expenses.length, 1)
  assert.equal(store.getState().expenses[0].amount, 12.75)
  assert.equal(store.getState().expenses[0].account, 'Cash')
  assert.equal(store.getState().expenses[0].note, 'Receipt saved')
})

test('an old in-flight load cannot repopulate finance data after sign-out', async () => {
  const { store, mock } = await financeStore()
  mock.tables.expenses = [{ id: 'private', user_id: 'user-a', title: 'Private', amount: 10, date: '2026-09-12', tag_id: 'food' }]
  const gate = deferred()
  mock.readGate = gate.promise
  const loading = store.getState().loadFinanceData()
  await tick()
  store.getState().clearFinanceData()
  mock.userId = 'user-b'
  gate.resolve()
  await loading
  assert.equal(store.getState().expenses.length, 0)
  assert.equal(store.getState().initializedUserId, null)
  assert.equal(store.getState().isInitialized, false)
})

test('a committed save with refresh failure reports success to prevent duplicate retries', async () => {
  const { store, mock } = await financeStore()
  mock.failReads = true
  assert.equal(await store.getState().addExpense({ title: 'Lunch', amount: 12.75, date: '2026-09-12', tagId: 'food' }), true)
  assert.equal(mock.tables.expenses.length, 1)
  assert.match(store.getState().error, /Changes were saved/)
  assert.equal(store.getState().isSaving, false)
})

test('browser import preserves its backup and generates deterministic legacy schedule IDs', async () => {
  const { store, mock, storage } = await financeStore()
  const legacy = { incomeSources: [{ id: 'legacy', name: 'Salary', type: 'salary', mode: 'recurring', schedule: 'monthly', expectedAmount: 1000, monthlyDay: 15, isActive: true }], incomeEntries: [], expenses: [], monthlyBills: [], savingsSnapshots: [] }
  const backup = JSON.stringify({ state: legacy })
  storage.set('expenses-app-prototype', backup)
  mock.failWrites = true
  assert.equal(await store.getState().importBrowserData(), false)
  assert.equal(storage.get('expenses-app-prototype'), backup)
  const id = mock.payload.income_schedules[0].id
  mock.failWrites = false
  assert.equal(await store.getState().importBrowserData(), true)
  assert.equal(mock.payload.income_schedules[0].id, id)
  assert.equal(mock.payload.income_schedules[0].amount, 1000)
  assert.equal(mock.payload.income_sources[0].expected_amount, undefined)
  assert.equal(storage.get('expenses-app-prototype'), backup)
})


test('unconfirming cross-month income preserves its record and supports reconfirmation', async () => {
  const { store, mock } = await financeStore()
  mock.tables.income_sources = [{ id: 'salary', user_id: 'user-a', name: 'Salary', type: 'salary', mode: 'recurring', schedule: 'monthly', start_month: '2026-01', is_active: true }]
  mock.tables.income_schedules = [{ id: 'payday', user_id: 'user-a', source_id: 'salary', position: 1, amount: 1000, payment_day: 15 }]
  mock.tables.income_entries = [{ id: 'received', user_id: 'user-a', source_id: 'salary', title: 'Salary', kind: 'source', amount: 995, date: '2026-10-02', occurrence_key: 'auto-income-salary-2026-09', is_generated: false }]
  await store.getState().loadFinanceData()
  assert.equal(await store.getState().markIncomeUnreceived(store.getState().incomeEntries[0]), true)
  const pending = store.getState().incomeEntries[0]
  assert.equal(pending.id, 'received')
  assert.equal(pending.date, '2026-09-15')
  assert.equal(pending.isGenerated, true)
  assert.equal(await store.getState().confirmExpectedIncome({ ...pending, amount: 990, date: '2026-10-03' }), true)
  assert.equal(mock.tables.income_entries.length, 1)
  assert.equal(store.getState().incomeEntries[0].isGenerated, false)
  assert.equal(store.getState().incomeEntries[0].amount, 990)
})

test('unpaying a bill keeps its ID and failed status updates preserve paid status', async () => {
  const { store, mock } = await financeStore()
  mock.tables.monthly_bills = [{ id: 'rent', user_id: 'user-a', name: 'Rent', expected_amount: 500, due_day: 1, tag_id: 'bills', is_active: true }]
  mock.tables.expenses = [{ id: 'paid', user_id: 'user-a', bill_id: 'rent', title: 'Rent', amount: 510, date: '2026-09-03', tag_id: 'bills', occurrence_key: 'auto-expense-rent-2026-09', is_generated: false }]
  await store.getState().loadFinanceData()
  mock.failWrites = true
  assert.equal(await store.getState().markExpenseUnpaid(store.getState().expenses[0]), false)
  assert.equal(store.getState().expenses[0].isGenerated, false)
  mock.failWrites = false
  assert.equal(await store.getState().markExpenseUnpaid(store.getState().expenses[0]), true)
  const pending = store.getState().expenses[0]
  assert.equal(pending.id, 'paid')
  assert.equal(pending.isGenerated, true)
  assert.equal(pending.date, '2026-09-01')
  assert.equal(await store.getState().confirmPlannedExpense({ ...pending, amount: 505 }), true)
  assert.equal(mock.tables.expenses.length, 1)
  assert.equal(store.getState().expenses[0].isGenerated, false)
})


test('undoing the fourth payday selects its own occurrence', async () => {
  const { store, mock } = await financeStore()
  mock.tables.income_sources = [{ id: 'salary', user_id: 'user-a', name: 'Salary', type: 'salary', mode: 'recurring', schedule: 'cutoff', start_month: '2026-01', is_active: true }]
  mock.tables.income_schedules = [1,2,3,4].map(position => ({ id: 'pay-' + position, user_id: 'user-a', source_id: 'salary', position, amount: position * 100, payment_day: position * 7 }))
  mock.tables.income_entries = [{ id: 'received-fourth', user_id: 'user-a', source_id: 'salary', title: 'Salary · 4th payday', kind: 'source', amount: 399, date: '2026-10-02', occurrence_key: 'auto-income-salary-payment-4-2026-09', is_generated: false }]
  await store.getState().loadFinanceData()
  assert.equal(await store.getState().markIncomeUnreceived(store.getState().incomeEntries[0]), true)
  const pending = store.getState().incomeEntries[0]
  assert.equal(pending.date, '2026-09-28')
  assert.equal(pending.amount, 400)
  assert.equal(pending.occurrenceKey, 'auto-income-salary-payment-4-2026-09')
  assert.equal(await store.getState().confirmExpectedIncome({ ...pending, amount: 398 }), true)
  assert.equal(mock.tables.income_entries.length, 1)
})
