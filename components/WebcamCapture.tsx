'use client'

import { forwardRef, useImperativeHandle, useRef, useState, useEffect } from 'react'
import Webcam from 'react-webcam'

export type WebcamCaptureHandle = {
  takePhoto: () => Promise<string>
}

type Props = {
  countdown?: number
}

const WebcamCapture = forwardRef<WebcamCaptureHandle, Props>(({ countdown }, ref) => {
  const webcamRef = useRef<Webcam>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')
  const [hasWebcamAccess, setHasWebcamAccess] = useState(true)

  useImperativeHandle(ref, () => ({
    takePhoto: async () => {
      return new Promise((resolve) => {
        const screenshot = webcamRef.current?.getScreenshot()
        if (!screenshot) return resolve('')

        const img = new Image()
        img.src = screenshot
        img.onload = () => {
          const size = Math.min(img.width, img.height)
          const canvas = document.createElement('canvas')
          canvas.width = size
          canvas.height = size
          const ctx = canvas.getContext('2d')
          if (!ctx) return resolve('')

          const offsetX = (img.width - size) / 2
          const offsetY = (img.height - size) / 2
          ctx.drawImage(img, offsetX, offsetY, size, size, 0, 0, size, size)
          resolve(canvas.toDataURL('image/jpeg'))
        }
        img.onerror = () => resolve('')
      })
    }
  }))

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(() => setHasWebcamAccess(true))
      .catch(() => setHasWebcamAccess(false))
  }, [facingMode])

  if (!hasWebcamAccess) {
    return (
      <div className="bg-black text-white p-4 text-center rounded-lg">
        ❌ Accès à la caméra refusé. Vérifiez les permissions du navigateur.
      </div>
    )
  }

  return (
    <div className="relative w-full max-w-[600px] aspect-square border-4 border-white rounded-lg overflow-hidden bg-black">
      <Webcam
        ref={webcamRef}
        audio={false}
        screenshotFormat="image/jpeg"
        videoConstraints={{
          width: 1080,
          height: 1080,
          facingMode,
        }}
        mirrored={facingMode === 'user'}
        className="w-full h-full object-cover"
      />

      {countdown !== null && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black bg-opacity-20">
          <span className="text-white text-6xl sm:text-8xl font-bold">{countdown}</span>
        </div>
      )}

      <button
        onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')}
        className="absolute bottom-3 left-3 px-3 py-1 text-sm rounded bg-white text-black font-semibold shadow md:hidden z-20"
      >
        🔄 Caméra
      </button>
    </div>
  )
})

WebcamCapture.displayName = 'WebcamCapture'

export default WebcamCapture
