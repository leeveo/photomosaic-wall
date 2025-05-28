'use client'

import { useEffect, useRef } from 'react'

export default function GridPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()
    img.src = '/main.jpg' // image initiale

    img.onload = () => {
      const rows = 5
      const cols = 8
      const width = canvas.width
      const height = canvas.height
      const cellW = width / cols
      const cellH = height / rows

      // Dessiner image
      ctx.drawImage(img, 0, 0, width, height)

      // Grille
      ctx.strokeStyle = '#000'
      ctx.lineWidth = 1
      ctx.font = 'bold 14px sans-serif'
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const coord = `${String.fromCharCode(65 + y)}-${x + 1}`
          const x0 = x * cellW
          const y0 = y * cellH

          // rectangle
          ctx.strokeRect(x0, y0, cellW, cellH)

          // texte au centre
          ctx.fillText(coord, x0 + cellW / 2, y0 + cellH / 2)
        }
      }
    }
  }, [])

  return (
    <div style={{ margin: '1rem 0' }}>
      <canvas ref={canvasRef} width={800} height={500} />
    </div>
  )
}
