import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import ts from 'typescript'

const user = '11111111-1111-4111-8111-111111111111'
const other = '22222222-2222-4222-8222-222222222222'
const migrationRoot = new URL('../../supabase/migrations/', import.meta.url)
async function database(beforeProduction) {
  const db = new PGlite()
  try {
  await db.exec(`create role authenticated; create role service_role;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to authenticated;
    insert into auth.users values ('${user}'), ('${other}');`)
  for (const name of ['20260903220000_create_expense_schema.sql','20260906120000_normalize_income_schedules.sql','20260912120000_production_flow.sql']) {
    if (name === '20260912120000_production_flow.sql' && beforeProduction) await db.exec(beforeProduction)
    await db.exec(await readFile(new URL(name, migrationRoot), 'utf8'))
  }
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${user}', false);`)
  return db
  } catch (error) { await db.close(); throw error }
}
const source = { id: 'source-test', user_id: user, name: 'Salary', type: 'salary', mode: 'recurring', schedule: 'monthly', start_month: '2026-01', is_active: true }
const payment = { id: 'schedule-test', user_id: user, source_id: source.id, position: 1, amount: 1000, payment_day: 15 }
const commit = (db, payload) => db.query('select expense.commit_finance($1::jsonb)', [JSON.stringify(payload)])

test('staging preflight runs against the baseline without changing records', async () => {
  const preflight = await readFile(new URL('../checks/production_flow_preflight.sql', migrationRoot), 'utf8')
  const db = await database(preflight)
  try {
    assert.equal((await db.query('select * from expense.expenses')).rows.length, 0)
    assert.equal((await db.query('select * from expense.income_sources')).rows.length, 0)
  } finally { await db.close() }
})

test('setup commits parent, schedules and profile atomically and preserves defaults', async () => {
  const db = await database()
  try {
    await commit(db, { income_sources: [source], income_schedules: [payment], finance_profiles: [{ user_id: user, selected_month: '2026-09', setup_complete: true }] })
    const rows = (await db.query('select created_at from expense.income_sources')).rows
    assert.equal(rows.length, 1)
    assert.ok(rows[0].created_at)
    assert.equal((await db.query('select setup_complete from expense.finance_profiles')).rows[0].setup_complete, true)
  } finally { await db.close() }
})

test('a failed child write rolls back setup and can be retried', async () => {
  const db = await database()
  try {
    const payload = { income_sources: [source], income_schedules: [{ ...payment, payment_day: 32 }], finance_profiles: [{ user_id: user, selected_month: '2026-09', setup_complete: true }] }
    await assert.rejects(commit(db, payload))
    assert.equal((await db.query('select * from expense.income_sources')).rows.length, 0)
    assert.equal((await db.query('select * from expense.finance_profiles')).rows.length, 0)
    await commit(db, { ...payload, income_schedules: [payment] })
    assert.equal((await db.query('select * from expense.income_schedules')).rows.length, 1)
  } finally { await db.close() }
})

test('import retries keep existing records and do not duplicate schedules', async () => {
  const db = await database()
  try {
    await commit(db, { income_sources: [source], income_schedules: [payment] })
    await commit(db, { import: true, income_sources: [{ ...source, name: 'Browser salary' }], income_schedules: [{ ...payment, id: 'different-id', amount: 999 }] })
    assert.equal((await db.query('select name from expense.income_sources')).rows[0].name, 'Salary')
    assert.equal((await db.query('select amount from expense.income_schedules')).rows.length, 1)
  } finally { await db.close() }
})

test('RPC rejects another owner and RLS isolates reads and writes', async () => {
  const db = await database()
  try {
    await assert.rejects(commit(db, { income_sources: [{ ...source, user_id: other }] }), /Invalid row owner/)
    await commit(db, { income_sources: [source] })
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [other])
    assert.equal((await db.query('select * from expense.income_sources')).rows.length, 0)
    await assert.rejects(commit(db, { income_sources: [{ ...source, user_id: other }] }))
    await assert.rejects(commit(db, { delete_income_source: source.id }))
  } finally { await db.close() }
})

