import { supabase } from './supabase'
export async function ensureEventAccess(slug: string) {
  let { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    const { data, error } = await supabase.auth.signInAnonymously()
    if (error) throw error
    session = data.session
  }
  if (!session) throw new Error('Session unavailable')
  if (!session.user.is_anonymous) {
    const { data } = await supabase.from('projects').select('slug').eq('slug', slug).maybeSingle()
    if (data) return
  }
  const token = new URLSearchParams(window.location.hash.slice(1)).get('access')
  if (!token) throw new Error('Invitation required')
  const { error } = await supabase.rpc('join_event', { p_slug: slug, p_token: token })
  if (error) throw error
}
export function invitationPath(page: 'photo' | 'mosaic', slug: string, token: string) {
  return `/${page}?id=${encodeURIComponent(slug)}#access=${encodeURIComponent(token)}`
}
