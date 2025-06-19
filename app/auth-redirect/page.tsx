'use client'

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

// Loading state component
function AuthRedirectLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600">
      <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Redirection en cours...</h1>
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
          <p className="text-blue-700">Préparation de l'authentification</p>
          <div className="flex items-center mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div className="bg-blue-600 h-2.5 rounded-full w-1/2 animate-pulse"></div>
            </div>
          </div>
        </div>
        <div className="flex space-x-4">
          <button 
            onClick={() => window.location.href = '/'}
            className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded transition-colors"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    </div>
  );
}

// Main component with useSearchParams in a Suspense boundary
export default function AuthRedirectPage() {
  return (
    <Suspense fallback={<AuthRedirectLoading />}>
      <AuthRedirectContent />
    </Suspense>
  );
}

// Client component that uses useSearchParams
function AuthRedirectContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState('Redirection en cours...')
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    // Get the returnTo URL from the query parameters
    const returnTo = searchParams.get('returnTo') || '/admin'
    
    // Check if we have a token in localStorage
    const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('auth_token')
    
    // Set a cookie flag to indicate localStorage has a token (middleware will check this)
    if (hasToken) {
      document.cookie = 'has_auth_in_ls=true; path=/; max-age=3600'
      setStatus('Vous êtes déjà authentifié. Redirection vers l\'administration...')
      
      // Redirect immediately with the token in URL
      const token = localStorage.getItem('auth_token')
      router.push(`${returnTo}${returnTo.includes('?') ? '&' : '?'}token=${token}`)
      return
    }
    
    // User needs to authenticate
    setStatus('Vous devez vous authentifier pour accéder à cette page')
    
    // Start countdown
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          // Build the login redirect
          const loginBaseUrl = process.env.NEXT_PUBLIC_AUTH_LOGIN_URL || 
                        'https://photobooth.waibooth.app/photobooth-ia/admin/login'
                        
          const returnUrl = encodeURIComponent(window.location.origin + '/auth-success?returnTo=' + encodeURIComponent(returnTo))
          const callbackUrl = encodeURIComponent(`${window.location.origin}/api/auth/callback`)
          const loginUrl = `${loginBaseUrl}?returnUrl=${returnUrl}&callbackUrl=${callbackUrl}&shared=true`
          
          // Redirect to login
          window.location.href = loginUrl
        }
        return prev - 1
      })
    }, 1000)
    
    return () => clearInterval(timer)
  }, [router, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600">
      <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Authentification requise</h1>
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
          <p className="text-blue-700">{status}</p>
          {countdown > 0 && (
            <p className="text-blue-500 mt-2">
              Redirection automatique dans {countdown} seconde{countdown !== 1 ? 's' : ''}...
            </p>
          )}
        </div>
        <div className="flex space-x-4">
          <button 
            onClick={() => window.location.href = '/'}
            className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded transition-colors"
          >
            Retour à l'accueil
          </button>
          <button
            onClick={() => {
              const returnTo = searchParams.get('returnTo') || '/admin'
              const loginBaseUrl = process.env.NEXT_PUBLIC_AUTH_LOGIN_URL || 
                          'https://photobooth.waibooth.app/photobooth-ia/admin/login'
              const returnUrl = encodeURIComponent(window.location.origin + '/auth-success?returnTo=' + encodeURIComponent(returnTo))
              const callbackUrl = encodeURIComponent(`${window.location.origin}/api/auth/callback`)
              window.location.href = `${loginBaseUrl}?returnUrl=${returnUrl}&callbackUrl=${callbackUrl}&shared=true`
            }}
            className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors"
          >
            Se connecter
          </button>
        </div>
      </div>
    </div>
  )
}
