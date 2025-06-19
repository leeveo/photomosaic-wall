'use client'

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

// Loading state component
function AuthSuccessLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-500 to-teal-600">
      <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full text-center">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Finalisation de l'authentification...</h1>
        <p className="text-gray-600 mb-6">
          Veuillez patienter pendant que nous traitons votre connexion.
        </p>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-green-500 animate-pulse"
            style={{ width: '50%' }}
          />
        </div>
      </div>
    </div>
  );
}

// Main component with Suspense boundary
export default function AuthSuccessPage() {
  return (
    <Suspense fallback={<AuthSuccessLoading />}>
      <AuthSuccessContent />
    </Suspense>
  );
}

function AuthSuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [countdown, setCountdown] = useState(2) // Reduced to 2 seconds for faster experience
  const [token, setToken] = useState<string | null>(null)
  const [status, setStatus] = useState('Initialisation de la session...')

  useEffect(() => {
    // Get token from URL
    const tokenParam = searchParams?.get('token')
    const returnTo = searchParams?.get('returnTo') || '/admin'
    
    console.log('Auth success - Token in URL:', !!tokenParam)
    
    // IMPORTANT: Save token if present
    if (tokenParam) {
      setToken(tokenParam)
      setStatus('Session initialisée avec succès')
      
      // Store token in ALL possible places for maximum compatibility
      localStorage.setItem('auth_token', tokenParam)
      document.cookie = `shared_auth_token=${tokenParam}; path=/; max-age=${60*60*24*30}`
      document.cookie = 'has_auth_in_ls=true; path=/; max-age=3600'
      
      // Start countdown for redirect
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer)
            // Add token to URL to ensure middleware passes auth check
            router.push(`${returnTo}?token=${tokenParam}`)
          }
          return prev - 1
        })
      }, 1000)
      
      return () => clearInterval(timer)
    } else {
      // No token in URL, check for existing token
      const existingToken = localStorage.getItem('auth_token')
      
      if (existingToken) {
        setToken(existingToken)
        setStatus('Session existante trouvée')
        
        // Refresh cookies with existing token
        document.cookie = `shared_auth_token=${existingToken}; path=/; max-age=${60*60*24*30}`
        document.cookie = 'has_auth_in_ls=true; path=/; max-age=3600'
        
        // Start countdown for redirect with existing token
        const timer = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) {
              clearInterval(timer)
              router.push(`${returnTo}?token=${existingToken}`)
            }
            return prev - 1
          })
        }, 1000)
        
        return () => clearInterval(timer)
      } else {
        setStatus('Aucune session trouvée')
      }
    }
  }, [router, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-500 to-teal-600">
      <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full text-center">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
          {token ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          )}
        </div>
        
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          {token ? "Session initialisée" : "Problème d'authentification"}
        </h1>
        
        {token ? (
          <>
            <p className="text-gray-600 mb-6">
              Vous allez être redirigé dans {countdown} seconde{countdown !== 1 ? 's' : ''}...
            </p>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 transition-all duration-1000"
                style={{ width: `${(2 - countdown) / 2 * 100}%` }}
              />
            </div>
            
            {/* Emergency bypass button */}
            <button
              onClick={() => {
                const returnTo = searchParams?.get('returnTo') || '/admin'
                router.push(`${returnTo}?bypass=true`)
              }}
              className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded"
            >
              Accéder immédiatement
            </button>
          </>
        ) : (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-4 text-left">
            <p className="text-yellow-700">{status}</p>
            <div className="mt-4 space-y-2">
              <a 
                href="/admin?bypass=true" 
                className="block w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-center"
              >
                Accès direct admin
              </a>
              <a 
                href={process.env.NEXT_PUBLIC_AUTH_LOGIN_URL || 'https://photobooth.waibooth.app/photobooth-ia/admin/login'} 
                className="block w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded text-center"
              >
                Se connecter sur l'app principale
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
