'use client'

import { supabase } from './supabase'

/* 🔹 Créer un projet */
export async function saveProject(slug: string, title: string) {
  const { error } = await supabase
    .from('projects')
    .insert([{ slug, title }])

  if (error) {
    console.error('Erreur saveProject:', error)
    throw error
  }

  return { success: true }
}

/* 🔹 Créer ou mettre à jour le setup */
export async function saveSetup(slug: string, image: string, rows: number, cols: number) {
  const { error } = await supabase
    .from('setups')
    .upsert([{ project_slug: slug, image, rows, cols }])

  if (error) {
    console.error('Erreur saveSetup:', error)
    throw error
  }

  return { success: true }
}

/* 🔹 Uploader une image dans Supabase Storage */
export async function uploadImage(base64: string, slug: string): Promise<string> {
  const fileName = `${slug}-${Date.now()}.jpg`
  const response = await fetch(base64)
  if (!response.ok) throw new Error('Image illisible')
  const fileBuffer = await response.blob()

  const { error: uploadError } = await supabase.storage
    .from('tiles')
    .upload(fileName, fileBuffer, {
      contentType: 'image/jpeg',
      upsert: false,
    })

  if (uploadError) {
    console.error('Erreur uploadImage:', uploadError)
    throw uploadError
  }

  const { data: publicUrl } = supabase.storage.from('tiles').getPublicUrl(fileName)
  return publicUrl.publicUrl
}

/* 🔹 Enregistrer une tuile */
export async function saveTile(
  slug: string,
  row: number,
  col: number,
  imageUrl: string
) {
  const { error } = await supabase
    .from('tiles')
    .insert([{ project_slug: slug, row, col, image_url: imageUrl }])

  if (error) {
    console.error('Erreur saveTile:', error)
    throw error
  }

  return { success: true }
}

/* 🔹 Charger toutes les tuiles pour un projet */
export async function loadTiles(slug: string) {
  const { data, error } = await supabase
    .from('tiles')
    .select('*')
    .eq('project_slug', slug)

  if (error) {
    console.error('Erreur loadTiles:', error)
    throw error
  }

  return data || []
}

/* 🔹 Supprimer toutes les tuiles d’un projet */
export async function clearTiles(slug: string) {
  const { error } = await supabase
    .from('tiles')
    .delete()
    .eq('project_slug', slug)

  if (error) {
    console.error('Erreur clearTiles:', error)
    throw error
  }

  return { success: true }
}

/* 🔹 Récupérer un projet */
export async function getProject(slug: string) {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error) {
    console.error('Erreur getProject:', error)
    throw error
  }

  return data
}

/* 🔹 Mettre à jour un projet */
export async function updateProject(
  slug: string,
  updates: Partial<{ image: string; rows: number; cols: number }>
) {
  const { error, data } = await supabase
    .from('projects')
    .update(updates)
    .eq('slug', slug)

  if (error) {
    console.error('Erreur updateProject:', error.message, error.details, error)
    throw error
  }

  console.log('✅ Projet mis à jour:', data)
  return { success: true }
}

/* 🔹 Supprimer une image du storage Supabase */
export async function deleteImage(imageUrl: string) {
  try {
    const urlParts = imageUrl.split('/')
    const fileName = urlParts[urlParts.length - 1]

    const { error } = await supabase.storage
      .from('tiles')
      .remove([fileName])

    if (error) {
      console.error('Erreur deleteImage:', error)
      throw error
    }

    return { success: true }
  } catch (err) {
    console.error('Erreur traitement deleteImage:', err)
    throw err
  }
}

/* 🔹 Supprimer une seule tuile */
export async function deleteTileById(tileId: string) {
  const { error } = await supabase
    .from('tiles')
    .delete()
    .eq('id', tileId)

  if (error) {
    console.error('Erreur deleteTileById:', error)
    throw error
  }

  return { success: true }
}
