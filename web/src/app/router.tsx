import { createBrowserRouter } from 'react-router'
import { AppLayout } from '../layouts/app-layout'
import { Link } from 'react-router'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, lazy: async () => ({ Component: (await import('../pages/overview-page')).OverviewPage }) },
      { path: 'income', lazy: async () => ({ Component: (await import('../pages/income-page')).IncomePage }) },
      { path: 'expenses', lazy: async () => ({ Component: (await import('../pages/expenses-page')).ExpensesPage }) },
      { path: 'calendar', lazy: async () => ({ Component: (await import('../pages/calendar-page')).CalendarPage }) },
      { path: 'tags', lazy: async () => ({ Component: (await import('../pages/tags-page')).TagsPage }) },
      { path: '*', element: <div className="page-shell py-20 text-center sm:py-24"><h1 className="page-title font-semibold">Page not found</h1><p className="mt-2 text-sm text-zinc-500 sm:text-base">The page you requested does not exist.</p><Link className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-zinc-300" to="/">Return to overview</Link></div> },
    ],
  },
])
