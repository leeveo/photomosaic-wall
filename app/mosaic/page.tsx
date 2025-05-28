'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import MosaicCanvas from '@/components/MosaicCanvas'
import { usePhotoMosaicStore } from '@/lib/store'
import { loadTiles } from '@/lib/db.client'
import { supabase } from '@/lib/supabase'
import { motion } from 'framer-motion'

type MosaicTile = {
  src: string
  row: number
  col: number
}

// Add a type for the database tile
type DbTile = {
  image_url: string
  row: number
  col: number
}

export default function MosaicDisplayPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const slug = searchParams.get('id')

  const [tiles, setTiles] = useState<MosaicTile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const store = usePhotoMosaicStore()
  const mainRef = useRef<HTMLDivElement>(null)

  // Plein écran states
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showFullscreenButton, setShowFullscreenButton] = useState(true)
  const [wantsFullscreen, setWantsFullscreen] = useState(false)

  // Vérifie si l'utilisateur veut le fullscreen via l'URL
  useEffect(() => {
    if (searchParams.get('fullscreen') === 'true') {
      setWantsFullscreen(true)
    }
  }, [searchParams])

  useEffect(() => {
    let interval: NodeJS.Timeout

    const fetchData = async () => {
      if (!slug) {
        setError('Aucun ID fourni')
        router.push('/admin')
        return
      }

      const { data: setup, error: errSetup } = await supabase
        .from('setups')
        .select('image, rows, cols')
        .eq('project_slug', slug)
        .single()

      if (errSetup || !setup) {
        setError('Configuration introuvable.')
        return
      }

      store.setImage(setup.image)
      store.setGrid(setup.rows, setup.cols)

      const updateTiles = async () => {
        const loadedTiles = await loadTiles(slug)
        const formatted = loadedTiles.map((tile: DbTile) => ({
          src: tile.image_url,
          row: tile.row,
          col: tile.col,
        }))
        setTiles(formatted)
      }

      await updateTiles()

      // ✅ Rafraîchissement toutes les 5 secondes
      interval = setInterval(updateTiles, 5000)

      setLoading(false)
    }

    fetchData()

    return () => clearInterval(interval)
  }, [slug, router, store])

  // Gestion du fullscreen
  const toggleFullscreen = () => {
    if (!mainRef.current) return
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      mainRef.current.requestFullscreen()
    }
  }

  // Ecouteur pour l'état fullscreen
  useEffect(() => {
    const handleChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleChange)
    return () => document.removeEventListener('fullscreenchange', handleChange)
  }, [])

  // Optionnel : masquer le bouton si non supporté
  useEffect(() => {
    setShowFullscreenButton(typeof document !== 'undefined' && !!document.documentElement.requestFullscreen)
  }, [])

  // Placeholder pour le background
  function getBackgroundStyle() {
    return { background: '#18181b' }
  }

  if (loading) return <p>Chargement...</p>
  if (error) return <p style={{ color: 'red' }}>{error}</p>

  return (
    <div
      ref={mainRef}
      className="min-h-screen py-6 px-6"
      style={getBackgroundStyle()}
    >
      {/* Fullscreen Button - Always visible when supported */}
      {showFullscreenButton && (
        <motion.button
          onClick={toggleFullscreen}
          className={`fixed ${isFullscreen ? 'top-6 right-6' : 'top-4 right-4'} z-40 p-3 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg hover:shadow-xl transition-all`}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{
            opacity: wantsFullscreen ? [0, 1, 0.8, 1] : 1,
            scale: wantsFullscreen ? [0.8, 1.2, 1] : 1,
            y: wantsFullscreen ? [-10, 0] : 0
          }}
          transition={{
            duration: wantsFullscreen ? 1.5 : 0.3,
            repeat: wantsFullscreen ? 2 : 0,
            repeatType: "reverse",
            repeatDelay: 0.5
          }}
          title={isFullscreen ? "Quitter le mode plein écran" : "Activer le mode plein écran"}
        >
          {isFullscreen ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
            </svg>
          )}
        </motion.button>
      )}

      {/* Message d'aide pour activer le fullscreen */}
      {wantsFullscreen && !isFullscreen && (
        <motion.div
          className="fixed top-16 inset-x-0 flex justify-center z-30"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="bg-black bg-opacity-70 text-white px-4 py-2 rounded-lg flex items-center shadow-lg">
            <span className="mr-2">Cliquez sur</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
            </svg>
            <span className="ml-2">pour activer le mode plein écran</span>
          </div>
        </motion.div>
      )}

      {/* Supprimé le titre pour plus d'espace */}
      <MosaicCanvas tiles={tiles} />
    </div>
  )
}