test('duplicate occurrence confirmation is rejected across sessions', async () => {
  const db = await database()
  try {
    const row = { id: 'expense-one', user_id: user, title: 'Rent', amount: 500, date: '2026-10-01', tag_id: 'tag-bills', occurrence_key: 'auto-expense-rent-2026-09' }
    await commit(db, { expenses: [row] })
    await assert.rejects(commit(db, { expenses: [{ ...row, id: 'expense-two' }] }))
    assert.equal((await db.query('select * from expense.expenses')).rows.length, 1)
  } finally { await db.close() }
})

test('source edits snapshot old payment values and failed replacement rolls back history', async () => {
  const db = await database()
  try {
    await commit(db, { income_sources: [source], income_schedules: [payment] })
    await commit(db, { effective_month: '2026-09', income_sources: [{ ...source, name: 'New salary' }], replace_schedules: source.id, income_schedules: [{ ...payment, amount: 2000 }] })
    const history = (await db.query('select * from expense.schedule_history')).rows
    assert.equal(history.length, 1)
    assert.equal(history[0].effective_until, '2026-09')
    assert.equal(Number(history[0].value.payments[0].amount), 1000)
    await assert.rejects(commit(db, { effective_month: '2026-10', income_sources: [{ ...source, name: 'Failed' }], replace_schedules: source.id, income_schedules: [{ ...payment, payment_day: 32 }] }))
    assert.equal((await db.query('select * from expense.schedule_history')).rows.length, 1)
    assert.equal(Number((await db.query('select amount from expense.income_schedules')).rows[0].amount), 2000)
    await assert.rejects(commit(db, { effective_month: '2026-08', income_sources: [source] }), /last schedule change/)
  } finally { await db.close() }
})

test('deleting a bill keeps previous values and detaches actual expenses', async () => {
  const db = await database()
  try {
    await commit(db, { monthly_bills: [{ id: 'bill-one', user_id: user, name: 'Rent', expected_amount: 500, due_day: 1, tag_id: 'tag-bills' }], expenses: [{ id: 'paid-rent', user_id: user, title: 'Rent', amount: 500, date: '2026-08-01', tag_id: 'tag-bills', bill_id: 'bill-one', occurrence_key: 'auto-expense-bill-one-2026-08' }] })
    await commit(db, { effective_month: '2026-09', delete_bill: 'bill-one' })
    assert.equal((await db.query('select * from expense.monthly_bills')).rows.length, 0)
    assert.equal((await db.query('select * from expense.schedule_history')).rows[0].value.expected_amount, 500)
    assert.equal((await db.query('select bill_id from expense.expenses')).rows[0].bill_id, null)
  } finally { await db.close() }
})

