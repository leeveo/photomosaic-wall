'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { loadTiles, clearTiles } from '@/lib/db.client'
import { supabase } from '@/lib/supabase'

type MosaicMeta = {
  slug: string
  title: string
  createdAt: string
  hasImage: boolean
  rows: number
  cols: number
  tilesCount: number
}

export default function AdminPage() {
  const [projects, setProjects] = useState<MosaicMeta[]>([])
  const [expanded, setExpanded] = useState<Record<string, any[]>>({})
  const router = useRouter()

  useEffect(() => {
    const fetchProjects = async () => {
      const { data: projects, error: errProjects } = await supabase
        .from('projects')
        .select('slug, title, created_at')

      if (errProjects || !projects) {
        console.error('Erreur chargement projets:', errProjects)
        return
      }

      const metas: MosaicMeta[] = []

      for (const project of projects) {
        const { data: setup } = await supabase
          .from('setups')
          .select('rows, cols, image')
          .eq('project_slug', project.slug)
          .single()

        const tiles = await loadTiles(project.slug)

        metas.push({
          slug: project.slug,
          title: project.title,
          createdAt: project.created_at,
          hasImage: !!setup?.image,
          rows: setup?.rows || 0,
          cols: setup?.cols || 0,
          tilesCount: tiles.length,
        })
      }

      setProjects(metas)
    }

    fetchProjects()
  }, [])

  const handleDeleteProject = async (slug: string) => {
    if (!confirm(`Supprimer le projet "${slug}" ?`)) return
    await clearTiles(slug)
    await supabase.from('setups').delete().eq('project_slug', slug)
    await supabase.from('projects').delete().eq('slug', slug)
    setProjects(prev => prev.filter(p => p.slug !== slug))
  }

  const handleResetTiles = async (slug: string, title: string) => {
    const confirmReset = confirm(`Effacer toutes les photos de "${title}" ?`)
    if (!confirmReset) return

    await clearTiles(slug)
    alert('Mosaïque réinitialisée.')
    setExpanded(prev => ({ ...prev, [slug]: [] }))
    setProjects(prev =>
      prev.map(p =>
        p.slug === slug ? { ...p, tilesCount: 0 } : p
      )
    )
  }

  const toggleDetails = async (slug: string) => {
    if (expanded[slug]) {
      setExpanded(prev => {
        const newExpanded = { ...prev }
        delete newExpanded[slug]
        return newExpanded
      })
    } else {
      const tiles = await loadTiles(slug)
      setExpanded(prev => ({ ...prev, [slug]: tiles }))
    }
  }

  const deleteTile = async (tileId: string, imageUrl: string, slug: string) => {
    if (!confirm('Supprimer cette image ?')) return

    // Supprime de la table
    await supabase.from('tiles').delete().eq('id', tileId)

    // Supprime du storage
    if (imageUrl) {
      const fileName = imageUrl.split('/').pop()
      if (fileName) {
        await supabase.storage.from('tiles').remove([fileName])
      }
    }

    // Recharge les données
    const tiles = await loadTiles(slug)
    setExpanded(prev => ({ ...prev, [slug]: tiles }))
    setProjects(prev =>
      prev.map(p =>
        p.slug === slug ? { ...p, tilesCount: tiles.length } : p
      )
    )
  }

  const handleNew = async () => {
    const title = prompt('Nom du nouveau projet :')
    if (!title) return
    const slug = title.toLowerCase().replace(/\s+/g, '-')

    const { data: existing } = await supabase.from('projects').select().eq('slug', slug).single()
    if (existing) {
      alert('Ce projet existe déjà.')
      return
    }

    const { error } = await supabase.from('projects').insert([{ slug, title }])
    if (error) {
      alert('Erreur création projet')
      return
    }

    router.push(`/setup?id=${slug}`)
  }

  return (
    <main style={{ padding: 32 }}>
      <h1>🗂️ Mes mosaïques</h1>

      <button onClick={handleNew} style={{ marginBottom: 24, padding: '1rem 2rem' }}>
        ➕ Nouveau projet
      </button>

      {projects.length === 0 ? (
        <p>Aucun projet enregistré.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {projects.map((project) => (
            <li key={project.slug} style={{
              padding: '1rem',
              border: '1px solid #ccc',
              marginBottom: 12,
              borderRadius: 6
            }}>
              <strong>{project.title}</strong><br />
              <small>Créé le : {new Date(project.createdAt).toLocaleString()}</small><br />

              {project.hasImage && (
                <div style={{ fontSize: '14px', marginTop: 6 }}>
                  <p>
                    📐 Total : <strong>{project.rows * project.cols}</strong> &nbsp;|&nbsp;
                    ✅ Remplies : <strong>{project.tilesCount}</strong> &nbsp;|&nbsp;
                    🕳️ Restantes : <strong>{(project.rows * project.cols) - (project.tilesCount || 0)}</strong>
                  </p>
                  <p style={{ marginTop: 4 }}>
                    🧩 Progression : <strong>{project.tilesCount} / {project.rows * project.cols}</strong> (
                    <strong>{Math.round((project.tilesCount / (project.rows * project.cols)) * 100)}%</strong>)
                  </p>
                </div>
              )}

              <div style={{ marginTop: 12 }}>
                <button onClick={() => router.push(`/setup?id=${project.slug}`)} style={{ marginRight: 12 }}>
                  🛠️ Configurer
                </button>
                {project.hasImage && (
                  <>
                    <button onClick={() => router.push(`/photo?id=${project.slug}`)} style={{ marginRight: 12 }}>
                      📸 Prendre les photos
                    </button>
                    <button onClick={() => window.open(`/mosaic?id=${project.slug}`, '_blank')} style={{ marginRight: 12 }}>
                      🖼️ Afficher la mosaïque
                    </button>
                    <button onClick={() => handleResetTiles(project.slug, project.title)} style={{
                      backgroundColor: '#ffe5e5',
                      border: '1px solid red',
                      color: '#900',
                      marginRight: 12
                    }}>
                      🧹 Réinitialiser
                    </button>
                    <button onClick={() => toggleDetails(project.slug)} style={{ marginRight: 12 }}>
                      📂 Voir les photos
                    </button>
                  </>
                )}
                <button onClick={() => handleDeleteProject(project.slug)} style={{ color: 'red' }}>
                  🗑️ Supprimer le projet
                </button>
              </div>

              {expanded[project.slug] && (
                <div style={{ marginTop: 12 }}>
                  <ul style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                    {expanded[project.slug].map(tile => (
                      <li key={tile.id} style={{ position: 'relative', width: 100 }}>
                        <img src={tile.image_url} alt="" width={100} height={100} style={{ border: '1px solid #ccc' }} />
                        <div style={{
                          position: 'absolute', top: 2, right: 2,
                          backgroundColor: '#fff', padding: '2px 6px',
                          fontSize: 12, borderRadius: 4, border: '1px solid #ccc'
                        }}>
                          {String.fromCharCode(65 + tile.row)}-{tile.col + 1}
                        </div>
                        <button
                          onClick={() => deleteTile(tile.id, tile.image_url, project.slug)}
                          style={{
                            position: 'absolute',
                            top: 2,
                            left: 2,
                            backgroundColor: 'red',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 3,
                            cursor: 'pointer',
                            fontSize: 12
                          }}
                        >
                          ❌
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
