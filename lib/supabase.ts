import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
export const isSupabaseConfigured = Boolean(url && key && URL.canParse(url) && /^https?:$/.test(new URL(url).protocol))

// Keep public pages renderable before the environment has been connected.
export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(url!, key!)
  : new Proxy({} as SupabaseClient, {
      get() { throw new Error('Supabase doit être configuré avant cette opération.') },
    })
