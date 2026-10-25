'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { FiGrid, FiImage, FiBarChart2, FiPlus, FiCamera, FiEdit3, FiArrowUpRight, FiSearch, FiMenu, FiX, FiArrowLeft, FiLayers } from 'react-icons/fi'
import Brand from '@/components/Brand'
import { resolveMedia, mediaLocation } from '@/lib/media'
import { invitationPath } from '@/lib/guest'
import AccessGate from '@/components/auth/AccessGate'
import { databaseErrorMessage } from '@/lib/database-errors'
import { LanguageSwitch, useLanguage } from '@/components/LanguageProvider'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import EnvironmentGate from '@/components/EnvironmentGate'
import CreateProject from '@/components/CreateProject'
import PhotosTab from '@/components/PhotosTab'
import FlyerGenerator from '@/components/FlyerGenerator'
import PhotoBoothCustomizer from '@/components/PhotoBoothCustomizer'

type Tab = 'projects' | 'setup' | 'photos' | 'stats' | 'flyer' | 'design'
type Tile = { id: string; image_url: string; row: number; col: number; project_slug: string }
type Project = { status: string; guestToken: string; moderation: boolean; slug: string; title: string; createdAt: string; hasImage: boolean; setupImage: string | null; rows: number; cols: number; tilesCount: number; eventDate?: string }
const navigation: { id: Tab; label: string; icon: typeof FiGrid }[] = [
  { id: 'projects', label: 'Vue d’ensemble', icon: FiGrid },
  { id: 'photos', label: 'Photos', icon: FiImage },
  { id: 'stats', label: 'Statistiques', icon: FiBarChart2 },
  { id: 'setup', label: 'Créer un événement', icon: FiPlus },
  { id: 'flyer', label: 'Flyers & QR codes', icon: FiCamera },
  { id: 'design', label: 'Personnalisation', icon: FiEdit3 },
]

