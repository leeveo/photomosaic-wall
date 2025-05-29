'use client'

import { Suspense } from 'react'
import PhotoPage from '@/components/PhotoPage'

export default function PhotoPageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md">
        Chargement du photobooth...
      </div>
    </div>}>
      <PhotoPage />
    </Suspense>
  )
}
