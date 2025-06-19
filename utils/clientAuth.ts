import Cookies from 'js-cookie';

// Utilitaires d'authentification côté client
// Sans dépendance sur jsonwebtoken

export function getAuthToken(): string | undefined {
  return Cookies.get('shared_auth_token');
}

export function setAuthToken(token: string, expiresInDays = 7): void {
  Cookies.set('shared_auth_token', token, { 
    expires: expiresInDays,
    domain: 'localhost',  // Crucial pour le partage entre localhost:3000 et localhost:3001
    path: '/',            // Assure que le cookie est disponible sur tous les chemins
    sameSite: 'lax'       // Permet l'utilisation du cookie dans les requêtes cross-site
  });
}

export function removeAuthToken(): void {
  Cookies.remove('shared_auth_token');
}

export function isAuthenticated(): boolean {
  return !!getAuthToken();
}

export function redirectToLogin(redirectUrl?: string): void {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
  const redirect = redirectUrl || window.location.href;
  window.location.href = `${baseUrl}/photobooth-ia/admin/login?redirect=${encodeURIComponent(redirect)}`;
}

export function logout(): void {
  removeAuthToken();
  // Rediriger vers la page d'accueil ou de login de l'application maître
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
  window.location.href = `${baseUrl}/photobooth-ia/admin/login`;
}

// Nouvelle fonction pour vérifier le token sans redirection automatique
export function checkAuthTokenValidity(token: string): Promise<boolean> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
  return fetch(`${baseUrl}/api/auth/validate-shared-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token }),
    credentials: 'include',
  })
    .then((response) => response.ok)
    .catch(() => false);
}