function AdminWorkspace() {
  const { t, language } = useLanguage()
  const [activeTab, setActiveTab] = useState<Tab>('projects')
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [projects, setProjects] = useState<Project[]>([])
  const [page, setPage] = useState(0)
  const [totals, setTotals] = useState({ total: 0, photos: 0, capacity: 0, completed: 0 })
  const [actionMessage, setActionMessage] = useState('')
  const [tiles, setTiles] = useState<Tile[]>([])
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [error, setError] = useState<string | null>(null)
  const [partialError, setPartialError] = useState<string | null>(null)
  const [selectedProject, setSelectedProject] = useState('all')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [tileToDelete, setTileToDelete] = useState<{ id: string; url: string } | null>(null)
  const load = useCallback(() => {
    if (!isSupabaseConfigured) return Promise.resolve()
    return Promise.resolve(supabase.rpc('list_events', { p_offset: page * 24, p_limit: 24, p_search: query, p_filter: filter })).then(async ({ data, error }) => {
      if (error) throw error
      setTotals({ total: data.total, photos: data.photos, capacity: data.capacity, completed: data.completed })
      let failedMedia = false
      const items: Project[] = await Promise.all(data.items.map(async (event: { slug: string; title: string; created_at: string; status: string; guest_token: string; moderation_enabled: boolean; image: string; rows: number; cols: number; photos_count: number; event_date: string }) => ({
        slug: event.slug, title: event.title, createdAt: event.created_at, status: event.status, guestToken: event.guest_token, moderation: event.moderation_enabled,
        hasImage: Boolean(event.image), setupImage: event.image ? await resolveMedia(event.image).catch(() => { failedMedia = true; return null }) : null,
        rows: event.rows || 0, cols: event.cols || 0, tilesCount: event.photos_count, eventDate: event.event_date,
      })))
      setProjects(items); setError(null); setPartialError(failedMedia ? 'Certaines images sont indisponibles.' : null)
    }).catch(error => setError(databaseErrorMessage(error))).finally(() => setLoading(false))
  }, [page, query, filter])
  useEffect(() => { void load() }, [load])
  useEffect(() => {
    if (!menuOpen) return
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenuOpen(false) }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [menuOpen])
  const navigate = (tab: Tab) => { setActiveTab(tab); setMenuOpen(false); if (tab === 'projects') void load() }
  const deleteTile = async (id: string, url: string) => {
    const result = await supabase.from('tiles').delete().eq('id', id)
    if (result.error) throw result.error
    const location = mediaLocation(url)
    if (location) { const removed = await supabase.storage.from(location.bucket).remove([location.path]); if (removed.error) setActionMessage(language === 'fr' ? 'Photo retirée. Le fichier de stockage nécessite un nettoyage.' : 'Photo removed. The stored file still needs cleanup.') }
    setTiles(previous => previous.filter(tile => tile.id !== id))
  }
  const eventAction = async (project: Project, action: 'duplicate' | 'archive' | 'moderate' | 'share' | 'revoke') => {
    try {
      if (action === 'share') { await navigator.clipboard.writeText(window.location.origin + invitationPath('photo', project.slug, project.guestToken)); setActionMessage(language === 'fr' ? 'Lien d’invitation copié.' : 'Invitation copied.'); return }
      if (action === 'revoke' && !window.confirm(language === 'fr' ? 'Révoquer les anciens liens et QR codes ?' : 'Revoke existing links and QR codes?')) return
      const result = action === 'duplicate'
        ? await supabase.rpc('duplicate_event', { p_slug: project.slug, p_new_slug: `${project.slug.slice(0,60)}-${crypto.randomUUID().slice(0,8)}` })
        : await supabase.from('projects').update(action === 'archive' ? { status: project.status === 'archived' ? 'draft' : 'archived' } : action === 'moderate' ? { moderation_enabled: !project.moderation } : { guest_token: crypto.randomUUID() }).eq('slug', project.slug)
      if (result.error) throw result.error
      setActionMessage(language === 'fr' ? 'Modification enregistrée.' : 'Changes saved.'); await load()
    } catch { setActionMessage(language === 'fr' ? 'Action impossible. Réessayez.' : 'Unable to complete action. Try again.') }
  }
  const filtered = projects
  const locale = language === 'fr' ? 'fr-FR' : 'en-GB'
  const cards = [
    { label: 'Événements', value: totals.total, icon: FiLayers },
    { label: 'Photos collectées', value: totals.photos, icon: FiCamera },
    { label: 'Places disponibles', value: Math.max(0, totals.capacity - totals.photos), icon: FiGrid },
    { label: 'Mosaïques terminées', value: totals.completed, icon: FiBarChart2 },
  ]
  return <div className="studio-app">
    <aside className={`studio-sidebar ${menuOpen ? 'is-open' : ''}`} id="studio-navigation" aria-label={t('Studio événementiel')}>
      <div className="studio-sidebar-brand"><Brand /><button className="studio-menu-close" onClick={() => setMenuOpen(false)} aria-label={t('Fermer le menu')}><FiX /></button></div>
      <span className="studio-nav-caption">WORKSPACE</span>
      <nav>{navigation.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => navigate(id)} aria-current={activeTab === id ? 'page' : undefined}><Icon /><span>{t(label)}</span>{activeTab === id && <i />}</button>)}</nav>
      <div className="studio-sidebar-note"><span className="studio-note-icon"><FiLayers /></span><strong>{t('Votre espace créatif')}</strong><p>{t('Votre prochain souvenir collectif commence ici.')}</p><button onClick={() => navigate('setup')}>{t('Créer un événement')} <FiPlus /></button></div>
      <Link className="studio-back" href="/account">{language === 'fr' ? 'Mon compte & abonnement' : 'Account & billing'}</Link><Link className="studio-back" href="/logout">{language === 'fr' ? 'Déconnexion' : 'Sign out'}</Link><Link className="studio-back" href="/"><FiArrowLeft />{t('Retour au site')}</Link>
    </aside>
    {menuOpen && <button className="studio-menu-shade" aria-label={t('Fermer le menu')} onClick={() => setMenuOpen(false)} />}
    <div className="studio-workspace">
      <header className="studio-topbar"><div className="studio-breadcrumb"><button className="studio-menu-toggle" aria-label={t('Ouvrir le menu')} aria-expanded={menuOpen} aria-controls="studio-navigation" onClick={() => setMenuOpen(!menuOpen)}><FiMenu /></button><span>Studio</span><span>/</span><strong>{t(navigation.find(item => item.id === activeTab)!.label)}</strong></div><LanguageSwitch /></header>
      <main className="studio-main">
        {activeTab === 'projects' ? <>
          <section className="studio-welcome"><div><span className="studio-eyebrow">PHOTOMOSAIC STUDIO</span><h1>{t('Tout commence par un sourire.')}</h1><p>{t('Créez, personnalisez et faites vivre vos événements depuis votre studio.')}</p></div><button className="studio-primary" onClick={() => navigate('setup')}><FiPlus />{t('Créer un événement')}</button></section>
          {!isSupabaseConfigured && <div className="studio-connection"><FiLayers /><div><strong>{t('Connexion à configurer')}</strong><p>{t('Connectez votre espace de stockage pour créer vos événements et retrouver vos photos.')}</p></div></div>}
          <div role="status">{partialError && <p className="wall-error">{t('Vos événements sont affichés, mais certaines configurations ou photos sont indisponibles.')} {t(partialError)}</p>}</div><div className="studio-metrics">{cards.map(({ label, value, icon: Icon }, index) => <article key={label}><div><span>{t(label)}</span><Icon /></div><strong>{isSupabaseConfigured && !loading && !error && !partialError ? value.toLocaleString(locale) : '—'}</strong><span className={`metric-line metric-${index}`} /></article>)}</div>
          <section className="studio-events"><div className="studio-section-title"><div><span className="studio-eyebrow">COLLECTION</span><h2>{t('Vos événements')} <span>{totals.total}</span></h2></div><label className="studio-search"><FiSearch /><input aria-label={t('Rechercher un événement…')} placeholder={t('Rechercher un événement…')} value={query} onChange={e => { setPage(0); setQuery(e.target.value) }} /></label></div>
            <div className="studio-filters">{[['all','Tous'],['active','En cours'],['draft','Brouillons'],['archived','Archivés']].map(([id,label]) => <button key={id} aria-pressed={filter === id} onClick={() => { setPage(0); setFilter(id) }}>{t(label)}</button>)}</div>
            {loading ? <div className="studio-empty" role="status">{t('Chargement de vos événements…')}</div> : error ? <div className="studio-empty" role="alert"><p>{t(error)}</p><button className="studio-primary" onClick={() => void load()}>{t('Réessayer')}</button></div> : filtered.length === 0 ? <div className="studio-empty"><div className="studio-empty-art"><FiLayers /><i /><i /></div><h3>{t(projects.length ? 'Aucun résultat' : 'Aucun événement pour le moment')}</h3><p>{t(projects.length ? 'Essayez un autre nom ou modifiez le filtre.' : 'Créez votre premier mur photo et transformez les moments de vos invités en souvenir collectif.')}</p>{!projects.length && <button className="studio-primary" onClick={() => navigate('setup')}><FiPlus />{t('Créer un événement')}</button>}</div> : <div className="studio-event-grid">{filtered.map(project => {
              const count = project.tilesCount
              const total = project.rows * project.cols
              const progress = total ? Math.min(100, Math.round(count / total * 100)) : 0
              return <article className="studio-event-card" key={project.slug}><div className="studio-event-image" style={project.setupImage ? { backgroundImage: `url(${JSON.stringify(project.setupImage)})` } : undefined}>{!project.setupImage && <FiGrid />}<span>{partialError ? '—' : t(project.status === 'draft' ? 'Brouillons' : project.status === 'archived' ? 'Archivés' : progress === 100 ? 'Terminés' : 'En cours')}</span></div><div className="studio-event-body"><p>{new Date(project.eventDate || project.createdAt).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}</p><h3>{project.title}</h3><div className="studio-progress-caption"><span>{partialError ? '—' : `${count} / ${total}`} {t('photos')}</span><strong>{partialError ? '—' : `${progress}%`}</strong></div><div className="studio-progress"><span style={{ width: `${progress}%` }} /></div><div className="studio-event-actions"><Link href={`/${total || partialError ? 'photo' : 'setup'}?id=${encodeURIComponent(project.slug)}`}>{t(total || partialError ? 'Ouvrir le photobooth' : 'Configurer')}<FiArrowUpRight /></Link><Link href={`/mosaic?id=${encodeURIComponent(project.slug)}`} aria-label={t('Voir la mosaïque')}><FiGrid /></Link></div><div className="event-tools"><Link href={`/setup?id=${encodeURIComponent(project.slug)}`}>{language === 'fr' ? 'Modifier / reprendre' : 'Edit / resume'}</Link>{(['share','duplicate','archive','moderate','revoke'] as const).map(action => <button key={action} onClick={() => void eventAction(project, action)}>{action === 'share' ? (language === 'fr' ? 'Inviter' : 'Invite') : action === 'duplicate' ? (language === 'fr' ? 'Dupliquer' : 'Duplicate') : action === 'archive' ? (project.status === 'archived' ? (language === 'fr' ? 'Restaurer le brouillon' : 'Restore draft') : (language === 'fr' ? 'Archiver' : 'Archive')) : action === 'moderate' ? `${language === 'fr' ? 'Modération' : 'Moderation'} ${project.moderation ? '✓' : '—'}` : (language === 'fr' ? 'Révoquer les invitations' : 'Revoke invitations')}</button>)}</div></div></article>
            })}</div>}
          <div className="event-tools"><button disabled={page === 0} onClick={() => setPage(value => value - 1)}>{t('Précédent')}</button><span>{page + 1} / {Math.max(1, Math.ceil(totals.total / 24))}</span><button disabled={(page + 1) * 24 >= totals.total} onClick={() => setPage(value => value + 1)}>{t('Suivant')}</button></div><p role="status">{actionMessage}</p></section>
        </> : <><section className="studio-page-heading"><span className="studio-eyebrow">PHOTOMOSAIC STUDIO</span><h1>{t(navigation.find(item => item.id === activeTab)!.label)}</h1></section><div className="studio-editor"><EnvironmentGate>
          {activeTab === 'setup' && <CreateProject />}
          {activeTab === 'flyer' && <FlyerGenerator />}
          {activeTab === 'design' && <PhotoBoothCustomizer />}
          {activeTab === 'photos' && <PhotosTab tiles={tiles} projects={projects} selectedProject={selectedProject} setSelectedProject={setSelectedProject} setTiles={setTiles} setTileToDelete={setTileToDelete} setShowDeleteModal={setShowDeleteModal} showDeleteModal={showDeleteModal} tileToDelete={tileToDelete} deleteTile={deleteTile} />}
          {activeTab === 'stats' && <section className="studio-analytics"><h2>{t('Votre activité en un regard')}</h2><p>{t('Suivez la participation à vos événements.')}</p>{projects.length ? projects.map(project => { const count = project.tilesCount; const total = project.rows * project.cols; const percent = total ? Math.min(100, Math.round(count / total * 100)) : 0; return <article key={project.slug}><div><strong>{project.title}</strong><span>{partialError ? '—' : `${count} / ${total}`} {t('photos')} · {percent}%</span></div><div className="studio-progress"><span style={{ width: `${percent}%` }} /></div></article> }) : <p className="studio-empty">{t('Aucune donnée disponible')}</p>}</section>}
        </EnvironmentGate></div></>}
        <footer className="studio-bottom"><span>PhotoMosaic Studio</span><span>{t('Prêt à accueillir vos invités')}</span></footer>
      </main>
    </div>
  </div>
}

export default function AdminPage() { return <AccessGate><AdminWorkspace /></AccessGate> }
