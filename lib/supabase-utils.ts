import { supabase } from './supabase'

export async function uploadImage(base64Data: string, slug: string) {
  const fileName = `${slug}/${Date.now()}.jpg`

  const response = await fetch(base64Data)
  if (!response.ok) throw new Error('Image illisible')
  const buffer = await response.blob()

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
