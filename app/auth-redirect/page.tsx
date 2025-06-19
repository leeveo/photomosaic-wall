'use client'

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

// Loading state component
function AuthRedirectLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600">
      <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Vérification d'authentification...</h1>
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
          <p className="text-blue-700">Recherche de session existante...</p>
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
  const [status, setStatus] = useState('Vérification de session...')
  const [countdown, setCountdown] = useState(5)
  const [checkingMainApp, setCheckingMainApp] = useState(true)
  
  const returnTo = searchParams?.get('returnTo') || '/admin'
  const mainAppUrl = process.env.NEXT_PUBLIC_AUTH_LOGIN_URL 
                    ? new URL(process.env.NEXT_PUBLIC_AUTH_LOGIN_URL).origin
                    : 'https://photobooth.waibooth.app'

  // Fonction pour vérifier si l'utilisateur est déjà connecté sur l'app principale
  const checkMainAppSession = async () => {
    try {
      // Créer un iframe caché pour accéder à l'autre domaine
      const iframe = document.createElement('iframe')
      iframe.style.display = 'none'
      iframe.src = `${mainAppUrl}/check-session.html`
      document.body.appendChild(iframe)
      
      // Attendre que l'iframe soit chargé
      await new Promise(resolve => {
        iframe.onload = resolve
        // Timeout au cas où l'iframe ne se charge pas
        setTimeout(resolve, 3000)
      })
      
      // Tenter de recevoir un message de l'iframe
      const messagePromise = new Promise<{token?: string}>(resolve => {
        const handleMessage = (event: MessageEvent) => {
          // Vérifier que le message vient du domaine principal
          if (event.origin === mainAppUrl) {
            window.removeEventListener('message', handleMessage)
            resolve(event.data)
          }
        }
        window.addEventListener('message', handleMessage)
        
        // Envoyer une demande de token à l'iframe
        setTimeout(() => {
          try {
            iframe.contentWindow?.postMessage('GET_TOKEN', mainAppUrl)
          } catch (e) {
            console.error('Erreur lors de la communication avec l\'iframe:', e)
          }
        }, 500)
        
        // Timeout au cas où aucune réponse n'est reçue
        setTimeout(() => resolve({}), 3000)
      })
      
      // Récupérer le token depuis le message de l'iframe
      const { token } = await messagePromise
      
      // Nettoyer l'iframe
      document.body.removeChild(iframe)
      
      return token
    } catch (error) {
      console.error('Erreur lors de la vérification de session:', error)
      return null
    } finally {
      setCheckingMainApp(false)
    }
  }

  useEffect(() => {
    // Vérifier d'abord si nous avons déjà un token en localStorage
    const localToken = localStorage.getItem('auth_token')
    
    if (localToken) {
      setStatus('Session locale trouvée. Redirection...')
      document.cookie = 'has_auth_in_ls=true; path=/; max-age=3600'
      
      // Redirection directe avec le token dans l'URL
      router.push(`${returnTo}${returnTo.includes('?') ? '&' : '?'}token=${localToken}`)
      return
    }
    
    // Vérifier ensuite si l'utilisateur est connecté sur l'app principale
    const checkSession = async () => {
      setStatus('Vérification de la session principale...')
      const token = await checkMainAppSession()
      
      if (token) {
        setStatus('Session trouvée sur l\'application principale. Redirection...')
        localStorage.setItem('auth_token', token)
        document.cookie = 'has_auth_in_ls=true; path=/; max-age=3600'
        
        // Redirection avec le token récupéré
        router.push(`${returnTo}${returnTo.includes('?') ? '&' : '?'}token=${token}`)
        return
      }
      
      // Utilisateur non connecté, lancer le processus de login
      setStatus('Vous devez vous authentifier pour accéder à cette page')
      
      // Démarrer le décompte pour la redirection vers le login
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer)
            // Construction de l'URL de login simplifiée pour éviter les doubles encodages
            const loginBaseUrl = process.env.NEXT_PUBLIC_AUTH_LOGIN_URL || 
                          'https://photobooth.waibooth.app/photobooth-ia/admin/login'
            
            // URL de retour simple et directe
            const returnUrl = `${window.location.origin}/auth-success?returnTo=${encodeURIComponent(returnTo)}`
            const callbackUrl = `${window.location.origin}/api/auth/callback`
            
            // Créer l'URL de login complète
            const loginUrl = `${loginBaseUrl}?returnUrl=${encodeURIComponent(returnUrl)}&callbackUrl=${encodeURIComponent(callbackUrl)}&shared=true`
            
            // Rediriger vers le login
            window.location.href = loginUrl
          }
          return prev - 1
        })
      }, 1000)
      
      return () => clearInterval(timer)
    }
    
    checkSession()
  }, [router, returnTo])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600">
      <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Authentification</h1>
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
          <p className="text-blue-700">{status}</p>
          {!checkingMainApp && countdown > 0 && (
            <p className="text-blue-500 mt-2">
              Redirection automatique dans {countdown} seconde{countdown !== 1 ? 's' : ''}...
            </p>
          )}
          {checkingMainApp && (
            <div className="mt-2">
              <div className="animate-pulse flex space-x-4">
                <div className="flex-1">
                  <div className="h-2 bg-blue-300 rounded"></div>
                </div>
              </div>
            </div>
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
  )
}
