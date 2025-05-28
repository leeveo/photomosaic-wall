import { supabase } from './supabase'

export async function uploadImage(base64Data: string, slug: string) {
  const fileName = `${slug}/${Date.now()}.jpg`

  const base64 = base64Data.split(',')[1]
  const buffer = Buffer.from(base64, 'base64')

  const { error } = await supabase.storage
    .from('tiles')
    .upload(fileName, buffer, {
      contentType: 'image/jpeg',
      upsert: false
    })

  if (error) throw error

  const { data } = supabase.storage.from('tiles').getPublicUrl(fileName)
  return data.publicUrl
}
