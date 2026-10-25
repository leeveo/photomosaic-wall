import { useLanguage } from '@/components/LanguageProvider'
import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { resolveMedia } from '@/lib/media'
import { zipSync } from 'fflate'

type Tile = {
  moderation_status?: string
  id: string
  image_url: string
  row: number
  col: number
  project_slug: string
}

type MosaicMeta = {
  slug: string
  title: string
  createdAt: string
  hasImage: boolean
  setupImage?: string | null
  rows: number
  cols: number
  tilesCount: number
  eventDate?: string
}

type Props = {
  tiles: Tile[]
  projects: MosaicMeta[]
  selectedProject: string
  setSelectedProject: (value: string) => void
  setTiles: (tiles: Tile[]) => void
  setTileToDelete: (tile: { id: string; url: string } | null) => void
  setShowDeleteModal: (value: boolean) => void
  showDeleteModal: boolean
  tileToDelete: { id: string; url: string } | null
  deleteTile: (tileId: string, imageUrl: string) => Promise<void>
}

export default function PhotosTab({ projects, selectedProject, setSelectedProject, deleteTile }: Props) {
  const { language } = useLanguage()
  const tr = (fr: string, en: string) => language === 'fr' ? fr : en
  const [photos, setPhotos] = useState<Tile[]>([])
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState('all')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase.from('tiles').select('*', { count: 'exact' }).order('created_at', { ascending: false }).order('id').range(page * 48, page * 48 + 47)
      if (selectedProject !== 'all') query = query.eq('project_slug', selectedProject)
      if (status !== 'all') query = query.eq('moderation_status', status)
      const { data, count, error } = await query
      if (error) throw error
      const signed = await Promise.all((data || []).map(async tile => ({ ...tile, image_url: await resolveMedia(tile.image_url) })))
      setPhotos(signed); setTotal(count || 0); setMessage('')
    } catch { setMessage(language === 'fr' ? 'Impossible de charger les photos.' : 'Unable to load photos.') }
    finally { setLoading(false) }
  }, [page, selectedProject, status, language])
  useEffect(() => { const timer = setTimeout(() => void refresh(), 0); return () => clearTimeout(timer) }, [refresh])
  const moderate = async (tile: Tile, value: string) => {
    setBusy(true)
    try { const { error } = await supabase.from('tiles').update({ moderation_status: value }).eq('id', tile.id); if (error) throw error; await refresh() }
    catch { setMessage(tr('Modification impossible.', 'Unable to save changes.')) }
    finally { setBusy(false) }
  }
  const exportPage = async () => {
    setBusy(true)
    try {
      const files: Record<string, Uint8Array> = {}
      for (const tile of photos) { const result = await fetch(tile.image_url); if (!result.ok) throw new Error(); files[`${tile.project_slug}/${tile.row}-${tile.col}-${tile.id}.jpg`] = new Uint8Array(await result.arrayBuffer()) }
      const bytes = zipSync(files, { level: 0 })
      const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'application/zip' }))
      const link = document.createElement('a'); link.href = url; link.download = `photomosaic-page-${page + 1}.zip`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch { setMessage(tr('Export impossible. Actualisez les photos et réessayez.', 'Export failed. Refresh photos and try again.')) }
    finally { setBusy(false) }
  }
  return <section><div className="event-tools"><label>{tr('Événement', 'Event')}<select value={selectedProject} onChange={e => { setPage(0); setSelectedProject(e.target.value) }}><option value="all">{tr('Tous mes événements', 'All my events')}</option>{projects.map(p => <option key={p.slug} value={p.slug}>{p.title}</option>)}</select></label><label>{tr('Statut', 'Status')}<select value={status} onChange={e => { setPage(0); setStatus(e.target.value) }}>{[['all',tr('Toutes','All')],['pending',tr('À valider','Pending')],['approved',tr('Approuvées','Approved')],['rejected',tr('Refusées','Rejected')]].map(([id,label]) => <option key={id} value={id}>{label}</option>)}</select></label><button onClick={() => void refresh()} disabled={loading}>{tr('Actualiser','Refresh')}</button><button disabled={busy || loading || !photos.length} onClick={() => void exportPage()}>{tr('Exporter cette page (ZIP)','Export this page (ZIP)')}</button></div><p role="status">{message || (loading ? tr('Chargement…','Loading…') : `${total} photos`)}</p><div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4">{photos.map(tile => <article key={tile.id}><Image unoptimized width={300} height={300} src={tile.image_url} alt={`${tile.project_slug} ${tile.row + 1}-${tile.col + 1}`} className="w-full aspect-square object-cover rounded-xl" /><div className="event-tools"><span>{tile.row + 1} / {tile.col + 1}</span><button disabled={busy || tile.moderation_status === 'approved'} onClick={() => void moderate(tile, 'approved')}>{tr('Approuver','Approve')}</button><button disabled={busy || tile.moderation_status === 'rejected'} onClick={() => void moderate(tile, 'rejected')}>{tr('Refuser','Reject')}</button><button disabled={busy} onClick={async () => { if (!window.confirm(tr('Supprimer cette photo ?','Delete this photo?'))) return; setBusy(true); try { await deleteTile(tile.id, tile.image_url); await refresh() } catch { setMessage(tr('Suppression impossible.','Unable to delete photo.')) } finally { setBusy(false) } }}>{tr('Supprimer','Delete')}</button></div></article>)}</div><div className="event-tools"><button disabled={page === 0 || loading} onClick={() => setPage(p => p - 1)}>{tr('Précédent','Previous')}</button><span>{page + 1} / {Math.max(1,Math.ceil(total / 48))}</span><button disabled={(page + 1) * 48 >= total || loading} onClick={() => setPage(p => p + 1)}>{tr('Suivant','Next')}</button></div></section>
}
