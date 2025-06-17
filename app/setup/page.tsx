'use client'

import { Suspense, useEffect, useRef, useState, useCallback } from 'react'
import { usePhotoMosaicStore } from '@/lib/store'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type LabelFormat = {
  name: string
  widthMM: number
  heightMM: number
}

const LABEL_FORMATS: LabelFormat[] = [
  { name: '76mm x 76mm', widthMM: 76, heightMM: 76 },
  { name: '60mm x 40mm', widthMM: 60, heightMM: 40 },
  { name: '100mm x 150mm', widthMM: 100, heightMM: 150 }
]

// Le composant content qui utilise useSearchParams doit être enveloppé dans un Suspense
function SetupPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const slug = searchParams?.get('id') || ''

  const { setImage, setGrid } = usePhotoMosaicStore()

  const [rows, setRows] = useState(5)
  const [cols, setCols] = useState(8)
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null)
  const [localPreview, setLocalPreview] = useState<string | null>(null)
  const [selectedFormat, setSelectedFormat] = useState<LabelFormat | null>(LABEL_FORMATS[0])

  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!slug) {
      alert('ID manquant dans URL.')
      router.push('/admin')
    }
  }, [slug, router])

  useEffect(() => {
    if (!imageSize || !selectedFormat) return
    const imageRatio = imageSize.width / imageSize.height
    const labelRatio = selectedFormat.widthMM / selectedFormat.heightMM
    const calculatedCols = Math.round(rows * imageRatio * labelRatio)
    setCols(calculatedCols)
  }, [rows, selectedFormat, imageSize])

  // Wrap drawGridPreview in useCallback to prevent infinite re-renders
  const drawGridPreview = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !localPreview || !imageSize) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new window.Image()
    img.src = localPreview
    img.onload = () => {
      const { width, height } = img
      canvas.width = width
      canvas.height = height

      const cellW = width / cols
      const cellH = height / rows

      ctx.clearRect(0, 0, width, height)
      ctx.drawImage(img, 0, 0, width, height)

      ctx.strokeStyle = 'red'
      ctx.lineWidth = 1

      for (let r = 0; r <= rows; r++) {
        ctx.beginPath()
        ctx.moveTo(0, r * cellH)
        ctx.lineTo(width, r * cellH)
        ctx.stroke()
      }

      for (let c = 0; c <= cols; c++) {
        ctx.beginPath()
        ctx.moveTo(c * cellW, 0)
        ctx.lineTo(c * cellW, height)
        ctx.stroke()
      }
    }
  }, [localPreview, rows, cols, imageSize])

  useEffect(() => {
    drawGridPreview()
  }, [drawGridPreview])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const img = new window.Image()
      img.src = result
      img.onload = () => {
        const maxWidth = 800
        const scale = img.width > maxWidth ? maxWidth / img.width : 1
        const canvas = document.createElement('canvas')
        canvas.width = img.width * scale
        canvas.height = img.height * scale

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        const compressed = canvas.toDataURL('image/jpeg', 0.7)
        setLocalPreview(compressed)
        setImageSize({ width: canvas.width, height: canvas.height })
      }
    }
    reader.readAsDataURL(file)
  }

  const handleStart = async () => {
    if (!slug || !localPreview) return

    try {
      // Supprimer un ancien setup s'il existe
      await supabase.from('setups').delete().eq('project_slug', slug)

      // Ajouter le nouveau setup
      const { error } = await supabase.from('setups').insert([{
        project_slug: slug,
        image: localPreview,
        rows,
        cols
      }])

      if (error) {
        console.error('Erreur insert setup:', error)
        alert('Erreur lors de la sauvegarde du setup.')
        return
      }

      setImage(localPreview)
      setGrid(rows, cols)

      router.push(`/photo?id=${slug}`)
    } catch (e) {
      console.error('handleStart error:', e)
      alert('Impossible de démarrer la mosaïque.')
    }
  }

  return (
    <div style={{ padding: 32 }}>
      <h1>🛠️ Configuration du projet {slug}</h1>

      <div style={{ marginBottom: 24 }}>
        <label>Image principale :</label><br />
        <input type="file" accept="image/*" onChange={handleFileChange} ref={fileInputRef} />
      </div>

      <div style={{ marginBottom: 24 }}>
        <h3>📐 Format d’étiquette :</h3>
        {LABEL_FORMATS.map((format) => (
          <label key={format.name} style={{ display: 'block', marginBottom: 6 }}>
            <input
              type="radio"
              name="format"
              checked={selectedFormat?.name === format.name}
              onChange={() => setSelectedFormat(format)}
              style={{ marginRight: 8 }}
            />
            {format.name}
          </label>
        ))}
      </div>

      {localPreview && (
        <div style={{ marginBottom: 24 }}>
          <h3>
            Aperçu ({rows} × {cols} → <strong>{rows * cols} images</strong>)
          </h3>
          {imageSize && (
            <>
              <p style={{ fontStyle: 'italic', marginBottom: 8 }}>
                Dimensions : {imageSize.width}px × {imageSize.height}px
              </p>
              <p style={{ fontSize: '12px', color: '#555' }}>
                Tuiles carrées : {Math.abs((cols / rows) - (imageSize.width / imageSize.height)) < 0.01 ? '✅ OK' : '❌ Non-carrées'}
              </p>
            </>
          )}
          <canvas
            ref={canvasRef}
            style={{ maxWidth: '100%', border: '1px solid #ccc' }}
          />
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <label>Lignes :</label>
        <input
          type="number"
          value={rows}
          onChange={(e) => setRows(Number(e.target.value))}
          min={1}
          max={50}
        />
        <span style={{ marginLeft: 16 }}>
          Colonnes : <strong>{cols}</strong>
        </span>
      </div>

      <button onClick={handleStart} style={{ padding: '1rem 2rem', fontSize: '18px' }}>
        🚀 Lancer le mur photo
      </button>
    </div>
  )
}

// Le composant principal qui enveloppe avec Suspense
export default function SetupPage() {
  // Déplacer le store et la fonction setProjectDetails ici si nécessaire
  const { setImage, setGrid } = usePhotoMosaicStore()
  
  return (
    <Suspense fallback={<div style={{ padding: 32 }}>Chargement de la configuration...</div>}>
      <SetupPageContent />
    </Suspense>
  )
}
