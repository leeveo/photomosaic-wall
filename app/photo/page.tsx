'use client'

import EnvironmentGate from '@/components/EnvironmentGate'

import { Suspense } from 'react'
import PhotoPage from '@/components/PhotoPage'

function PhotoPageWrapperContentWrapper() {
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

export default function PhotoPageWrapper() {
  return <EnvironmentGate><PhotoPageWrapperContentWrapper /></EnvironmentGate>
}
