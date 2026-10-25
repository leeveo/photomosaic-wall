import { supabase } from './supabase'

export function mediaLocation(value: string): { bucket: string; path: string } | null {
  if (value.startsWith('storage://')) {
    const [bucket, ...parts] = value.slice(10).split('/')
    return ['tiles','backgrounds'].includes(bucket) && parts.length ? { bucket, path: parts.join('/') } : null
  }
  const configured = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (configured && URL.canParse(value) && new URL(value).origin === new URL(configured).origin) {
    const match = new URL(value).pathname.match(/^\/storage\/v1\/object\/(?:public|sign)\/(tiles|backgrounds)\/(.+)$/)
    if (match) return { bucket: match[1], path: decodeURIComponent(match[2]) }
  }
  return null
}
export async function resolveMedia(value: string | null | undefined): Promise<string> {
  if (!value) return ''
  const location = mediaLocation(value)
  if (!location) return value
  const { data, error } = await supabase.storage.from(location.bucket).createSignedUrl(location.path, 3600)
  if (error) throw error
  return data.signedUrl
}
export async function uploadBackground(value: string): Promise<string> {
  if (!value.startsWith('data:image/')) return value
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user || data.user.is_anonymous) throw new Error('Authentication required')
  const image = await (await fetch(value)).blob()
  if (image.size > 10 * 1024 * 1024) throw new Error('Image exceeds 10 MB')
  const path = `${data.user.id}/${crypto.randomUUID()}.jpg`
  const uploaded = await supabase.storage.from('backgrounds').upload(path, image, { contentType: image.type, upsert: false })
  if (uploaded.error) throw uploaded.error
  return `storage://backgrounds/${path}`
}
