'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { FiCalendar } from 'react-icons/fi'
import { FaUserCircle } from 'react-icons/fa'
import { useQRCode } from 'next-qrcode'
import Image from 'next/image'

type Props = {
  id: string
  title: string
  createdAt: string
  status: 'pending' | 'in_progress' | 'closed'
  client: string
  owner: string
  slug: string
  eventDate?: string
}

// Fonction utilitaire pour lire le cookie partagé (supporte plusieurs noms)
function getCookie(names: string[]): string | null {
  if (typeof document === 'undefined') return null
  const cookies = document.cookie.split(';').map(c => c.trim())
  for (const name of names) {
    const found = cookies.find(c => c.startsWith(`${name}=`))
    if (found) return found.split('=')[1]
  }
  return null
}

export default function ProjectCard({
  id,
  title,
  createdAt,
  status,
  client,
  owner,
  slug,
  eventDate,
}: Props) {
  const statusMap = {
    pending: { label: 'PENDING', class: 'bg-yellow-100 text-yellow-700' },
    in_progress: { label: 'ON PROGRESS', class: 'bg-blue-100 text-blue-700' },
    closed: { label: 'CLOSED', class: 'bg-green-100 text-green-700' },
  }

  const [showQR, setShowQR] = useState(false)
  const [setupImage, setSetupImage] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const { Canvas } = useQRCode()

  const boothUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/photo?id=${slug}`

  useEffect(() => {
    const loadImage = async () => {
      const { data: projectSetup } = await supabase
        .from('setups')
        .select('*')
        .eq('project_slug', slug)
        .maybeSingle()

      if (projectSetup?.image) {
        setSetupImage(projectSetup.image)
      }
    }

    loadImage()
  }, [slug])

  const handleDelete = async () => {
    if (!confirm(`Supprimer définitivement le projet "${slug}" ?`)) return
    setDeleting(true)

    try {
      const { data: tiles } = await supabase.from('tiles').select('image_url').eq('project_slug', slug)
      if (tiles) {
        const toDelete = tiles
          .map(t => t.image_url.split('/').pop())
          .filter(Boolean)
        if (toDelete.length) {
          await supabase.storage.from('tiles').remove(toDelete)
        }
      }

      await supabase.from('tiles').delete().eq('project_slug', slug)
      await supabase.from('setups').delete().eq('project_slug', slug)
      await supabase.from('projects').delete().eq('slug', slug)

      alert('✅ Projet supprimé.')
      location.reload()
    } catch (e) {
      console.error(e)
      alert('❌ Erreur lors de la suppression.')
    } finally {
      setDeleting(false)
    }
  }

  const [userIdFromCookie, setUserIdFromCookie] = useState<string | null>(null)

  useEffect(() => {
    // Unifie la logique avec CreateProject.tsx
    const token = getCookie(['shared_auth_token', 'admin_session'])
    if (token) {
      try {
        const decodedToken = decodeURIComponent(token)
        const userData = JSON.parse(atob(decodedToken))
        if (userData.userId) {
          setUserIdFromCookie(userData.userId)
        } else {
          setUserIdFromCookie(null)
        }
      } catch (e) {
        setUserIdFromCookie(null)
      }
    } else {
      setUserIdFromCookie(null)
    }
  }, [])

  // Filtrage : n'affiche la carte que si l'utilisateur courant est le propriétaire
  if (userIdFromCookie && owner !== userIdFromCookie) {
    return null
  }

  return (
    <>
      <div className="bg-white rounded-xl px-6 py-4 shadow-sm hover:shadow-md transition border border-gray-200 flex flex-col gap-4 relative">
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-6 flex-wrap">
          <div className="text-sm text-purple-600 font-semibold">#P-{id}</div>
          <div className="text-lg font-bold text-gray-900 truncate max-w-[250px]">{title}</div>
          <div className="flex items-center gap-1 text-gray-500 text-sm mt-1 sm:mt-0">
            <FiCalendar />
            <span>Créé le {createdAt}</span>
          </div>
          {setupImage && (
            <Image
              src={setupImage}
              alt="setup"
              width={50}
              height={50}
              className="w-[50px] h-auto rounded shadow-sm border border-gray-200"
            />
          )}
        </div>

        <div className="flex items-center gap-3 text-sm text-gray-700 mt-2 sm:mt-0 flex-wrap">
          <div className="flex items-center gap-2">
            <FaUserCircle className="text-xl text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Client</p>
              <p className="font-medium">{client}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <FaUserCircle className="text-xl text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Responsable</p>
              <p className="font-medium">{owner}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <FiCalendar className="text-xl text-emerald-600" />
            <div>
              <p className="text-xs text-gray-500">Date Evénement</p>
              <p className="font-medium">
                {eventDate ? new Date(eventDate).toLocaleDateString('fr-FR') : ''}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-4">
          <Link href={`/mosaic?id=${slug}`} target="_blank">
            <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-sm rounded-md transition">
              🖼️ Voir la mosaïque
            </button>
          </Link>
          <Link href={`/photo?id=${slug}`} target="_blank">
            <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 text-sm rounded-md transition">
              📸 Accéder au photobooth
            </button>
          </Link>
          <button
            onClick={() => setShowQR(true)}
            className="bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-800 px-4 py-2 text-sm rounded-md transition"
          >
            🔗 QR Code
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="bg-red-100 text-red-700 hover:bg-red-200 px-4 py-2 text-sm rounded-md transition"
          >
            🗑️ Supprimer
          </button>
        </div>

        <div className="mt-4">
          <span className={`text-xs font-semibold px-4 py-1 rounded-full ${statusMap[status].class}`}>
            {statusMap[status].label}
          </span>
        </div>
      </div>

      {showQR && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-xl w-[90%] max-w-sm text-center relative shadow-lg">
            <h2 className="text-lg font-semibold mb-4">QR Code vers le photobooth</h2>
            <Canvas
              text={boothUrl}
              options={{
                errorCorrectionLevel: 'M',
                scale: 6,
                margin: 2,
                color: { dark: '#000000', light: '#ffffff' },
              }}
            />
            <p className="text-xs text-gray-500 mt-2 break-all">{boothUrl}</p>
            <button
              onClick={() => setShowQR(false)}
              className="absolute top-2 right-2 text-sm text-gray-500 hover:text-black"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  )
}