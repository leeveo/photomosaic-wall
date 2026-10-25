'use client'

import { useEffect, useRef, useState } from 'react'
import { usePhotoMosaicStore } from '@/lib/store'
import { loadCanvasImage } from '@/lib/mosaic'

type MosaicTile = { src: string; row: number; col: number }

export default function MosaicCanvas({ tiles }: { tiles: MosaicTile[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState(false)
  const { imageSrc, rows, cols } = usePhotoMosaicStore()
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !imageSrc || rows < 1 || cols < 1) return
    const context = canvas.getContext('2d')
    if (!context) return
    let cancelled = false
    let generation = 0
    const draw = async () => {
      const current = ++generation
      try {
        const main = await loadCanvasImage(imageSrc)
        const images = await Promise.all(tiles.map(tile => loadCanvasImage(tile.src).catch(() => null)))
        if (cancelled || current !== generation) return
        setError(false)
        const width = canvas.clientWidth
        const height = canvas.clientHeight
        const ratio = Math.min(width / main.width, height / main.height)
        const w = main.width * ratio
        const h = main.height * ratio
        const x = (width - w) / 2
        const y = (height - h) / 2
        const density = window.devicePixelRatio || 1
        canvas.width = width * density
        canvas.height = height * density
        context.scale(density, density)
        context.fillStyle = '#18181b'
        context.fillRect(0, 0, width, height)
        context.globalAlpha = .2
        context.drawImage(main, x, y, w, h)
        context.globalAlpha = 1
        tiles.forEach((tile, i) => {
          const image = images[i]
          if (!image || tile.row < 0 || tile.row >= rows || tile.col < 0 || tile.col >= cols) return
          // Photos already contain their mosaic overlay when saved.
          context.drawImage(image, x + tile.col * w / cols, y + tile.row * h / rows, w / cols, h / rows)
        })
      } catch {
        if (!cancelled) setError(true)
      }
    }
    void draw()
    const observer = new ResizeObserver(() => { void draw() })
    observer.observe(canvas)
    return () => { cancelled = true; observer.disconnect() }
  }, [tiles, imageSrc, rows, cols])

  return <>
    {error && <p role="alert" className="wall-error">Impossible de charger l’image du mur photo.</p>}
    <canvas ref={canvasRef} aria-label={`Mosaïque : ${tiles.length} photos, ${rows} lignes et ${cols} colonnes`} style={{ width: '100%', height: '100dvh', display: 'block', background: '#18181b' }} />
  </>
}