const code = ts.transpileModule(await readFile(new URL('../src/lib/recurring.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 } }).outputText
const recurring = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'))
const original = { id: 'salary', name: 'Salary', type: 'salary', mode: 'recurring', schedule: 'monthly', startMonth: '2026-01', isActive: true, payments: [{ id: 'pay', position: 1, amount: 1000, paymentDay: 31 }] }

test('recurring calculations preserve historical amounts and clamp short months', () => {
  const changed = { ...original, payments: [{ ...original.payments[0], amount: 2000 }], history: [{ until: '2026-09', value: original }] }
  const february = recurring.getIncomeEntriesForMonth([changed], [], '2026-02')[0]
  assert.equal(february.date, '2026-02-28')
  assert.equal(february.amount, 1000)
  assert.equal(recurring.getIncomeEntriesForMonth([changed], [], '2026-09')[0].amount, 2000)
  const deleted = { ...changed, isActive: false }
  assert.equal(recurring.getIncomeEntriesForMonth([deleted], [], '2026-08').length, 1)
  assert.equal(recurring.getIncomeEntriesForMonth([deleted], [], '2026-09').length, 0)
})

test('payment in another month settles its original occurrence and counts on actual date', () => {
  const bill = { id: 'rent', name: 'Rent', expectedAmount: 500, dueDay: 1, tagId: 'tag-bills', isActive: true }
  const actual = { id: 'paid', title: 'Rent', amount: 510, date: '2026-10-03', tagId: 'tag-bills', billId: 'rent', occurrenceKey: 'auto-expense-rent-2026-09' }
  assert.equal(recurring.getExpensesForMonth([bill], [actual], '2026-09').length, 0)
  assert.equal(recurring.getExpensesForMonth([bill], [actual], '2026-10').filter(row => !row.isGenerated)[0].amount, 510)
  assert.equal(recurring.getExpensesForMonth([bill], [actual], '2026-10').filter(row => row.isGenerated).length, 1)
  const income = { id: 'received', sourceId: 'salary', title: 'Salary', kind: 'source', amount: 995, date: '2026-10-02', occurrenceKey: 'auto-income-salary-2026-09' }
  assert.equal(recurring.getIncomeEntriesForMonth([original], [income], '2026-09').length, 0)
})


test('skip is user-scoped, reversible, and affects only one occurrence', async () => {
  const db = await database()
  try {
    await db.query('insert into expense.skipped_occurrences values ($1, $2)', ['auto-expense-rent-2026-09', user])
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [other])
    assert.equal((await db.query('select * from expense.skipped_occurrences')).rows.length, 0)
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user])
    await db.query('delete from expense.skipped_occurrences where id = $1', ['auto-expense-rent-2026-09'])
    assert.equal((await db.query('select * from expense.skipped_occurrences')).rows.length, 0)
    const bill = { id: 'rent', name: 'Rent', expectedAmount: 500, dueDay: 1, tagId: 'tag-bills', isActive: true }
    assert.equal(recurring.getExpensesForMonth([bill], [], '2026-09', ['auto-expense-rent-2026-09']).length, 0)
    const pending = { id: 'previously-paid', title: 'Rent', amount: 500, date: '2026-09-01', tagId: 'tag-bills', billId: 'rent', occurrenceKey: 'auto-expense-rent-2026-09', isGenerated: true }
    assert.equal(recurring.getExpensesForMonth([bill], [pending], '2026-09', ['auto-expense-rent-2026-09']).length, 0)
    assert.equal(recurring.getExpensesForMonth([bill], [pending], '2026-09').length, 1)
    assert.equal(recurring.getExpensesForMonth([bill], [], '2026-10', ['auto-expense-rent-2026-09']).length, 1)
  } finally { await db.close() }
})

test('migration preserves existing data and backfills only unambiguous links', async () => {
  const db = await database(`insert into expense.monthly_bills(id,user_id,name,expected_amount,due_day,tag_id) values ('legacy-rent','${user}','Rent',500,1,'tag-bills');
    insert into expense.expenses(id,user_id,title,amount,date,tag_id,bill_id) values
      ('legacy-one','${user}','Rent',500,'2026-08-01','tag-bills','legacy-rent'),
      ('legacy-two','${user}','Rent',250,'2026-09-01','tag-bills','legacy-rent'),
      ('legacy-three','${user}','Rent',250,'2026-09-15','tag-bills','legacy-rent');`)
  try {
    const rows = (await db.query('select * from expense.expenses order by id')).rows
    assert.equal(rows.length, 3)
    assert.equal(rows.find(row => row.id === 'legacy-one').occurrence_key, 'auto-expense-legacy-rent-2026-08')
    assert.equal(rows.find(row => row.id === 'legacy-two').occurrence_key, null)
    assert.equal(rows.find(row => row.id === 'legacy-three').occurrence_key, null)
  } finally { await db.close() }
})

test('administrator user deletion still cascades with schedule-history triggers', async () => {
  const db = await database()
  try {
    await commit(db, { income_sources: [source], income_schedules: [payment] })
    await commit(db, { effective_month: '2026-09', income_sources: [{ ...source, name: 'Updated' }] })
    await db.exec('reset role')
    await db.query('delete from auth.users where id = $1', [user])
    assert.equal((await db.query('select * from expense.income_sources')).rows.length, 0)
    assert.equal((await db.query('select * from expense.schedule_history')).rows.length, 0)
  } finally { await db.close() }
})

