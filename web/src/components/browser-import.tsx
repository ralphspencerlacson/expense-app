import { useState } from 'react'
import { readLegacyState, useFinanceStore } from '../store/finance-store'
import { EditDrawer } from './edit-drawer'
import { Button } from './ui/button'
import { formatCurrency } from '../lib/utils'

export function BrowserImport() {
  const [open, setOpen] = useState(false)
  const { legacyAvailable, importBrowserData, isSaving, expenses, incomeEntries } = useFinanceStore()
  const legacy = readLegacyState()
  if (!legacyAvailable || !legacy) return null
  const records = [...legacy.expenses, ...legacy.incomeEntries]
  const existingIds = new Set([...expenses, ...incomeEntries].map(item => item.id))
  const matching = records.filter(item => existingIds.has(item.id)).length
  return <>
    <div className="mb-4 rounded-2xl border bg-white p-4">
      <p className="font-semibold">Browser data available</p>
      <p className="mt-1 text-sm text-zinc-600">Review saved prototype records before importing them into this account.</p>
      <Button className="mt-3" type="button" disabled={isSaving} onClick={() => setOpen(true)}>Review import</Button>
    </div>
    <EditDrawer open={open} title="Import browser data" description="This imports into the account currently signed in." onClose={() => { if (!isSaving) setOpen(false) }}>
      <div className="space-y-4">
        <p>{legacy.expenses.length} expenses, {legacy.incomeEntries.length} income entries, {legacy.incomeSources.length} income sources, and {legacy.monthlyBills.length} recurring bills.</p>
        <p className="text-sm text-zinc-600">{matching} transaction IDs already exist. Existing matching records are kept, and your browser backup is retained. Unrelated records are added; transactions with different IDs may need manual reconciliation.</p>
        <ul className="space-y-2">{records.slice(0, 5).map((item, index) => <li key={index} className="rounded-xl border p-3 text-sm">{item.title} · {item.date} · {formatCurrency(item.amount)}</li>)}</ul>
        <Button disabled={isSaving} onClick={async () => { if (await importBrowserData()) setOpen(false) }}>{isSaving ? 'Importing…' : 'Import into this account'}</Button>
      </div>
    </EditDrawer>
  </>
}
