'use client'

import { useEffect } from 'react'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Admin page error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong!</h2>
        <p className="text-gray-700 mb-6">
          An error occurred while loading the admin dashboard. This might be due to a temporary issue with the server or your connection.
        </p>
        <div className="space-y-4">
          <button
            onClick={() => reset()}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            Try again
          </button>
          <div>
            <a 
              href="/api/auth/logout" 
              className="inline-block mt-4 text-indigo-600 hover:text-indigo-800 hover:underline"
            >
              Back to login
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