const reportCode = ts.transpileModule(await readFile(new URL('../src/lib/reporting.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 } }).outputText
const reporting = await import('data:text/javascript;base64,' + Buffer.from(reportCode).toString('base64'))
test('monthly reporting uses actual payment dates and recomputes after edits', () => {
  const entries = [{ id: 'actual', title: 'Salary', kind: 'source', amount: 1000, date: '2026-09-15' }, { id: 'expected', title: 'Salary', kind: 'source', amount: 5000, date: '2026-09-30', isGenerated: true }]
  const expenses = [{ id: 'paid', title: 'Rent', amount: 400, date: '2026-09-16', tagId: 'tag-bills' }]
  assert.equal(reporting.getMonthlyCashflow(entries, expenses)[0].savings, 600)
  expenses[0].amount = 450
  assert.equal(reporting.getMonthlyCashflow(entries, expenses)[0].savings, 550)
  expenses[0].date = '2026-10-01'
  const months = reporting.getMonthlyCashflow(entries, expenses)
  assert.equal(months[0].savings, 1000)
  assert.equal(months[1].savings, -450)
})


test('multiple monthly payments generate distinct occurrences beyond the second payment', () => {
  const source = { ...original, schedule: 'cutoff', payments: [1,2,3,4].map(position => ({ id: 'pay-' + position, position, amount: position * 100, paymentDay: position * 7 })) }
  const generated = recurring.getIncomeEntriesForMonth([source], [], '2026-09')
  assert.equal(generated.length, 4)
  assert.equal(new Set(generated.map(entry => entry.id)).size, 4)
  assert.deepEqual(generated.map(entry => entry.title).sort(), ['Salary · 1st payment','Salary · 2nd payment','Salary · 3rd payment','Salary · 4th payment'])
  assert.ok(generated.some(entry => entry.id === 'auto-income-salary-first-2026-09'))
  assert.ok(generated.some(entry => entry.id === 'auto-income-salary-second-2026-09'))
  const third = generated.find(entry => entry.id.includes('-payment-3-'))
  const actual = { ...third, id: 'received-third', occurrenceKey: third.id, date: '2026-10-01', isGenerated: false }
  const remaining = recurring.getIncomeEntriesForMonth([source], [actual], '2026-09')
  assert.equal(remaining.length, 3)
  assert.ok(remaining.some(entry => entry.title.endsWith('4th payment')))
  assert.equal(recurring.getIncomeEntriesForMonth([source], [], '2026-09', [third.id]).length, 3)
  const removed = { ...source, payments: source.payments.filter(payment => payment.position !== 3), history: [{ until: '2026-10', value: source }] }
  assert.equal(recurring.getIncomeEntriesForMonth([removed], [], '2026-09').length, 4)
  assert.equal(recurring.getIncomeEntriesForMonth([removed], [], '2026-10').length, 3)
})

test('atomic schedule writes persist more than two payments', async () => {
  const db = await database()
  try {
    const payments = [1,2,3,4].map(position => ({ ...payment, id: 'pay-' + position, position, amount: position * 100, payment_day: position * 7 }))
    await commit(db, { income_sources: [{ ...source, schedule: 'cutoff' }], income_schedules: payments })
    assert.equal((await db.query('select * from expense.income_schedules')).rows.length, 4)
    await commit(db, { effective_month: '2026-10', income_sources: [{ ...source, schedule: 'cutoff' }], replace_schedules: source.id, income_schedules: payments.filter(row => row.position !== 3) })
    assert.equal((await db.query('select * from expense.income_schedules')).rows.length, 3)
    assert.equal((await db.query('select value from expense.schedule_history')).rows[0].value.payments.length, 4)
  } finally { await db.close() }
})


test('existing monthly income can add payments without duplicating its confirmed first payment', () => {
  const first = recurring.getIncomeEntriesForMonth([original], [], '2026-09')[0]
  const extended = { ...original, payments: [...original.payments, { id: 'pay-extra', position: 2, amount: 500, paymentDay: 15 }] }
  const confirmed = { ...first, id: 'received-first', isGenerated: false, occurrenceKey: first.id }
  const entries = recurring.getIncomeEntriesForMonth([extended], [confirmed], '2026-09')
  assert.equal(entries.length, 2)
  assert.equal(entries.filter(entry => !entry.isGenerated).length, 1)
  assert.equal(entries.find(entry => entry.isGenerated).amount, 500)
  assert.equal(recurring.getIncomeEntriesForMonth([{ ...original, schedule: 'cutoff' }], [], '2026-09').length, 1)
})
