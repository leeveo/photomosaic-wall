'use client'

import EnvironmentGate from '@/components/EnvironmentGate'

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

function SetupPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const slug = searchParams.get('id')

  const { setImage, setGrid } = usePhotoMosaicStore()

  const [saving, setSaving] = useState(false)
  const [rows, setRows] = useState(5)
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null)
  const [localPreview, setLocalPreview] = useState<string | null>(null)
  const [selectedFormat, setSelectedFormat] = useState<LabelFormat | null>(LABEL_FORMATS[0])

  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!slug) {
      router.push('/admin')
    }
  }, [slug, router])

  const cols = imageSize && selectedFormat
    ? Math.max(1, Math.min(500, Math.round(rows * (imageSize.width / imageSize.height) / (selectedFormat.widthMM / selectedFormat.heightMM))))
    : 8

  // Wrap drawGridPreview in useCallback to prevent infinite re-renders
  const drawGridPreview = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !localPreview || !imageSize) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new window.Image()
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
    img.src = localPreview
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
      img.onerror = () => alert('Le fichier sélectionné n’est pas une image valide.')
      img.src = result
    }
    reader.onerror = () => alert('Impossible de lire ce fichier.')
    reader.readAsDataURL(file)
  }

  const handleStart = async () => {
    if (!slug || !localPreview || saving) return
    setSaving(true)

    try {
      const { error } = await supabase.from('setups').upsert([{
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
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="setup-page wall-panel">
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
          onChange={(e) => setRows(Math.max(1, Math.min(50, Math.floor(Number(e.target.value)) || 1)))}
          min={1}
          max={50}
        />
        <span style={{ marginLeft: 16 }}>
          Colonnes : <strong>{cols}</strong>
        </span>
      </div>

      <button className="btn-primary" disabled={!localPreview || saving} onClick={handleStart}>
        {saving ? 'Enregistrement…' : 'Lancer le mur photo'}
      </button>
    </div>
  )
}

function SetupPageContentWrapper() {
  return (
    <Suspense fallback={<div className="setup-page wall-panel">Chargement de la configuration...</div>}>
      <SetupPageContent />
    </Suspense>
  )
}

export default function SetupPage() {
  return <EnvironmentGate><SetupPageContentWrapper /></EnvironmentGate>
}
