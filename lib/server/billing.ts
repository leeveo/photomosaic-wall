import 'server-only'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('Billing is not configured')
  return new Stripe(key)
}
export function serviceDatabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Backend is not configured')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}
export function siteOrigin() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL
  if (!configured) throw new Error('Site URL missing')
  const url = new URL(configured)
  if (url.protocol !== 'https:' && url.hostname !== 'localhost') throw new Error('Secure site URL required')
  return url.origin
}
export async function billingUser(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1]
  if (!token) return null
  const { data, error } = await serviceDatabase().auth.getUser(token)
  if (error || !data.user || data.user.is_anonymous || !data.user.email_confirmed_at) return null
  return data.user
}
