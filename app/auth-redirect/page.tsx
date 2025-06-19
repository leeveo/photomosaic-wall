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
    // SIMPLIFIED: Get the returnTo URL from the query parameters
    const returnTo = searchParams?.get('returnTo') || '/admin'
    console.log('Auth redirect - Return to:', returnTo)
    
    // Check for localStorage token first (simplest approach)
    const localToken = localStorage.getItem('auth_token')
    
    if (localToken) {
      console.log('Found token in localStorage, setting cookie and redirecting')
      // Set a cookie flag to indicate localStorage has a token
      document.cookie = `shared_auth_token=${localToken}; path=/; max-age=${60*60*24*30}`
      document.cookie = 'has_auth_in_ls=true; path=/; max-age=3600'
      
      // DIRECT redirect with token in URL for maximum compatibility
      const targetUrl = new URL(returnTo, window.location.origin)
      targetUrl.searchParams.set('token', localToken)
      
      // Immediate redirect
      window.location.href = targetUrl.toString()
      return
    }
    
    // No token found, set up login redirect
    setStatus('Vous devez vous authentifier pour accéder à cette page')
    
    // SIMPLIFIED: redirect to login
    const loginBaseUrl = process.env.NEXT_PUBLIC_AUTH_LOGIN_URL || 
                'https://photobooth.waibooth.app/photobooth-ia/admin/login'
    
    // SIMPLIFIED: Keep URLs simple to avoid encoding issues
    const returnUrl = `${window.location.origin}/auth-success?returnTo=${encodeURIComponent(returnTo)}`
    const callbackUrl = `${window.location.origin}/api/auth/callback`
    
    const loginUrl = `${loginBaseUrl}?returnUrl=${encodeURIComponent(returnUrl)}&callbackUrl=${encodeURIComponent(callbackUrl)}&shared=true`
    
    console.log('Will redirect to:', loginUrl)
    
    // Start countdown for redirect
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer)
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
        
        <div className="flex flex-col gap-4">
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="font-medium text-yellow-800 mb-2">Problème de redirection?</h3>
            <p className="text-sm text-yellow-700 mb-2">
              Si vous êtes coincé dans une boucle de redirection, essayez d'accéder directement:
            </p>
            <div className="flex gap-2">
              <a 
                href="/admin?bypass=true" 
                className="flex-1 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded transition-colors text-center text-sm"
              >
                Accès direct admin
              </a>
            </div>
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
                const returnTo = searchParams?.get('returnTo') || '/admin'
                const loginBaseUrl = process.env.NEXT_PUBLIC_AUTH_LOGIN_URL || 
                          'https://photobooth.waibooth.app/photobooth-ia/admin/login'
                const returnUrl = `${window.location.origin}/auth-success?returnTo=${encodeURIComponent(returnTo)}`
                const callbackUrl = `${window.location.origin}/api/auth/callback`
                window.location.href = `${loginBaseUrl}?returnUrl=${encodeURIComponent(returnUrl)}&callbackUrl=${encodeURIComponent(callbackUrl)}&shared=true`
              }}
              className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors"
            >
              Se connecter
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
