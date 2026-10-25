'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { FiGrid, FiImage, FiBarChart2, FiPlus, FiCamera, FiEdit3, FiArrowUpRight, FiSearch, FiMenu, FiX, FiArrowLeft, FiLayers } from 'react-icons/fi'
import Brand from '@/components/Brand'
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
type Project = { slug: string; title: string; createdAt: string; hasImage: boolean; setupImage: string | null; rows: number; cols: number; tilesCount: number; eventDate?: string }
const navigation: { id: Tab; label: string; icon: typeof FiGrid }[] = [
  { id: 'projects', label: 'Vue d’ensemble', icon: FiGrid },
  { id: 'photos', label: 'Photos', icon: FiImage },
  { id: 'stats', label: 'Statistiques', icon: FiBarChart2 },
  { id: 'setup', label: 'Créer un événement', icon: FiPlus },
  { id: 'flyer', label: 'Flyers & QR codes', icon: FiCamera },
  { id: 'design', label: 'Personnalisation', icon: FiEdit3 },
]

export default function AdminPage() {
  const { t, language } = useLanguage()
  const [activeTab, setActiveTab] = useState<Tab>('projects')
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [projects, setProjects] = useState<Project[]>([])
  const [tiles, setTiles] = useState<Tile[]>([])
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [error, setError] = useState<string | null>(null)
  const [partialError, setPartialError] = useState<string | null>(null)
  const [selectedProject, setSelectedProject] = useState('all')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [tileToDelete, setTileToDelete] = useState<{ id: string; url: string } | null>(null)
  const load = useCallback(() => {
    if (!isSupabaseConfigured) return Promise.resolve()
    return Promise.all([
      supabase.from('projects').select('slug,title,created_at').order('created_at', { ascending: false }),
      supabase.from('setups').select('*'),
      supabase.from('tiles').select('*'),
    ]).then(([events, setups, photos]) => {
      if (events.error) throw events.error
      setPartialError(setups.error || photos.error ? databaseErrorMessage(setups.error || photos.error) : null)
      const allTiles = photos.data || []
      setError(null)
      setTiles(allTiles)
      setProjects((events.data || []).map(event => {
        const setup = setups.data?.find(item => item.project_slug === event.slug)
        return { slug: event.slug, title: event.title, createdAt: event.created_at, hasImage: Boolean(setup?.image), setupImage: setup?.image || null, rows: setup?.rows || 0, cols: setup?.cols || 0, tilesCount: allTiles.filter(tile => tile.project_slug === event.slug).length, eventDate: setup?.event_date }
      }))
    }).catch(error => setError(databaseErrorMessage(error))).finally(() => setLoading(false))
  }, [])
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
    const filename = url.split('/').pop()
    if (filename) await supabase.storage.from('tiles').remove([filename])
    setTiles(previous => previous.filter(tile => tile.id !== id))
  }
  const completed = projects.filter(p => p.rows * p.cols > 0 && p.tilesCount >= p.rows * p.cols).length
  const capacity = projects.reduce((sum, p) => sum + p.rows * p.cols, 0)
  const filtered = projects.filter(p => p.title.toLocaleLowerCase().includes(query.toLocaleLowerCase()) && (filter === 'all' || (filter === 'done' ? p.rows * p.cols > 0 && p.tilesCount >= p.rows * p.cols : p.tilesCount < p.rows * p.cols)))
  const locale = language === 'fr' ? 'fr-FR' : 'en-GB'
  const cards = [
    { label: 'Événements', value: projects.length, icon: FiLayers },
    { label: 'Photos collectées', value: tiles.length, icon: FiCamera },
    { label: 'Places disponibles', value: Math.max(0, capacity - tiles.length), icon: FiGrid },
    { label: 'Mosaïques terminées', value: completed, icon: FiBarChart2 },
  ]
  return <div className="studio-app">
    <aside className={`studio-sidebar ${menuOpen ? 'is-open' : ''}`} id="studio-navigation" aria-label={t('Studio événementiel')}>
      <div className="studio-sidebar-brand"><Brand /><button className="studio-menu-close" onClick={() => setMenuOpen(false)} aria-label={t('Fermer le menu')}><FiX /></button></div>
      <span className="studio-nav-caption">WORKSPACE</span>
      <nav>{navigation.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => navigate(id)} aria-current={activeTab === id ? 'page' : undefined}><Icon /><span>{t(label)}</span>{activeTab === id && <i />}</button>)}</nav>
      <div className="studio-sidebar-note"><span className="studio-note-icon"><FiLayers /></span><strong>{t('Votre espace créatif')}</strong><p>{t('Votre prochain souvenir collectif commence ici.')}</p><button onClick={() => navigate('setup')}>{t('Créer un événement')} <FiPlus /></button></div>
      <Link className="studio-back" href="/"><FiArrowLeft />{t('Retour au site')}</Link>
    </aside>
    {menuOpen && <button className="studio-menu-shade" aria-label={t('Fermer le menu')} onClick={() => setMenuOpen(false)} />}
    <div className="studio-workspace">
      <header className="studio-topbar"><div className="studio-breadcrumb"><button className="studio-menu-toggle" aria-label={t('Ouvrir le menu')} aria-expanded={menuOpen} aria-controls="studio-navigation" onClick={() => setMenuOpen(!menuOpen)}><FiMenu /></button><span>Studio</span><span>/</span><strong>{t(navigation.find(item => item.id === activeTab)!.label)}</strong></div><LanguageSwitch /></header>
      <main className="studio-main">
        {activeTab === 'projects' ? <>
          <section className="studio-welcome"><div><span className="studio-eyebrow">PHOTOMOSAIC STUDIO</span><h1>{t('Tout commence par un sourire.')}</h1><p>{t('Créez, personnalisez et faites vivre vos événements depuis votre studio.')}</p></div><button className="studio-primary" onClick={() => navigate('setup')}><FiPlus />{t('Créer un événement')}</button></section>
          {!isSupabaseConfigured && <div className="studio-connection"><FiLayers /><div><strong>{t('Connexion à configurer')}</strong><p>{t('Connectez votre espace de stockage pour créer vos événements et retrouver vos photos.')}</p></div></div>}
          <div role="status">{partialError && <p className="wall-error">{t('Vos événements sont affichés, mais certaines configurations ou photos sont indisponibles.')} {t(partialError)}</p>}</div><div className="studio-metrics">{cards.map(({ label, value, icon: Icon }, index) => <article key={label}><div><span>{t(label)}</span><Icon /></div><strong>{isSupabaseConfigured && !loading && !error && !partialError ? value.toLocaleString(locale) : '—'}</strong><span className={`metric-line metric-${index}`} /></article>)}</div>
          <section className="studio-events"><div className="studio-section-title"><div><span className="studio-eyebrow">COLLECTION</span><h2>{t('Vos événements')} <span>{projects.length}</span></h2></div><label className="studio-search"><FiSearch /><input aria-label={t('Rechercher un événement…')} placeholder={t('Rechercher un événement…')} value={query} onChange={e => setQuery(e.target.value)} /></label></div>
            <div className="studio-filters">{[['all','Tous'],['active','En cours'],['done','Terminés']].map(([id,label]) => <button key={id} aria-pressed={filter === id} onClick={() => setFilter(id)}>{t(label)}</button>)}</div>
            {loading ? <div className="studio-empty" role="status">{t('Chargement de vos événements…')}</div> : error ? <div className="studio-empty" role="alert"><p>{t(error)}</p><button className="studio-primary" onClick={() => void load()}>{t('Réessayer')}</button></div> : filtered.length === 0 ? <div className="studio-empty"><div className="studio-empty-art"><FiLayers /><i /><i /></div><h3>{t(projects.length ? 'Aucun résultat' : 'Aucun événement pour le moment')}</h3><p>{t(projects.length ? 'Essayez un autre nom ou modifiez le filtre.' : 'Créez votre premier mur photo et transformez les moments de vos invités en souvenir collectif.')}</p>{!projects.length && <button className="studio-primary" onClick={() => navigate('setup')}><FiPlus />{t('Créer un événement')}</button>}</div> : <div className="studio-event-grid">{filtered.map(project => {
              const count = tiles.filter(tile => tile.project_slug === project.slug).length
              const total = project.rows * project.cols
              const progress = total ? Math.min(100, Math.round(count / total * 100)) : 0
              return <article className="studio-event-card" key={project.slug}><div className="studio-event-image" style={project.setupImage ? { backgroundImage: `url(${JSON.stringify(project.setupImage)})` } : undefined}>{!project.setupImage && <FiGrid />}<span>{partialError ? '—' : t(!total ? 'À configurer' : progress === 100 ? 'Terminés' : 'En cours')}</span></div><div className="studio-event-body"><p>{new Date(project.eventDate || project.createdAt).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}</p><h3>{project.title}</h3><div className="studio-progress-caption"><span>{partialError ? '—' : `${count} / ${total}`} {t('photos')}</span><strong>{partialError ? '—' : `${progress}%`}</strong></div><div className="studio-progress"><span style={{ width: `${progress}%` }} /></div><div className="studio-event-actions"><Link href={`/${total || partialError ? 'photo' : 'setup'}?id=${encodeURIComponent(project.slug)}`}>{t(total || partialError ? 'Ouvrir le photobooth' : 'Configurer')}<FiArrowUpRight /></Link><Link href={`/mosaic?id=${encodeURIComponent(project.slug)}`} aria-label={t('Voir la mosaïque')}><FiGrid /></Link></div></div></article>
            })}</div>}
          </section>
        </> : <><section className="studio-page-heading"><span className="studio-eyebrow">PHOTOMOSAIC STUDIO</span><h1>{t(navigation.find(item => item.id === activeTab)!.label)}</h1></section><div className="studio-editor"><EnvironmentGate>
          {activeTab === 'setup' && <CreateProject />}
          {activeTab === 'flyer' && <FlyerGenerator />}
          {activeTab === 'design' && <PhotoBoothCustomizer />}
          {activeTab === 'photos' && <PhotosTab tiles={tiles} projects={projects} selectedProject={selectedProject} setSelectedProject={setSelectedProject} setTiles={setTiles} setTileToDelete={setTileToDelete} setShowDeleteModal={setShowDeleteModal} showDeleteModal={showDeleteModal} tileToDelete={tileToDelete} deleteTile={deleteTile} />}
          {activeTab === 'stats' && <section className="studio-analytics"><h2>{t('Votre activité en un regard')}</h2><p>{t('Suivez la participation à vos événements.')}</p>{projects.length ? projects.map(project => { const count = tiles.filter(tile => tile.project_slug === project.slug).length; const total = project.rows * project.cols; const percent = total ? Math.min(100, Math.round(count / total * 100)) : 0; return <article key={project.slug}><div><strong>{project.title}</strong><span>{partialError ? '—' : `${count} / ${total}`} {t('photos')} · {percent}%</span></div><div className="studio-progress"><span style={{ width: `${percent}%` }} /></div></article> }) : <p className="studio-empty">{t('Aucune donnée disponible')}</p>}</section>}
        </EnvironmentGate></div></>}
        <footer className="studio-bottom"><span>PhotoMosaic Studio</span><span>{t('Prêt à accueillir vos invités')}</span></footer>
      </main>
    </div>
  </div>
}
