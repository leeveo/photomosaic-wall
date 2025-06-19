'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Admin page error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Dashboard Error</h2>
        <p className="text-gray-700 mb-6">
          There was a problem loading the admin dashboard. This might be due to an authentication issue.
        </p>
        <div className="space-y-4">
          <button
            onClick={() => reset()}
            className="w-full px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            Try again
          </button>
          <Link 
            href="/"
            className="block text-center w-full px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            Go to homepage
          </Link>
          <div className="border-t pt-4 mt-4">
            <p className="text-sm text-gray-500 mb-2">Need to log in again?</p>
            <a 
              href="https://photobooth.waibooth.app/photobooth-ia/admin/login"
              className="block text-center w-full px-5 py-2.5 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
            >
              Go to login page
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
