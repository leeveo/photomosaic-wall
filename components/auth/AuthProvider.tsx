'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { usePhotoMosaicStore } from '@/lib/store'
import type { Session } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'

type Subscription = { status: string; current_period_end: string | null }
type AuthState = { active: boolean; session: Session | null; subscription: Subscription | null; loading: boolean; error: string | null; refresh: () => Promise<void> }
const AuthContext = createContext<AuthState>({ active: false, session: null, subscription: null, loading: true, error: null, refresh: async () => {} })
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [now, setNow] = useState(() => Date.now())
  const [subscriptionOwner, setSubscriptionOwner] = useState<string | null>(null)
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(timer) }, [])
  const [session, setSession] = useState<Session | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!isSupabaseConfigured) return
    const { data } = supabase.auth.onAuthStateChange((_event, value) => {
      if (_event === 'SIGNED_OUT') usePhotoMosaicStore.setState({ imageSrc: null, rows: 5, cols: 8 })
      setSession(value)
      setLoading(false)
    })
    return () => data.subscription.unsubscribe()
  }, [])
  const userId = session?.user.is_anonymous ? undefined : session?.user.id
  const refresh = useCallback(async () => {
    if (!userId) return
    const { data, error: failure } = await supabase.from('subscriptions').select('status,current_period_end').eq('user_id', userId).maybeSingle()
    setSubscriptionOwner(userId)
    if (failure) { setError('subscription'); setSubscription(null) }
    else { setSubscription(data); setError(null) }
  }, [userId])
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    supabase.from('subscriptions').select('status,current_period_end').eq('user_id', userId).maybeSingle().then(({ data, error }) => {
      if (!cancelled) { setSubscriptionOwner(userId); setSubscription(data); setError(error ? 'subscription' : null) }
    })
    return () => { cancelled = true }
  }, [userId])
  const current = userId && subscriptionOwner === userId ? subscription : null
  const active = Boolean(current?.status === 'active' && current.current_period_end && Date.parse(current.current_period_end) > now)
  return <AuthContext.Provider value={{ active, session, subscription: current, loading: loading || Boolean(userId && subscriptionOwner !== userId), error, refresh }}>{children}</AuthContext.Provider>
}
export const useAuth = () => useContext(AuthContext)
