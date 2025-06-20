'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { loadTiles } from '@/lib/db.client'
import { supabase } from '@/lib/supabase'
import CreateProject from '@/components/CreateProject'
import ProjectCard from '@/components/ProjectCard'
import PhotoDonutChart from '@/components/PhotoDonutChart'
import FlyerGenerator from '@/components/FlyerGenerator'
import PhotoBoothCustomizer from '@/components/PhotoBoothCustomizer'
import PhotosTab from '@/components/PhotosTab'
import UserProfileMenu from '@/components/UserProfileMenu'
import { FiGrid, FiImage, FiBarChart2, FiPlusCircle, FiCamera, FiEdit } from 'react-icons/fi'
import Link from 'next/link'
import { useQRCode } from 'next-qrcode'
import Image from 'next/image'
import {
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts'

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

type Tile = {
  id: string
  image_url: string
  row: number
  col: number
  project_slug: string
}

// Define type for project details
type ProjectDetails = {
  slug: string;
  title: string;
  created_at: string;
  setup?: {
    rows: number;
    cols: number;
    image: string | null;
    event_date: string | null;
  };
  design?: {
    background_color: string;
    background_image: string;
    button_color: string;
    step1_text: string;
    step2_text: string;
    step3_text: string;
  };
  photosCount?: number;
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'projects' | 'photos' | 'stats' | 'setup' | 'flyer' | 'design'>('projects')
  const [selectedProject, setSelectedProject] = useState('all')
  const [projects, setProjects] = useState<MosaicMeta[]>([])
  const [tiles, setTiles] = useState<Tile[]>([])
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [tileToDelete, setTileToDelete] = useState<{ id: string; url: string } | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [userEmail, setUserEmail] = useState<string>('')

  // Remove unused state variables
  // const [showMosaicMenu, setShowMosaicMenu] = useState(true)

  // Use proper type instead of any
  const [projectDetails, setProjectDetails] = useState<ProjectDetails | null>(null)
  const [showProjectDetails, setShowProjectDetails] = useState(false)
  const { Canvas: QRCanvas } = useQRCode()

  const router = useRouter()

  useEffect(() => {
    const fetchAll = async () => {
      const { data: projectsRaw } = await supabase.from('projects').select('slug, title, created_at')
      if (!projectsRaw) return

      const enriched: MosaicMeta[] = []

      for (const p of projectsRaw) {
        const { data: setup } = await supabase
          .from('setups')
          .select('rows, cols, image, event_date')
          .eq('project_slug', p.slug)
          .single()

        const t = await loadTiles(p.slug)

        enriched.push({
          slug: p.slug,
          title: p.title,
          createdAt: p.created_at,
          hasImage: !!setup?.image,
          setupImage: setup?.image || null, // <-- ajoutez cette ligne
          rows: setup?.rows || 0,
          cols: setup?.cols || 0,
          tilesCount: t.length,
          eventDate: setup?.event_date || undefined,
        })
      }

      const { data: allTiles } = await supabase.from('tiles').select('*')
      setProjects(enriched)
      setTiles(allTiles || [])
    }

    fetchAll()
  }, [])

  useEffect(() => {
    // Récupérer l'email réel depuis le cookie et la base admin_users
    const getEmailFromToken = async () => {
      const getCookieValue = (name: string) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) {
          return parts.pop()?.split(';').shift() || '';
        }
        return '';
      };

      const token = getCookieValue('shared_auth_token');
      if (token) {
        try {
          const decoded = atob(token);
          const userData = JSON.parse(decoded);
          const userId = userData.userId;
          if (userId) {
            // Appel API pour récupérer l'email réel
            const { data: user, error } = await supabase
              .from('admin_users')
              .select('email')
              .eq('id', userId)
              .single();
            if (user && user.email) {
              setUserEmail(user.email);
              return;
            }
          }
        } catch (e) {
          // fallback below
        }
      }
      // Ne rien afficher si l'email n'est pas trouvé
      setUserEmail('');
    };

    getEmailFromToken();
  }, []);

  const deleteTile = async (tileId: string, imageUrl: string) => {
    await supabase.from('tiles').delete().eq('id', tileId)
    if (imageUrl) {
      const fileName = imageUrl.split('/').pop()
      if (fileName) {
        await supabase.storage.from('tiles').remove([fileName])
      }
    }
    setTiles(prev => prev.filter(t => t.id !== tileId))
  }

  const renderContent = () => {
    if (activeTab === 'projects') {
      return (
        <section>
          <h2 className="text-2xl font-semibold mb-6">📁 Tous les projets</h2>
          <div className="flex flex-col gap-6">
            {projects.map((p, idx) => (
              <ProjectCard
                key={p.slug}
                id={String(idx + 1).padStart(6, '0')}
                slug={p.slug}
                title={p.title}
                createdAt={new Date(p.createdAt).toLocaleDateString('fr-FR')}
                eventDate={p.eventDate}
                client="Client Inconnu"
                owner="Admin"
                status={
                  p.tilesCount === 0
                    ? 'pending'
                    : p.tilesCount === p.rows * p.cols
                    ? 'closed'
                    : 'in_progress'
                }
              />
            ))}
          </div>
        </section>
      )
    }

    if (activeTab === 'photos') {
      return (
        <PhotosTab
          tiles={tiles}
          projects={projects}
          selectedProject={selectedProject}
          setSelectedProject={setSelectedProject}
          setTiles={setTiles}
          setTileToDelete={setTileToDelete}
          setShowDeleteModal={setShowDeleteModal}
          showDeleteModal={showDeleteModal}
          tileToDelete={tileToDelete}
          deleteTile={deleteTile}
        />
      )
    }

    if (activeTab === 'flyer') {
      return (
        <section>
          <FlyerGenerator />
        </section>
      )
    }

    if (activeTab === 'stats') {
      const totalProjects = projects.length
      const totalPhotos = tiles.length
      const expectedPhotos = projects.reduce((acc, p) => acc + p.rows * p.cols, 0)
      const averagePhotos = Math.round((totalPhotos / totalProjects) || 0)

      // Préparation des données pour les graphiques
      const pieData = projects.map(p => ({
        name: p.title,
        value: tiles.filter(t => t.project_slug === p.slug).length,
      }))
      const COLORS = ['#6366f1', '#a78bfa', '#34d399', '#fbbf24', '#f472b6', '#60a5fa', '#f87171', '#f59e42']

      const barData = projects.map(p => ({
        name: p.title,
        Remplies: tiles.filter(t => t.project_slug === p.slug).length,
        Attendues: p.rows * p.cols,
      }))

      return (
        <section>
          <h2 className="text-2xl font-semibold mb-6">📊 Statistiques</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Total de projets</h3>
              <p className="text-4xl font-bold text-indigo-600">{totalProjects}</p>
              <p className="text-xs text-gray-400 mt-1">Tous projets confondus</p>
            </div>
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Photos prises</h3>
              <p className="text-4xl font-bold text-indigo-600">
                {totalPhotos}
                <span className="text-base text-gray-500"> / {expectedPhotos}</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">Total prises vs attendues</p>
            </div>
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Moyenne par projet</h3>
              <p className="text-4xl font-bold text-indigo-600">{averagePhotos}</p>
              <p className="text-xs text-gray-400 mt-1">Basée sur {totalProjects} projets</p>
            </div>
            <PhotoDonutChart taken={totalPhotos} total={expectedPhotos} />
          </div>

          {/* Nouveaux graphiques statistiques */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
            {/* PieChart - Répartition des photos par projet */}
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">Répartition des photos par projet</h3>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ name, percent }) => `${name} (${Math.round(percent * 100)}%)`}
                  >
                    {pieData.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* BarChart - Taux de complétion par projet */}
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">Taux de complétion par projet</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <RechartsTooltip />
                  <Legend />
                  <Bar dataKey="Attendues" fill="#e5e7eb" name="Attendues" />
                  <Bar dataKey="Remplies" fill="#6366f1" name="Remplies" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      )
    }

    if (activeTab === 'setup') {
      return (
        <section>
          <CreateProject />
        </section>
      )
    }
    if (activeTab === 'design') {
      return (
        <section>
          <PhotoBoothCustomizer />
        </section>
      )
    }
    
    return <div className="text-center text-gray-500">Aucun onglet sélectionné.</div>
  }

  // Déplacez les hooks du dashboard en dehors de renderDashboard pour respecter les règles des hooks React
  const [stats, setStats] = useState({
    backgrounds: 0,
    styles: 0,
    configurations: 0,
    totalPhotos: 0,
  });
  const [projectsWithPhotoCount, setProjectsWithPhotoCount] = useState<{ [k: string]: number }>({});
  
  // Remove unused state variable
  // const [photoCountsLoading, setPhotoCountsLoading] = useState(false);

  useEffect(() => {
    setStats(s => ({ ...s, totalPhotos: tiles.length }));
    const counts: { [k: string]: number } = {};
    projects.forEach(p => {
      counts[p.slug] = tiles.filter(t => t.project_slug === p.slug).length;
    });
    setProjectsWithPhotoCount(counts);
  }, [tiles, projects]);

  // Fonction pour charger les détails du projet depuis la base de données
  async function fetchProjectDetails(slug: string) {
    // Récupère les infos du projet
    const { data: project } = await supabase
      .from('projects')
      .select('*')
      .eq('slug', slug)
      .single()

    // Récupère la configuration du setup
    const { data: setup } = await supabase
      .from('setups')
      .select('*')
      .eq('project_slug', slug)
      .single()

    // Récupère le design
    const { data: design } = await supabase
      .from('designs')
      .select('*')
      .eq('project_slug', slug)
      .single()

    // Récupère le nombre de photos
    const { count: photosCount } = await supabase
      .from('tiles')
      .select('*', { count: 'exact', head: true })
      .eq('project_slug', slug)

    setProjectDetails({
      ...project,
      setup,
      design,
      photosCount,
    })
    setShowProjectDetails(true)
  }

  // Modifiez renderDashboard pour ne plus utiliser de hooks
  function renderDashboard() {
    return (
      <div className="space-y-6">
        {/* Statistiques globales */}
        <div className="p-6 bg-gradient-to-br from-blue-500 via-purple-500 to-blue-500 rounded-lg shadow text-white">
          <h3 className="text-xl font-medium mb-6">Statistiques Globales</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Photos */}
            <div className="flex items-center space-x-4">
              <div className="bg-blue bg-opacity-10 rounded-lg p-3 flex items-center justify-center">
                {/* Camera icon */}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7a2 2 0 00-2-2h-3.382a1 1 0 01-.894-.553l-.724-1.447A1 1 0 0013.382 3h-2.764a1 1 0 00-.894.553l-.724 1.447A1 1 0 018.382 5H5a2 2 0 00-2 2z" />
                  <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-white text-opacity-80">Total des photos générées</p>
                <div className="flex items-center">
                  <span className="text-4xl font-bold">{stats.totalPhotos}</span>
                  <span className="ml-2 text-sm text-white text-opacity-70">images créées</span>
                </div>
              </div>
            </div>
            {/* Projets */}
            <div className="flex items-center space-x-4">
              <div className="bg-blue bg-opacity-10 rounded-lg p-3 flex items-center justify-center">
                {/* Folder icon */}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7a2 2 0 012-2h3.172a2 2 0 011.414.586l1.828 1.828A2 2 0 0012.828 8H19a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-white text-opacity-80">Projets actifs</p>
                <div className="flex items-center">
                  <span className="text-4xl font-bold">{projects.length}</span>
                  <span className="ml-2 text-sm text-white text-opacity-70">photobooth configurés</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Button to refresh the page */}
        <div className="flex justify-end">
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg shadow hover:from-green-600 hover:to-emerald-700 transition-all font-medium"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualiser les données
          </button>
        </div>

        {/* Projets */}
        <div className="p-6 bg-white rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Tous Vos Projets ({projects.length})</h3>
          </div>
          {projects.length === 0 ? (
            <div className="text-center py-8 border border-gray-200 rounded-lg">
              <p className="text-gray-500 mb-4">Aucun projet trouvé</p>
            </div>
          ) :
          (
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.slice(0, 6).map((project) => {
                  const totalPhotosMosaic = project.rows * project.cols;
                  const mainImageUrl: string | undefined = project.hasImage && project.setupImage ? project.setupImage : undefined;
                  
                  // Calculate mosaic size in cm based on rows and cols
                  const mosaicWidthCm = project.cols * 3; // Assuming each tile is 3cm wide
                  const mosaicHeightCm = project.rows * 3; // Assuming each tile is 3cm tall
                  
                  return (
                  <div
                    key={project.slug}
                    className="border border-transparent rounded-lg overflow-hidden shadow-xl hover:shadow-2xl transition-shadow"
                  >
                    <div
                      className="h-40 flex flex-col items-center justify-center p-4 relative"
                      style={{
                        backgroundColor: '#f3f4f6',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundImage: mainImageUrl ? `url(${mainImageUrl})` : undefined,
                      }}
                    >
                      {mainImageUrl && (
                        <div className="absolute inset-0 bg-black/40 z-0" />
                      )}
                      <div className="relative z-10 w-full flex flex-col items-center">
                        <span
                          className="block text-2xl font-bold text-center shadow"
                          style={{
                            background: 'linear-gradient(90deg, #6366f1 0%, #a78bfa 100%)',
                            color: '#fff',
                            borderRadius: '0.75rem',
                            padding: '0.5rem 1.5rem',
                            boxShadow: '0 2px 12px 0 rgba(99,102,241,0.10)',
                            letterSpacing: '0.02em',
                            border: '2px solid #fff',
                            marginTop: '0.5rem',
                            marginBottom: '0.5rem',
                            display: 'inline-block',
                            maxWidth: '90%',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {project.title}
                        </span>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{project.title}</h4>
                        <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800">
                          Actif
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 mb-2">
                        <div className="flex items-center space-x-1">
                          <span className="truncate">/{project.slug}</span>
                        </div>
                        <div className="flex items-center space-x-1 mt-1">
                          <span
                            className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white text-lg font-extrabold px-4 py-2 rounded-xl shadow border-2 border-white tracking-wide"
                            style={{
                              fontSize: '1.5rem',
                              letterSpacing: '0.04em',
                              display: 'inline-block',
                              minWidth: '120px',
                              textAlign: 'center',
                              boxShadow: '0 2px 12px 0 rgba(99,102,241,0.10)',
                            }}
                          >
                            {projectsWithPhotoCount[project.slug] || 0}
                            <span className="mx-1 text-base font-bold text-white/80">/</span>
                            {totalPhotosMosaic}
                          </span>
                          <span className="ml-2 text-lg font-bold text-gray-700">photos</span>
                        </div>
                        
                        {/* Additional project information */}
                        <div className="mt-3 grid grid-cols-2 gap-2 bg-gray-50 p-2 rounded-lg">
                          <div>
                            <span className="text-xs font-medium text-gray-500">Taille mosaïque:</span>
                            <p className="font-medium text-gray-700">{mosaicWidthCm} × {mosaicHeightCm} cm</p>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-gray-500">Format:</span>
                            <p className="font-medium text-gray-700">{project.rows} × {project.cols}</p>
                          </div>
                        </div>
                        
                        {project.eventDate && (
                          <div className="flex items-center space-x-1 mt-1">
                            <span>{new Date(project.eventDate).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* QR Code display for quick access */}
                      <div className="mt-3 flex justify-center bg-white p-2 rounded-lg border border-gray-100">
                        <div className="text-center">
                          <span className="text-xs font-medium text-gray-500 block mb-1">Accès Photobooth</span>
                          {typeof window !== 'undefined' && (
                            <div className="inline-block bg-white p-1 border border-gray-200 rounded">
                              <QRCanvas
                                text={`${window.location.origin}/photo?id=${project.slug}`}
                                options={{
                                  width: 80,
                                  margin: 1,
                                  color: {
                                    dark: '#000000',
                                    light: '#ffffff',
                                  },
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Actions accès photobooth et galerie */}
                      <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-gray-100">
                        <button
                          type="button"
                          onClick={() => setActiveTab('photos')}
                          className="flex-1 text-center text-xs px-3 py-2 rounded-lg font-semibold bg-gradient-to-br from-blue-100 to-blue-200 text-blue-800 border border-blue-200 shadow-sm hover:from-blue-200 hover:to-blue-300 hover:text-blue-900 transition"
                          title="Voir la galerie de photos"
                        >
                          <span className="inline-flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 002-2h14a2 2 0 002 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 14h.01M16 10h.01" />
                            </svg>
                            Galerie
                          </span>
                        </button>
                        <a
                          href={`/photo?id=${project.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 text-center text-xs px-3 py-2 rounded-lg font-semibold bg-gradient-to-br from-gray-100 to-gray-200 text-gray-800 border border-gray-200 shadow-sm hover:from-gray-200 hover:to-gray-300 hover:text-gray-900 transition"
                          title="Accéder au photobooth"
                        >
                          <span className="inline-flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A2 2 0 0021 6.382V5a2 2 0 00-2-2H5a2 2 0 00-2 2v1.382a2 2 0 001.447 1.342L9 10m6 0v6a2 2 0 01-2 2H7a2 2 0 01-2-2v-6m10 0H9" />
                            </svg>
                            Photobooth
                          </span>
                        </a>
                        <a
                          href={`/mosaic?id=${project.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 text-center text-xs px-3 py-2 rounded-lg font-semibold bg-gradient-to-br from-green-100 to-green-200 text-green-800 border border-green-200 shadow-sm hover:from-green-200 hover:to-green-300 hover:text-green-900 transition"
                          title="Voir la mosaïque en cours"
                        >
                          <span className="inline-flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <rect width="6" height="6" x="3" y="3" rx="1" />
                              <rect width="6" height="6" x="15" y="3" rx="1" />
                              <rect width="6" height="6" x="3" y="15" rx="1" />
                              <rect width="6" height="6" x="15" y="15" rx="1" />
                            </svg>
                            Mosaïque
                          </span>
                        </a>
                        <button
                          type="button"
                          onClick={async () => {
                            await fetchProjectDetails(project.slug)
                          }}
                          className="flex-1 text-center text-xs px-3 py-2 rounded-lg font-semibold bg-gradient-to-br from-indigo-100 to-purple-200 text-indigo-800 border border-indigo-200 shadow-sm hover:from-indigo-200 hover:to-purple-300 hover:text-indigo-900 transition"
                          title="Configurer le projet"
                        >
                          <span className="inline-flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 17a4 4 0 004-4V7a4 4 0 10-8 0v6a4 4 0 004 4z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10" />
                            </svg>
                            Configurer
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                )})}
              </div>
            </div>
          )}
        </div>

        {/* Cartes backgrounds/styles/settings */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <div className="p-6 bg-blue-50 border-l-4 border-blue-400 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-blue-800">Arrière-plans</h3>
              <span className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-100 rounded-full">
                {stats.backgrounds} total
              </span>
            </div>
            <p className="mt-2 text-sm text-blue-600">
              Gérez les images d&apos;arrière-plan de votre photobooth
            </p>
          </div>
          <div className="p-6 bg-purple-50 border-l-4 border-purple-400 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-purple-800">Styles</h3>
              <span className="px-3 py-1 text-xs font-medium text-purple-600 bg-purple-100 rounded-full">
                {stats.styles} total
              </span>
            </div>
            <p className="mt-2 text-sm text-purple-600">
              Gérez les styles et tenues disponibles pour les utilisateurs
            </p>
          </div>
          <div className="p-6 bg-green-50 border-l-4 border-green-400 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-green-800">Paramètres</h3>
              <span className="px-3 py-1 text-xs font-medium text-green-600 bg-green-100 rounded-full">
                {stats.configurations} configurations
              </span>
            </div>
            <p className="mt-2 text-sm text-green-600">
              Configurez les paramètres globaux de votre application
            </p>
          </div>
        </div>

        {/* Guide rapide */}
        <div className="p-6 bg-white rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Guide rapide</h3>
          <div className="space-y-4">
            <div className="p-4 border border-blue-200 bg-blue-50 rounded-md">
              <h4 className="font-medium text-blue-800">1. Création d&apos;un nouveau projet</h4>
              <p className="mt-1 text-sm text-blue-600">
                Commencez par créer un nouveau projet dans la section Projets . Renseignez le nom, le slug URL,
                choisissez le type de photobooth et personnalisez les couleurs.
              </p>
            </div>
            <div className="p-4 border border-purple-200 bg-purple-50 rounded-md">
              <h4 className="font-medium text-purple-800">2. Configuration du filigrane</h4>
              <p className="mt-1 text-sm text-purple-600">
                Dans l&apos;onglet Filigrane de votre projet, activez et personnalisez le filigrane qui apparaîtra sur les photos.
              </p>
            </div>
            <div className="p-4 border border-green-200 bg-green-50 rounded-md">
              <h4 className="font-medium text-green-800">3. Ajout des styles</h4>
              <p className="mt-1 text-sm text-green-600">
                Dans l&apos;onglet Styles du projet, ajoutez différents styles de vêtements pour chaque catégorie.
              </p>
            </div>
            <div className="p-4 border border-blue-200 bg-blue-50 rounded-md">
              <h4 className="font-medium text-blue-800">4. Ajout des arrière-plans</h4>
              <p className="mt-1 text-sm text-blue-600">
                Dans l&apos;onglet Arrière-plans, téléchargez des images qui seront disponibles comme fond pour les photos.
              </p>
            </div>
            <div className="p-4 border border-purple-200 bg-purple-50 rounded-md">
              <h4 className="font-medium text-purple-800">5. Personnalisation de la galerie mosaïque</h4>
              <p className="mt-1 text-sm text-purple-600">
                Accédez à l&apos;onglet Galerie pour configurer l&apos;affichage mosaïque des photos.
              </p>
            </div>
            <div className="p-4 border border-green-200 bg-green-50 rounded-md">
              <h4 className="font-medium text-green-800">6. Test et déploiement</h4>
              <p className="mt-1 text-sm text-green-600">
                Une fois votre projet configuré, testez-le en accédant à l&apos;URL du photobooth.
              </p>
            </div>
            <div className="p-4 border border-blue-200 bg-blue-50 rounded-md">
              <h4 className="font-medium text-blue-800">7. Gestion des photos générées</h4>
              <p className="mt-1 text-sm text-blue-600">
                Depuis la page &quot;Galerie&quot;, vous pouvez visualiser et gérer toutes les photos générées pour chaque projet.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Ajout pour prise en charge du token dans l'URL (partage session cross-app)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      // Stocker dans localStorage et cookies pour compatibilité
      localStorage.setItem('auth_token', token);
      document.cookie = `shared_auth_token=${token}; path=/; max-age=${60*60*24*30}`;
      document.cookie = `admin_session=${token}; path=/; max-age=${60*60*24*30}`;
      document.cookie = 'has_auth_in_ls=true; path=/; max-age=3600';
      // Nettoyer l'URL
      const url = new URL(window.location.href);
      url.searchParams.delete('token');
      url.searchParams.delete('bypass');
      window.history.replaceState({}, document.title, url.toString());
    }
  }, []);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar - responsive */}
      <div
        className={`${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-20 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out`}
      >
        <div className="p-6">
          <h1 className="text-2xl font-semibold text-indigo-600">Fillow.</h1>
          <p className="text-sm text-gray-500">Administration</p>
        </div>
        <nav className="mt-6 flex flex-col gap-2 text-sm">
          {/* Close button for mobile */}
          <div className="px-6 py-2 lg:hidden">
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="text-gray-500 hover:text-gray-700 focus:outline-none"
            >
              <span className="text-sm">Fermer le menu</span>
            </button>
          </div>
          {/* Main navigation items */}
          {[
            { label: 'Dashboard', icon: <FiGrid />, tab: 'projects' },
            { label: 'Créer Projet', icon: <FiPlusCircle />, tab: 'setup' },
            { label: 'Photos', icon: <FiImage />, tab: 'photos' },
            { label: 'Stats', icon: <FiBarChart2 />, tab: 'stats' },
            { label: 'Flyer', icon: <FiCamera />, tab: 'flyer' },
            { label: 'Design', icon: <FiEdit />, tab: 'design' },
          ].map(({ label, icon, tab }) => (
            <button
              key={tab}
              onClick={() => {
                setIsSidebarOpen(false)
                setActiveTab(tab as 'projects' | 'photos' | 'stats' | 'setup' | 'flyer' | 'design')
              }}
              className={`flex items-center gap-2 px-6 py-3 rounded-md w-full justify-start ${
                activeTab === tab
                  ? 'bg-indigo-50 text-indigo-600 font-semibold'
                  : 'text-gray-700 hover:bg-indigo-50'
              }`}
            >
              {icon}
              <span className="text-sm">{label}</span>
            </button>
          ))}
          <hr className="my-6 border-gray-200" />
          <button
            onClick={() => router.push('/')}
            className="w-full flex items-center px-6 py-3 text-gray-700 hover:bg-red-50 hover:text-red-600"
          >
            <span className="mx-4">⬅️ Retour à l&apos;accueil</span>
          </button>
        </nav>
      </div>

      {/* Backdrop overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-10 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <header className="bg-white shadow pl-4 lg:pl-0 sticky top-0 z-10">
          <div className="px-6 py-4 flex items-center justify-between">
            {/* Mobile hamburger menu button */}
            <div className="flex items-center">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="mr-4 lg:hidden"
                aria-label="Toggle menu"
              >
                <svg
                  className="h-6 w-6 text-gray-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
              <h2 className="font-semibold text-xl text-gray-800">
                Dashboard
              </h2>
            </div>
            
            {/* User Profile Menu */}
            <div>
              <UserProfileMenu email={userEmail} />
            </div>
          </div>
        </header>
        
        <main className="p-6">
          {activeTab === 'projects' ? renderDashboard() : renderContent()}
        </main>
      </div>

      {/* Modal ou panneau latéral pour les détails du projet */}
      {showProjectDetails && projectDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-0 relative overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-10 py-7 bg-gradient-to-br from-blue-500 via-purple-500 to-blue-500 rounded-t-2xl">
              <h2 className="text-3xl font-extrabold text-white tracking-tight">{projectDetails.title}</h2>
              <button
                className="text-white text-3xl hover:text-gray-200 focus:outline-none"
                onClick={() => setShowProjectDetails(false)}
                aria-label="Fermer"
              >
                &times;
              </button>
            </div>
            {/* Content */}
            <div className="px-10 py-8 space-y-6">
              {/* Affichage image principale sous le nom du projet */}
              {projectDetails.setup?.image && (
                <div className="flex justify-center mb-6">
                  <Image
                    src={projectDetails.setup.image}
                    alt="Image principale"
                    width={300}
                    height={200}
                    className="h-32 rounded shadow border bg-white object-contain"
                    style={{ maxWidth: '60%' }}
                  />
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4 text-base">
                  <div>
                    <span className="font-semibold text-gray-700 text-lg">Slug:</span>{' '}
                    <span className="text-gray-900 text-lg">{projectDetails.slug}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700 text-lg">Créé le:</span>{' '}
                    <span className="text-gray-900 text-lg">{new Date(projectDetails.created_at).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700 text-lg">Date événement:</span>{' '}
                    <span className="text-gray-900 text-lg">
                      {projectDetails.setup?.event_date ? new Date(projectDetails.setup.event_date).toLocaleDateString() : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700 text-lg">Dimensions mosaïque:</span>{' '}
                    <span className="text-gray-900 text-lg">{projectDetails.setup?.rows} x {projectDetails.setup?.cols}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700 text-lg">Nombre de photos:</span>{' '}
                    <span className="text-gray-900 text-lg">{projectDetails.photosCount ?? '-'}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700 text-lg">Textes étapes:</span>
                    <ul className="ml-6 list-disc text-gray-900 text-base">
                      <li className="mb-1">{projectDetails.design?.step1_text}</li>
                      <li className="mb-1">{projectDetails.design?.step2_text}</li>
                      <li>{projectDetails.design?.step3_text}</li>
                    </ul>
                  </div>
                </div>
                <div className="space-y-4 text-base">
                  <div>
                    <span className="font-semibold text-gray-700 text-lg">Image principale:</span>{' '}
                    {projectDetails.setup?.image ? (
                      <Image 
                        src={projectDetails.setup.image} 
                        alt="main" 
                        width={96}
                        height={96}
                        className="inline-block h-24 rounded shadow border" 
                      />
                    ) : (
                      <span className="text-gray-400 text-lg">-</span>
                    )}
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700 text-lg">Couleur fond:</span>{' '}
                    {projectDetails.design?.background_color ? (
                      <span
                        className="inline-block w-12 h-7 rounded border align-middle"
                        style={{ background: projectDetails.design.background_color }}
                        title={projectDetails.design.background_color}
                      />
                    ) : (
                      <span className="text-gray-400 text-lg">-</span>
                    )}
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700 text-lg">Image fond:</span>{' '}
                    {projectDetails.design?.background_image ? (
                      <Image 
                        src={projectDetails.design.background_image} 
                        alt="bg" 
                        width={96}
                        height={96}
                        className="inline-block h-24 rounded shadow border" 
                      />
                    ) : (
                      <span className="text-gray-400 text-lg">-</span>
                    )}
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700 text-lg">Couleur bouton:</span>{' '}
                    {projectDetails.design?.button_color ? (
                      <span
                        className="inline-block w-12 h-7 rounded border align-middle"
                        style={{ background: projectDetails.design.button_color }}
                        title={projectDetails.design.button_color}
                      />
                    ) : (
                      <span className="text-gray-400 text-lg">-</span>
                    )}
                  </div>
                </div>
              </div>
              {/* Actions */}
              <div className="mt-8 flex flex-col sm:flex-row gap-6 items-center justify-between">
                <Link
                  href={`/photo?id=${projectDetails.slug}`}
                  target="_blank"
                  className="px-7 py-3 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold text-lg shadow hover:from-blue-600 hover:to-purple-700 transition"
                >
                  Ouvrir le Photobooth
                </Link>
                <div className="flex flex-col items-center">
                  <span className="text-sm text-gray-500 mb-2 font-semibold">QR Code Photobooth</span>
                  <div className="bg-white p-3 rounded shadow border">
                    <QRCanvas
                      text={`${typeof window !== 'undefined' ? window.location.origin : ''}/photo?id=${projectDetails.slug}`}
                      options={{
                        width: 140,
                        margin: 1,
                        color: {
                          dark: '#000000',
                          light: '#ffffff',
                        },
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 mt-2 break-all text-center">
                    {typeof window !== 'undefined'
                      ? `${window.location.origin}/photo?id=${projectDetails.slug}`
                      : `/photo?id=${projectDetails.slug}`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
