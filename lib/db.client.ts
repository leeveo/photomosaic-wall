'use client'

import { supabase } from './supabase'
import { resolveMedia, mediaLocation } from './media'

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

/* 🔹 Charger toutes les tuiles pour un projet */
export async function loadTiles(slug: string) {
  const all = []
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from('tiles').select('*').eq('project_slug', slug).eq('moderation_status', 'approved').order('created_at').order('id').range(offset, offset + 499)
    if (error) throw error
    all.push(...await Promise.all((data || []).map(async tile => ({ ...tile, image_url: await resolveMedia(tile.image_url) }))))
    if (!data || data.length < 500) break
  }
  return all
}

export type TileReservation = { id: string; row: number; col: number; path: string }
export async function reserveTile(slug: string): Promise<TileReservation> {
  const { data, error } = await supabase.rpc('reserve_tile', { p_slug: slug })
  if (error) throw error
  return data
}
export async function submitReservedTile(reservation: TileReservation, image: string) {
  const file = await (await fetch(image)).blob()
  const uploaded = await supabase.storage.from('tiles').upload(reservation.path, file, { contentType: 'image/jpeg', upsert: false })
  if (uploaded.error && uploaded.error.message !== 'The resource already exists') throw uploaded.error
  const { data, error } = await supabase.rpc('commit_tile', { p_reservation: reservation.id })
  if (error) throw error
  return { ...data, image_url: await resolveMedia(data.image_url).catch(() => '') }
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
    const location = mediaLocation(imageUrl)
    if (!location) throw new Error('Storage path unavailable')
    const fileName = location.path

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
