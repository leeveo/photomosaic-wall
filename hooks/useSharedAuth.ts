import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Cookies from 'js-cookie';

export function useSharedAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      try {
        // Vérifier le token dans les cookies
        const token = Cookies.get('shared_auth_token');
        
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
          Cookies.remove('shared_auth_token');
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
    
    checkAuth();
  }, [router]);
  
  return { user, loading };
}
