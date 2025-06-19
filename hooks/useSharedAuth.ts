import { useState, useEffect } from 'react';
import { useRouter as useNextRouter } from 'next/navigation';
import { getAuthToken, removeAuthToken, checkAuthTokenValidity } from '@/utils/clientAuth';

// Définir le type d'utilisateur
export interface SharedAuthUser {
  id: string;
  email: string;
  name?: string;
  role: string;
}

export function useSharedAuth(options = { autoRedirect: false }): {
  user: SharedAuthUser | null;
  loading: boolean;
  isAuthorized: boolean;
  checkLocalAuth: () => Promise<boolean>;
} {
  const [user, setUser] = useState<SharedAuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  // Utiliser un gestionnaire côté client uniquement
  const isBrowser = typeof window !== 'undefined';
  const router = isBrowser ? useNextRouter() : null;

  // Ajouter une fonction pour vérifier l'auth localement
  const checkLocalAuth = async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/check-token');
      if (!response.ok) return false;
      
      const data = await response.json();
      if (data.authenticated && data.user) {
        setUser(data.user);
        setIsAuthorized(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erreur vérification locale:', error);
      return false;
    }
  };

  useEffect(() => {
    async function checkAuth() {
      try {
        // Vérifier localement d'abord
        const isLocallyAuth = await checkLocalAuth();
        if (isLocallyAuth) {
          setLoading(false);
          return;
        }
        
        // Si non autorisé localement, continuer avec la vérification existante
        // Vérifier le token dans les cookies
        const token = getAuthToken();
        
        if (!token) {
          setLoading(false);
          return;
        }
        
        // Utiliser la nouvelle fonction de vérification
        const isValid = await checkAuthTokenValidity(token);
        
        if (!isValid) {
          // Token invalide, supprimer le cookie
          removeAuthToken();
          setLoading(false);
          setIsAuthorized(false);
          return;
        }
        
        // Valider le token avec l'API de l'application principale
        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/validate-shared-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
          credentials: 'include' // Important pour les cookies cross-domain
        });
        
        if (!response.ok) {
          // Token invalide, supprimer le cookie
          removeAuthToken();
          setLoading(false);
          setIsAuthorized(false);
          return;
        }
        
        const data = await response.json();
        setUser(data.user);
        setIsAuthorized(true);
      } catch (error) {
        console.error('Erreur authentification:', error);
        setIsAuthorized(false);
      } finally {
        setLoading(false);
      }
    }
    
    // Ne vérifier l'authentification que côté client
    if (isBrowser) {
      checkAuth();
    } else {
      setLoading(false);
    }
  }, [isBrowser]);
  
  return { user, loading, isAuthorized, checkLocalAuth };
}
