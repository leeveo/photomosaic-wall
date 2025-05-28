'use client'

import { useEffect, useState, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import WebcamCapture, { WebcamCaptureHandle } from '@/components/WebcamCapture'
import { usePhotoMosaicStore } from '@/lib/store'
import { uploadImage, saveTile, loadTiles } from '@/lib/db.client'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'

type MosaicTile = { src: string; row: number; col: number }

type BoothConfig = {
  backgroundColor: string
  backgroundImage: string
  buttonColor: string
  stepTexts: { step1: string; step2: string; step3: string }
}

export default function PhotoPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const slug = searchParams.get('id')

  const [tiles, setTiles] = useState<MosaicTile[]>([])
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [previewTile, setPreviewTile] = useState<{ row: number; col: number } | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [design, setDesign] = useState<BoothConfig | null>(null)
  const [totalTiles, setTotalTiles] = useState(0)

  const webcamRef = useRef<WebcamCaptureHandle>(null)
  const store = usePhotoMosaicStore()

  useEffect(() => {
    const init = async () => {
      if (!slug) return router.push('/admin')

      const { data: setup, error } = await supabase
        .from('setups')
        .select('rows, cols, image')
        .eq('project_slug', slug)
        .single()

      if (error || !setup) {
        console.error('Erreur setup:', error)
        return router.push(`/setup?id=${slug}`)
      }

      let imageUrl = setup.image

      if (!imageUrl.startsWith('http') && !imageUrl.startsWith('data:image')) {
        const { data: publicUrlData } = supabase.storage
          .from('backgrounds')
          .getPublicUrl(imageUrl)
        imageUrl = publicUrlData?.publicUrl || ''
      }

      if (!imageUrl) {
        console.error('Image introuvable ou invalide.')
        return
      }

      store.setImage(imageUrl)
      store.setGrid(setup.rows, setup.cols)
      setTotalTiles(setup.rows * setup.cols)

      const t = await loadTiles(slug)
      setTiles(t)

      const { data: dsgn } = await supabase
        .from('designs')
        .select('*')
        .eq('project_slug', slug)
        .single()

      if (dsgn) {
        setDesign({
          backgroundColor: dsgn.background_color || '#000000',
          backgroundImage: dsgn.background_image || '',
          buttonColor: dsgn.button_color || '#16a34a',
          stepTexts: {
            step1: dsgn.step1_text || 'Prêt à commencer ?',
            step2: dsgn.step2_text || 'Cadrez-vous bien !',
            step3: dsgn.step3_text || 'Voici votre photo, voulez-vous la valider ?',
          },
        })
      }

      setLoading(false)
    }

    init()
  }, [slug, router, store])

  const handleTakePhotoClick = () => {
    setCountdown(3)
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev === 1) {
          clearInterval(interval)
          ;(async () => {
            if (webcamRef.current) {
              const base64 = await webcamRef.current.takePhoto()
              setCountdown(null)
              assignTile(base64)
              setStep(3)
            }
          })()
          return null
        }
        return (prev ?? 0) - 1
      })
    }, 1000)
  }

  const assignTile = (imageSrc: string) => {
    const used = new Set(tiles.map(t => `${t.row}-${t.col}`))
    const { rows, cols } = store

    let row: number, col: number
    do {
      row = Math.floor(Math.random() * rows)
      col = Math.floor(Math.random() * cols)
    } while (used.has(`${row}-${col}`))

    setCapturedImage(imageSrc)
    setPreviewTile({ row, col })
  }

  const validatePhoto = async () => {
    try {
      if (!capturedImage || !previewTile || !slug) {
        console.warn('Données manquantes pour valider:', { capturedImage, previewTile, slug })
        return
      }

      const finalImage = await applyMosaicOverlay(capturedImage, previewTile.row, previewTile.col)
      const imageUrl = await uploadImage(finalImage, slug)
      await saveTile(slug, previewTile.row, previewTile.col, imageUrl)

      setTiles(prev => [...prev, { src: imageUrl, row: previewTile.row, col: previewTile.col }])
      setConfirmed(true)
      new Audio('/click.wav').play()

      setTimeout(() => {
        setConfirmed(false)
        setCapturedImage(null)
        setPreviewTile(null)
        setStep(1)
      }, 1500)
    } catch (e) {
      console.error('validatePhoto error:', e)
      alert('Erreur lors de la sauvegarde de la photo.')
    }
  }

  const applyMosaicOverlay = async (
    base64: string,
    row: number,
    col: number
  ): Promise<string> => {
    return new Promise(resolve => {
      const userImg = new Image()
      const mosaicImg = new Image()

      userImg.crossOrigin = 'anonymous'
      mosaicImg.crossOrigin = 'anonymous'

      userImg.src = base64
      mosaicImg.src = store.imageSrc!

      userImg.onload = () => {
        mosaicImg.onload = () => {
          const size = 300
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')!
          canvas.width = size
          canvas.height = size

          ctx.drawImage(userImg, 0, 0, size, size)

          const srcX = (col * mosaicImg.width) / store.cols
          const srcY = (row * mosaicImg.height) / store.rows
          const srcW = mosaicImg.width / store.cols
          const srcH = mosaicImg.height / store.rows

          ctx.globalAlpha = 0.5
          ctx.drawImage(mosaicImg, srcX, srcY, srcW, srcH, 0, 0, size, size)
          ctx.globalAlpha = 1.0

          resolve(canvas.toDataURL('image/jpeg', 0.8))
        }
      }
    })
  }

  const cancelPhoto = () => {
    setCapturedImage(null)
    setPreviewTile(null)
    setStep(1)
  }

  if (loading || !store.imageSrc) {
    return (
      <main className="flex items-center justify-center h-screen text-black text-xl bg-gray-100">
        <div className="bg-white rounded-lg shadow p-8">Chargement...</div>
      </main>
    )
  }

  // Styles identiques à ProjectGallery
  const mainButton =
    "inline-flex items-center justify-center px-6 py-3 rounded-md text-lg font-semibold bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow transition w-full"
  const validateButton =
    "flex-1 px-6 py-2 rounded-md text-lg font-medium bg-gradient-to-br from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white shadow"
  const cancelButton =
    "flex-1 px-6 py-2 rounded-md text-lg font-medium bg-gradient-to-br from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white shadow"

  const stepTexts = design?.stepTexts || {
    step1: 'Prêt à commencer ?',
    step2: 'Cadrez-vous bien !',
    step3: 'Voici votre photo, voulez-vous la valider ?',
  }

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center bg-gray-100 px-2 py-6"
      style={{
        backgroundColor: design?.backgroundColor || '#000000',
        backgroundImage: design?.backgroundImage ? `url(${design.backgroundImage})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Header gradient */}
      <div className="w-full max-w-xl mb-8">
        <div className="p-6 bg-gradient-to-br from-blue-500 via-purple-500 to-blue-500 rounded-lg shadow text-white text-center">
          <h1 className="text-2xl sm:text-4xl font-bold mb-2">📸 Photobooth – {slug}</h1>
          <p className="text-white text-opacity-80">
            Participez à la mosaïque photo de l&apos;événement !
          </p>
        </div>
      </div>

      {/* Main card */}
      <div className="w-full max-w-xl bg-white rounded-xl shadow-lg p-8 flex flex-col items-center space-y-8">
        {step === 1 && (
          <div className="space-y-6 w-full">
            <p className="text-lg sm:text-xl text-gray-800">{stepTexts.step1}</p>
            <div className="text-sm text-gray-500">
              📷 Vous êtes la photo <span className="font-bold text-indigo-700">{tiles.length + 1}</span> sur{' '}
              <span className="font-bold text-indigo-700">{totalTiles}</span>
            </div>
            <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                style={{ width: `${(tiles.length / totalTiles) * 100}%` }}
              />
            </div>
            <button
              onClick={() => setStep(2)}
              className={mainButton}
            >
              🎬 Commencer
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col items-center gap-6 w-full">
            <WebcamCapture ref={webcamRef} countdown={countdown} />
            {countdown === null && (
              <button
                onClick={handleTakePhotoClick}
                className={mainButton + ' mt-4'}
              >
                📸 {stepTexts.step2}
              </button>
            )}
          </div>
        )}

        {step === 3 && capturedImage && previewTile && (
          <div className="flex flex-col items-center space-y-4 mt-4 w-full">
            <h3 className="text-2xl font-semibold text-gray-800">{stepTexts.step3}</h3>
            <div className="flex justify-center">
              <Image
                src={capturedImage}
                alt="Aperçu"
                width={300}
                height={300}
                className="w-[300px] h-[300px] object-cover border border-gray-300 rounded-md shadow"
              />
            </div>
            <div className="flex gap-4 mt-4 w-full">
              <button
                onClick={validatePhoto}
                className={validateButton}
              >
                ✅ Valider
              </button>
              <button
                onClick={cancelPhoto}
                className={cancelButton}
              >
                ❌ Reprendre
              </button>
            </div>
            {confirmed && (
              <div className="w-full">
                <div className="p-3 mt-2 rounded bg-green-50 text-green-700 text-center font-semibold shadow">
                  ✅ Photo ajoutée !
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
