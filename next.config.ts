import type { NextConfig } from 'next'
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const remotePatterns: NonNullable<NonNullable<NextConfig['images']>['remotePatterns']> = [
  { protocol: 'https', hostname: 'icchwywclqqoxshugiog.supabase.co', pathname: '/storage/v1/object/public/**' },
]
if (supabaseUrl && URL.canParse(supabaseUrl)) {
  const url = new URL(supabaseUrl)
  if (url.protocol === 'https:' || url.protocol === 'http:') {
    remotePatterns.push({ protocol: url.protocol === 'https:' ? 'https' : 'http', hostname: url.hostname, port: url.port, pathname: '/storage/v1/object/public/**' })
  }
}
const config: NextConfig = { reactStrictMode: true, images: { remotePatterns } }
export default config
