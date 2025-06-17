import { useState, useEffect } from 'react';
// Remplacer l'import du router
import { useRouter as useNextRouter } from 'next/navigation';
import { getAuthToken, removeAuthToken } from '@/utils/clientAuth';

// Définir le type d'utilisateur
export interface SharedAuthUser {
  id: string;
  email: string;
  name?: string;
  role: string;
}

export function useSharedAuth(): {
  user: SharedAuthUser | null;
  loading: boolean;
} {
  const [user, setUser] = useState<SharedAuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  // Utiliser un gestionnaire côté client uniquement
  const isBrowser = typeof window !== 'undefined';
  const router = isBrowser ? useNextRouter() : null;

  useEffect(() => {
    async function checkAuth() {
      try {
        // Vérifier le token dans les cookies
        const token = getAuthToken();
        
        if (!token) {
          setLoading(false);
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
          return;
        }
        
        const data = await response.json();
        setUser(data.user);
      } catch (error) {
        console.error('Erreur authentification:', error);
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
  
  return { user, loading };
}
