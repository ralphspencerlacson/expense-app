import { BrowserImport } from '../components/browser-import'
import { CalendarDays, Home, LogOut, ReceiptText, Tags, WalletCards } from 'lucide-react'
import { NavLink, Outlet } from 'react-router'
import { MonthSwitcher } from '../components/month-switcher'
import { SetupWizard } from '../components/setup-wizard'
import { supabase } from '../lib/supabase'
import { cn } from '../lib/utils'
import { useFinanceStore } from '../store/finance-store'

const navItems = [
  { to: '/', label: 'Overview', icon: Home },
  { to: '/income', label: 'Income', icon: WalletCards },
  { to: '/expenses', label: 'Expenses', icon: ReceiptText },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/tags', label: 'Tags', icon: Tags },
]

export function AppLayout() {
  const isSaving = useFinanceStore(state => state.isSaving)
  const setupComplete = useFinanceStore((state) => state.setupComplete)
  const saveError = useFinanceStore((state) => state.error)
  const clearFeedback = useFinanceStore((state) => state.clearFeedback)

  return (
    <div className="min-h-screen overflow-x-hidden bg-[linear-gradient(135deg,#f8fafc_0%,#eef2ff_36%,#fff7ed_100%)] text-zinc-950">
      <a className="fixed left-3 top-3 z-[60] -translate-y-24 rounded-xl bg-zinc-950 px-4 py-3 text-sm font-semibold text-white shadow-xl transition focus:translate-y-0" href="#main-content">Skip to content</a>
      <div className="pointer-events-none fixed -right-32 top-12 h-72 w-72 rounded-full bg-cyan-300/25 blur-3xl animate-float-slow sm:h-80 sm:w-80" />
      <div className="pointer-events-none fixed -bottom-28 left-8 h-72 w-72 rounded-full bg-rose-300/20 blur-3xl animate-float-slow stagger-2 sm:left-52 sm:h-96 sm:w-96" />
      <div className="pointer-events-none fixed left-1/3 top-1/4 hidden h-72 w-72 rounded-full bg-violet-300/20 blur-3xl animate-float-slow stagger-3 sm:block" />

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-white/60 bg-white/65 p-5 shadow-2xl shadow-zinc-900/10 backdrop-blur-2xl lg:flex lg:flex-col lg:overflow-y-auto">
        <div className="mb-8 overflow-hidden rounded-[2rem] bg-zinc-950 p-5 text-white shadow-2xl shadow-zinc-950/25">
          <div className="pointer-events-none absolute -ml-8 -mt-8 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
          <img src="/brand/ledger-logo.svg" alt="expenses-app" width="420" height="80" className="relative mb-3 w-full rounded-xl" />
          <p className="relative mt-1 text-sm leading-6 text-zinc-300">Professional cashflow workspace for income, bills, and spending.</p>
        </div>
        <nav className="space-y-1" aria-label="Primary navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'nav-item group flex min-h-12 items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-zinc-600 transition-[transform,background-color,color,box-shadow] duration-300 hover:-translate-y-0.5 hover:bg-white/90 hover:text-zinc-950 hover:shadow-lg hover:shadow-zinc-900/5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-zinc-300',
                  isActive && 'bg-zinc-950 text-white shadow-xl shadow-zinc-900/15 ring-1 ring-zinc-900/5 hover:bg-zinc-950 hover:text-white',
                )
              }
            >
              <span className="nav-icon flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 transition duration-300 group-hover:bg-white group-hover:text-zinc-950">
                <item.icon className="h-4 w-4" />
              </span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto pt-6">
          <button type="button" onClick={() => void supabase.auth.signOut()} className="mb-3 flex min-h-12 w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-zinc-600 transition hover:bg-white hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-zinc-300"><LogOut className="h-5 w-5" />Sign out</button>
        <div className="rounded-3xl border border-emerald-200/70 bg-emerald-50/80 p-4 shadow-lg shadow-emerald-900/5">
          <p className="text-sm font-semibold text-emerald-950">Your data</p>
          <p className="mt-1 text-xs leading-5 text-emerald-800">Track income, upcoming bills, and spending in one place.</p>
        </div>
        </div>
      </aside>

      <div className="relative z-0 min-w-0 lg:pl-72">
        <header className="sticky top-0 z-30 px-3 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-4 lg:px-8">
          <div className="mx-auto flex max-w-7xl items-center gap-2 rounded-[1.35rem] border border-white/80 bg-white/55 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_18px_55px_-30px_rgba(15,23,42,0.5)] backdrop-blur-2xl sm:grid sm:grid-cols-[1fr_auto_1fr] sm:px-3">
            <img src="/brand/ledger-icon.svg" alt="expenses-app" className="h-9 w-9 shrink-0 sm:justify-self-start" />
            <MonthSwitcher />
          </div>
        </header>
        <main id="main-content" className="mx-auto max-w-7xl px-3 py-5 pb-28 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
          {saveError ? <div className="mb-5 flex items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800" role="alert"><span>{saveError}</span><button className="shrink-0 underline underline-offset-2" type="button" onClick={clearFeedback}>Dismiss</button></div> : null}
          {isSaving ? <p role="status" className="mb-4 text-sm text-zinc-600">Saving your changes…</p> : null}
          <BrowserImport />
          <Outlet />
        </main>
      </div>
      <nav className="mobile-nav-enter fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t border-zinc-200/80 bg-white/95 px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-16px_50px_-28px_rgba(15,23,42,0.45)] backdrop-blur-xl lg:hidden" aria-label="Primary navigation">
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => cn('flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-xs font-semibold text-zinc-500 transition-[transform,background-color,color] duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-400', isActive && 'bg-zinc-950 text-white shadow-lg shadow-zinc-950/15')}>
            <item.icon className="nav-icon h-5 w-5 transition duration-300" />{item.label}
          </NavLink>
        ))}
        <button type="button" onClick={() => void supabase.auth.signOut()} className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-xs font-semibold text-zinc-500 transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-400"><LogOut className="h-5 w-5" />Sign out</button>
      </nav>
      {!setupComplete ? <SetupWizard onDone={() => {}} /> : null}
    </div>
  )
}
