import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { LockKeyhole } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useFinanceStore } from '../store/finance-store'
import { Button } from './ui/button'
import { Input } from './ui/input'

export function AuthGate({ children }: { children: ReactNode }) {
  const sessionUserId = useRef<string | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [authError, setAuthError] = useState('')
  const isInitialized = useFinanceStore((state) => state.isInitialized)
  const initializedUserId = useFinanceStore((state) => state.initializedUserId)
  const isFinanceLoading = useFinanceStore((state) => state.isLoading)
  const financeError = useFinanceStore((state) => state.error)
  const loadFinanceData = useFinanceStore((state) => state.loadFinanceData)
  const clearFinanceData = useFinanceStore((state) => state.clearFinanceData)
  const clearFeedback = useFinanceStore((state) => state.clearFeedback)

  useEffect(() => {
    let active = true
    let authEventReceived = false
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active || authEventReceived) return
      if (error) setAuthError(error.message)
      sessionUserId.current = data.session?.user.id ?? null
      setSession(data.session)
      setCheckingSession(false)
    })
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      authEventReceived = true
      const currentUserId = sessionUserId.current ?? useFinanceStore.getState().initializedUserId
      sessionUserId.current = nextSession?.user.id ?? null
      if (currentUserId && currentUserId !== nextSession?.user.id) clearFinanceData()
      setSession(nextSession)
      setCheckingSession(false)
      if (!nextSession) clearFinanceData()
    })

    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [clearFinanceData])

  useEffect(() => {
    if (session && initializedUserId !== session.user.id && !isFinanceLoading && !financeError) void loadFinanceData()
  }, [financeError, initializedUserId, isFinanceLoading, loadFinanceData, session])

  const signIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setAuthError('')
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) setAuthError(error.message)
    setSubmitting(false)
  }

  const ownsFinanceData = isInitialized && initializedUserId === session?.user.id

  if (checkingSession || (session && !ownsFinanceData && !financeError)) {
    return <LoadingScreen />
  }

  if (session && !ownsFinanceData && financeError) {
    return <LoadErrorScreen message={financeError} onRetry={() => { clearFeedback(); void loadFinanceData() }} />
  }

  if (!session) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 p-4 text-white sm:p-8">
        <div className="pointer-events-none absolute -right-24 top-0 h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-sky-400/15 blur-3xl" />
        <div className="animate-soft-scale relative w-full max-w-md rounded-[2rem] border border-white/10 bg-white/10 p-5 shadow-2xl backdrop-blur-2xl sm:p-8">
          <img src="/brand/ledger-logo.svg" alt="expenses-app" width="420" height="80" className="w-64 max-w-full rounded-2xl" />
          <p className="mt-8 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">Private cashflow</p>
          <h1 className="page-title mt-3 font-semibold">Welcome back.</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-300">Sign in to access income, bills, and expenses stored securely in your workspace.</p>
          <form className="mt-7 grid gap-4" onSubmit={signIn}>
            <div>
              <label className="mb-1.5 block text-sm font-semibold" htmlFor="login-email">Email</label>
              <Input id="login-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold" htmlFor="login-password">Password</label>
              <Input id="login-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            </div>
            {authError ? <p className="rounded-2xl bg-red-400/15 px-4 py-3 text-sm font-medium text-red-200" role="alert">{authError}</p> : null}
            <Button className="mt-1 w-full bg-white text-zinc-950 hover:bg-zinc-100" type="submit" disabled={submitting}>
              <LockKeyhole className="mr-2 h-4 w-4" />{submitting ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
          <p className="mt-6 text-center text-xs leading-5 text-zinc-400">Accounts are currently created by the workspace administrator.</p>
        </div>
      </main>
    )
  }

  return children
}

function LoadingScreen() {
  return <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white"><div className="text-center"><span className="mx-auto block h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" /><p className="mt-4 text-sm text-zinc-300">Loading your workspace...</p></div></div>
}

function LoadErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4 text-white"><div className="max-w-md rounded-[2rem] border border-red-300/20 bg-white/10 p-6 text-center shadow-2xl"><h1 className="text-xl font-semibold">Could not load your workspace</h1><p className="mt-3 text-sm leading-6 text-zinc-300">{message}</p><Button className="mt-6 bg-white text-zinc-950 hover:bg-zinc-100" onClick={onRetry}>Try again</Button></div></div>
}
