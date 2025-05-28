'use client'

import { useEffect, useRef, useState } from 'react'
import { usePhotoMosaicStore } from '@/lib/store'

type MosaicTile = {
  src: string
  row: number
  col: number
}

type Props = {
  tiles: MosaicTile[]
}

export default function MosaicCanvas({ tiles }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })

  const { imageSrc, rows, cols } = usePhotoMosaicStore()

  useEffect(() => {
    const resize = () => {
      setCanvasSize({ width: window.innerWidth, height: window.innerHeight })
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  useEffect(() => {
    const draw = async () => {
      const canvas = canvasRef.current
      if (!canvas || !imageSrc || !rows || !cols) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const canvasW = canvasSize.width
      const canvasH = canvasSize.height
      const cellSize = Math.floor(Math.min(canvasW / cols, canvasH / rows))
      const totalWidth = cellSize * cols
      const totalHeight = cellSize * rows
      const offsetX = Math.floor((canvasW - totalWidth) / 2)
      const offsetY = Math.floor((canvasH - totalHeight) / 2)

      canvas.width = canvasW
      canvas.height = canvasH
      ctx.clearRect(0, 0, canvasW, canvasH)

      const mainImage = new Image()
      mainImage.crossOrigin = 'anonymous'
      mainImage.src = imageSrc
      await new Promise((res) => (mainImage.onload = res))
      for (const tile of tiles) {
        if (!tile?.src || typeof tile.row !== 'number' || typeof tile.col !== 'number') {
          console.warn('Tile invalide ignorée:', tile)
          continue
        }
      
        const x = offsetX + tile.col * cellSize
        const y = offsetY + tile.row * cellSize
      
        try {
          const userImg = new Image()
          userImg.crossOrigin = 'anonymous'
          userImg.src = tile.src
          await new Promise((res, rej) => {
            userImg.onload = res
            userImg.onerror = rej
          })
      
          // Effet de fondu
          for (let alpha = 0; alpha <= 1; alpha += 0.1) {
            ctx.globalAlpha = alpha
            ctx.drawImage(userImg, x, y, cellSize, cellSize)
            await new Promise((res) => setTimeout(res, 30)) // Pause pour l'effet
          }
          ctx.globalAlpha = 1.0 // Réinitialiser l'opacité
        } catch {
          // Image échouée → remplissage gris
          ctx.fillStyle = '#ccc'
          ctx.fillRect(x, y, cellSize, cellSize)
        }
      
        // Overlay partie de l’image principale
        const srcW = mainImage.width / cols
        const srcH = mainImage.height / rows
        const srcX = tile.col * srcW
        const srcY = tile.row * srcH
      
        ctx.globalAlpha = 0.4
        ctx.drawImage(mainImage, srcX, srcY, srcW, srcH, x, y, cellSize, cellSize)
        ctx.globalAlpha = 1.0
      
        // Label
        ctx.fillStyle = '#000'
        ctx.font = 'bold 12px sans-serif'
        ctx.textAlign = 'right'
        ctx.textBaseline = 'bottom'
        ctx.fillText(`${String.fromCharCode(65 + tile.row)}-${tile.col + 1}`, x + cellSize - 6, y + cellSize - 6)
      }
    }

    if (tiles.length && imageSrc && canvasSize.width > 0) {
      draw()
    }
  }, [tiles, imageSrc, rows, cols, canvasSize])

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100vw',
        height: '100vh',
        display: 'block',
        backgroundColor: '#fff',
      }}
    />
  )
}
