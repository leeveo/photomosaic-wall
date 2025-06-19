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

// Client component with the actual logic
function AuthSuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [countdown, setCountdown] = useState(3)
  const [token, setToken] = useState<string | null>(null)
  const [status, setStatus] = useState('Traitement de l\'authentification...')

  useEffect(() => {
    // SIMPLIFIED: Get the token and returnTo from the URL
    const tokenParam = searchParams?.get('token')
    const returnTo = searchParams?.get('returnTo') || '/admin'
    
    console.log('Auth success - Token present:', !!tokenParam, 'Return to:', returnTo)
    
    // Store the token if found
    if (tokenParam) {
      setToken(tokenParam)
      setStatus('Token reçu avec succès')
      
      // IMPROVED: Store token in all possible locations for maximum compatibility
      console.log('Storing token in localStorage and cookies')
      localStorage.setItem('auth_token', tokenParam)
      
      // Set various cookies for different scenarios
      document.cookie = `shared_auth_token=${tokenParam}; path=/; max-age=${60*60*24*30}`
      document.cookie = `shared_auth_token_js=${tokenParam}; path=/; max-age=${60*60*24*30}`
      document.cookie = 'has_auth_in_ls=true; path=/; max-age=3600'
      
      // Start redirect countdown
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer)
            
            // DIRECT REDIRECT with token in URL for maximum compatibility
            // This ensures middleware will detect the token
            const targetUrl = new URL(returnTo, window.location.origin)
            targetUrl.searchParams.set('token', tokenParam)
            
            console.log('Redirecting to:', targetUrl.toString())
            window.location.href = targetUrl.toString()
          }
          return prev - 1
        })
      }, 1000)
      
      return () => clearInterval(timer)
    } else {
      // No token in URL, check localStorage
      const localToken = localStorage.getItem('auth_token')
      
      if (localToken) {
        setToken(localToken)
        setStatus('Token trouvé en local. Redirection...')
        
        // Refresh cookies with the local token
        document.cookie = `shared_auth_token=${localToken}; path=/; max-age=${60*60*24*30}`
        document.cookie = 'has_auth_in_ls=true; path=/; max-age=3600'
        
        // Start redirect countdown
        const timer = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) {
              clearInterval(timer)
              
              // DIRECT REDIRECT with token in URL
              const targetUrl = new URL(returnTo, window.location.origin)
              targetUrl.searchParams.set('token', localToken)
              
              console.log('Redirecting to:', targetUrl.toString())
              window.location.href = targetUrl.toString()
            }
            return prev - 1
          })
        }, 1000)
        
        return () => clearInterval(timer)
      } else {
        setStatus('Aucun token d\'authentification trouvé.')
      }
    }
  }, [router, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-500 to-teal-600">
      <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full text-center">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Authentification réussie!</h1>
        {token ? (
          <>
            <p className="text-gray-600 mb-6">
              Vous allez être redirigé vers l'administration dans {countdown} seconde{countdown !== 1 ? 's' : ''}...
            </p>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 transition-all duration-1000"
                style={{ width: `${(3 - countdown) / 3 * 100}%` }}
              />
            </div>
            
            {/* Emergency access button */}
            <div className="mt-4">
              <button
                onClick={() => {
                  const returnTo = searchParams?.get('returnTo') || '/admin'
                  const targetUrl = new URL(returnTo, window.location.origin)
                  targetUrl.searchParams.set('token', token)
                  targetUrl.searchParams.set('bypass', 'true')
                  window.location.href = targetUrl.toString()
                }}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
              >
                Accéder immédiatement
              </button>
            </div>
          </>
        ) : (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-4 text-left">
            <p className="text-yellow-700">
              {status}
            </p>
            <div className="mt-4 flex space-x-4">
              <button
                onClick={() => router.push('/auth-redirect')}
                className="flex-1 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded transition-colors"
              >
                Réessayer
              </button>
              <a 
                href="/admin?bypass=true" 
                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors text-center"
              >
                Accès direct
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
