'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

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

// Main component with useSearchParams in a Suspense boundary
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
  const [countdown, setCountdown] = useState(3)
  const [token, setToken] = useState<string | null>(null)
  const [status, setStatus] = useState('Traitement de l\'authentification...')

  useEffect(() => {
    // Récupérer le token de l'URL
    const tokenParam = searchParams?.get('token')
    setToken(tokenParam)
    
    if (!tokenParam) {
      setStatus('Aucun token trouvé dans l\'URL. Vérification des alternatives...')
      
      // Vérifier si nous avons un token en localStorage
      const localToken = localStorage.getItem('auth_token')
      if (localToken) {
        setToken(localToken)
        setStatus('Token trouvé en local. Redirection...')
      } else {
        setStatus('Aucun token d\'authentification trouvé.')
        return
      }
    } else {
      setStatus('Token reçu avec succès')
    }
    
    const finalToken = tokenParam || localStorage.getItem('auth_token')
    
    if (finalToken) {
      // Stocker le token dans localStorage pour les futures requêtes
      localStorage.setItem('auth_token', finalToken)
      
      // Définir les cookies pour la compatibilité
      document.cookie = `shared_auth_token=${finalToken}; path=/; max-age=${60*60*24*30}`
      document.cookie = 'has_auth_in_ls=true; path=/; max-age=3600'
      
      // Essayer de partager ce token avec l'application principale aussi
      try {
        if (window.opener) {
          window.opener.postMessage({ type: 'AUTH_TOKEN', token: finalToken }, '*')
        }
      } catch (e) {
        console.error('Erreur lors du partage du token avec l\'application principale:', e)
      }
      
      // Récupérer l'URL de retour
      const returnTo = searchParams?.get('returnTo') || '/admin'
      
      // Démarrer le décompte pour la redirection
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer)
            // Rediriger vers la page demandée avec le token dans l'URL pour s'assurer qu'il soit détecté
            router.push(`${returnTo}${returnTo.includes('?') ? '&' : '?'}token=${finalToken}`)
          }
          return prev - 1
        })
      }, 1000)
      
      return () => clearInterval(timer)
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
          </>
        ) : (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-4 text-left">
            <p className="text-yellow-700">
              {status}
            </p>
            <button
              onClick={() => router.push('/auth-redirect')}
              className="mt-4 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded transition-colors"
            >
              Retour à la page d'authentification
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
