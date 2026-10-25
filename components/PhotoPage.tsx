'use client'

import { availablePositions, loadCanvasImage } from '@/lib/mosaic'
import { useEffect, useState, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import WebcamCapture, { WebcamCaptureHandle } from '@/components/WebcamCapture'
import { usePhotoMosaicStore } from '@/lib/store'
import { reserveTile, submitReservedTile, type TileReservation, loadTiles } from '@/lib/db.client'
import { supabase } from '@/lib/supabase'
import { ensureEventAccess } from '@/lib/guest'
import { resolveMedia } from '@/lib/media'
import Image from 'next/image'

type MosaicTile = { src: string; row: number; col: number }

type BoothConfig = {
  backgroundColor: string
  backgroundImage: string
  buttonColor: string
  stepTexts: { step1: string; step2: string; step3: string }
}

function PhotoPageForProject() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const slug = searchParams.get('id')

  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const captureTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savingRef = useRef(false)
  const [tiles, setTiles] = useState<MosaicTile[]>([])
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [previewTile, setPreviewTile] = useState<TileReservation | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [design, setDesign] = useState<BoothConfig | null>(null)
  const [totalTiles, setTotalTiles] = useState(0)

  const webcamRef = useRef<WebcamCaptureHandle>(null)
  const store = usePhotoMosaicStore()
  const setImage = usePhotoMosaicStore(state => state.setImage)
  const setGrid = usePhotoMosaicStore(state => state.setGrid)

  useEffect(() => {
    let cancelled = false
    const init = async () => {
      if (!slug) return router.push('/admin')

      await ensureEventAccess(slug)
      const { data: setup, error } = await supabase
        .from('setups')
        .select('rows, cols, image')
        .eq('project_slug', slug)
        .single()

      if (error || !setup) {
        console.error('Erreur setup:', error)
        throw new Error('Event unavailable')
      }

      const imageUrl = await resolveMedia(setup.image)
      if (!imageUrl) throw new Error('Image unavailable')

      if (cancelled) return
      setImage(imageUrl)
      setGrid(setup.rows, setup.cols)
      setTotalTiles(setup.rows * setup.cols)

      const t = await loadTiles(slug)
      if (cancelled) return
      setTiles(t.map(tile => ({ src: tile.image_url, row: tile.row, col: tile.col })))

      const { data: dsgn } = await supabase
        .from('designs')
        .select('*')
        .eq('project_slug', slug)
        .single()

      if (cancelled) return
      if (dsgn) {
        setDesign({
          backgroundColor: dsgn.background_color || '#000000',
          backgroundImage: await resolveMedia(dsgn.background_image),
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

    init().catch(() => { if (cancelled) return; setErrorMessage('Impossible de charger cet événement. Réessayez dans quelques instants.'); setLoading(false) })
    return () => { cancelled = true }
  }, [slug, router, setImage, setGrid])

  useEffect(() => () => {
    if (captureTimer.current) clearTimeout(captureTimer.current)
    if (resetTimer.current) clearTimeout(resetTimer.current)
  }, [])

  const handleTakePhotoClick = () => {
    if (captureTimer.current || countdown !== null) return
    setErrorMessage(null)
    let remaining = 3
    setCountdown(remaining)
    const tick = async () => {
      remaining -= 1
      if (remaining > 0) {
        setCountdown(remaining)
        captureTimer.current = setTimeout(tick, 1000)
        return
      }
      captureTimer.current = null
      setCountdown(null)
      try {
        const base64 = await webcamRef.current?.takePhoto()
        if (!base64) throw new Error('La caméra n’est pas prête. Vérifiez son autorisation puis réessayez.')
        const free = availablePositions(store.rows, store.cols, tiles)
        if (!free.length) throw new Error('Cette mosaïque est complète. Merci pour votre participation !')
        setCapturedImage(base64)
        setPreviewTile(await reserveTile(slug!))
        setStep(3)
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'La capture a échoué.')
      }
    }
    captureTimer.current = setTimeout(tick, 1000)
  }

  const validatePhoto = async () => {
    if (savingRef.current || confirmed) return
    savingRef.current = true
    setSaving(true)
    setErrorMessage(null)
    try {
      if (!capturedImage || !previewTile || !slug) {
        return
      }

      const finalImage = await applyMosaicOverlay(capturedImage, previewTile.row, previewTile.col)
      const result = await submitReservedTile(previewTile, finalImage)
      const imageUrl = result.image_url

      setTiles(prev => [...prev, { src: imageUrl, row: previewTile.row, col: previewTile.col }])
      setConfirmed(true)
      void new Audio('/click.wav').play().catch(() => {})

      resetTimer.current = setTimeout(() => {
        setConfirmed(false)
        setCapturedImage(null)
        setPreviewTile(null)
        setStep(1)
      }, 1500)
    } catch (e) {
      console.error('validatePhoto error:', e)
      setErrorMessage('La photo n’a pas été enregistrée. Réessayez ; si la place a été prise, reprenez une photo.')
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  const applyMosaicOverlay = async (
    base64: string,
    row: number,
    col: number
  ): Promise<string> => {
    if (!store.imageSrc) throw new Error('Image de la mosaïque manquante.')
    const [userImg, mosaicImg] = await Promise.all([
      loadCanvasImage(base64), loadCanvasImage(store.imageSrc),
    ])
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 300
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Le navigateur ne peut pas composer la photo.')
    ctx.drawImage(userImg, 0, 0, 300, 300)
    ctx.globalAlpha = 0.5
    const srcW = mosaicImg.width / store.cols
    const srcH = mosaicImg.height / store.rows
    ctx.drawImage(mosaicImg, col * srcW, row * srcH, srcW, srcH, 0, 0, 300, 300)
    return canvas.toDataURL('image/jpeg', 0.8)
  }

  const cancelPhoto = () => {
    setCapturedImage(null)
    setPreviewTile(null)
    setStep(1)
  }

  if (errorMessage && loading === false && !totalTiles) return <main className="connection-page"><p role="alert" className="wall-error">{errorMessage}</p><button className="btn-primary" onClick={() => window.location.reload()}>Réessayer</button></main>

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
        backgroundColor: design?.backgroundColor || '#f5f0ff',
        backgroundImage: design?.backgroundImage ? `url(${design.backgroundImage})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Header gradient */}
      <div className="w-full max-w-xl mb-8">
        <div className="p-6 bg-gradient-to-br from-violet-600 to-purple-500 rounded-2xl shadow text-white text-center">
          <h1 className="text-2xl sm:text-4xl font-bold mb-2">📸 Photobooth – {slug}</h1>
          <p className="text-white text-opacity-80">
            Participez à la mosaïque photo de l&apos;événement !
          </p>
        </div>
      </div>

      {/* Main card */}
      <div className="w-full max-w-xl bg-white rounded-xl shadow-lg p-8 flex flex-col items-center space-y-8">
        {errorMessage && <p role="alert" className="wall-error">{errorMessage}</p>}
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
              disabled={tiles.length >= totalTiles}
              onClick={() => setStep(2)}
              className={mainButton}
              style={design?.buttonColor ? { background: design.buttonColor } : undefined}
            >
              {tiles.length >= totalTiles ? 'Mosaïque complète — merci !' : 'Commencer l’expérience'}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col items-center gap-6 w-full">
            <WebcamCapture ref={webcamRef} countdown={countdown ?? undefined} />
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
                disabled={saving || confirmed}
                onClick={validatePhoto}
                className={validateButton}
              >
                {saving ? 'Enregistrement…' : 'Valider ma photo'}
              </button>
              <button
                disabled={saving || confirmed}
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

export default function PhotoPage() {
  const searchParams = useSearchParams()
  return <PhotoPageForProject key={searchParams.get('id') || ''} />
}
